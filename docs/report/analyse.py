from __future__ import annotations
import base64, csv, json, statistics as st, subprocess, urllib.parse, urllib.request
from collections import Counter
from pathlib import Path

ROOT      = Path(__file__).resolve().parents[2]
NASA_CSV  = ROOT / "docs" / "report" / "data" / "nasa_tlx_sus.csv"
FIG_DIR   = ROOT / "docs" / "report" / "figures"
DATA_DIR  = ROOT / "docs" / "report" / "data"

TLX_SCALES = ["mental", "physical", "temporal", "performance", "effort", "frustration"]

# 1Password helper

def op_read(ref: str) -> str:
    return subprocess.check_output(["op", "read", ref], text=True).strip()

# NASA-TLX and SUS

def load_nasa(path: Path) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {"Easy": [], "Hard": []}
    for r in csv.DictReader(path.open()):
        for k in TLX_SCALES: r[k] = float(r[k])
        r["sus"] = float(r["sus"])
        groups.setdefault(r["difficulty"], []).append(r)
    return groups

def summarise(rows: list[dict]) -> dict:
    means = {s: st.mean(r[s] for r in rows) for s in TLX_SCALES}
    raw_tlx = st.mean(
        st.mean([r["mental"], r["physical"], r["temporal"],
                 10 - r["performance"], r["effort"], r["frustration"]])
        for r in rows)
    sus = [r["sus"] for r in rows]
    return {"n": len(rows), "means": means, "raw_tlx": raw_tlx,
            "tlx_100": raw_tlx * 10,
            "sus_mean": st.mean(sus), "sus_median": st.median(sus),
            "sus_min": min(sus), "sus_max": max(sus)}

def tlx_figure(groups: dict[str, list[dict]], out: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    labels = ["Mental", "Physical", "Temporal", "Perf. (inv.)", "Effort", "Frustration"]
    def means(rows):
        m = [st.mean(r[s] for r in rows) for s in TLX_SCALES]
        m[3] = 10 - m[3]                         # invert Performance
        return m
    x, w = np.arange(len(labels)), 0.38
    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.bar(x - w/2, means(groups["Easy"]), w, label=f"Easy (n={len(groups['Easy'])})", color="#4C72B0")
    ax.bar(x + w/2, means(groups["Hard"]), w, label=f"Hard (n={len(groups['Hard'])})", color="#C44E52")
    ax.set_xticks(x); ax.set_xticklabels(labels, rotation=20, ha="right")
    ax.set_ylabel("Rating"); ax.set_ylim(0, 10)
    ax.set_title("Average NASA-TLX by Difficulty")
    ax.legend(loc="upper right"); ax.grid(axis="y", alpha=0.3)
    fig.tight_layout(); fig.savefig(out, dpi=150); plt.close(fig)

# Jira

JIRA_BASE = "https://tangiprapulla.atlassian.net"

def jira_get(path: str, auth: str, **params) -> dict:
    url = f"{JIRA_BASE}{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url,
        headers={"Authorization": f"Basic {auth}", "Accept": "application/json"})
    return json.load(urllib.request.urlopen(req))

def jira_pull() -> tuple[list, list]:
    email = op_read("op://Developer/COMSM1066_listener/username")
    token = op_read("op://Developer/COMSM1066_listener/credential")
    auth  = base64.b64encode(f"{email}:{token}".encode()).decode()

    issues, nxt = [], None
    while True:
        params = {"jql": "project = SE ORDER BY created ASC",
                  "fields": "created,status,assignee,issuetype", "maxResults": 100}
        if nxt: params["nextPageToken"] = nxt
        r = jira_get("/rest/api/3/search/jql", auth, **params)
        issues.extend(r["issues"])
        if r.get("isLast", True) or not r.get("nextPageToken"): break
        nxt = r["nextPageToken"]

    events = []    # (date, toStatus)
    for i in issues:
        cl = jira_get(f"/rest/api/3/issue/{i['key']}/changelog", auth, maxResults=100)
        for h in cl.get("values", []):
            for it in h.get("items", []):
                if it.get("field") == "status":
                    events.append((h["created"][:10], it["toString"]))
    return issues, events

def jira_report(issues, events, fig_out: Path, csv_out: Path) -> None:
    statuses  = Counter(i["fields"]["status"]["name"] for i in issues)
    months    = Counter(i["fields"]["created"][:7] for i in issues)
    assignees = Counter((i["fields"]["assignee"] or {}).get("displayName", "Unassigned") for i in issues)
    transitions = len(events)

    print(f"   Total issues       : {len(issues)}")
    print(f"   Done               : {statuses['Done']}")
    print(f"   To Do              : {statuses['To Do']}")
    print(f"   In Progress        : {statuses.get('In Progress', 0)}")
    print(f"   Status transitions : {transitions}")
    print(f"   Completion rate    : {statuses['Done']/len(issues):.1%}")
    print("   Creation by month:")
    for m, n in sorted(months.items()): print(f"     {m}  {n:>3}")
    print("   Assignee distribution:")
    for name, n in assignees.most_common(): print(f"     {name:<22} {n:>3}")

    # cumulative flow figure and table
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from datetime import datetime
    created_by = Counter(i["fields"]["created"][:10] for i in issues)
    done_by    = Counter(d for d, s in events if s == "Done")
    days       = sorted(set(list(created_by) + list(done_by)))
    cc, cd, xs, cs, ds = 0, 0, [], [], []
    with csv_out.open("w", newline="") as f:
        w = csv.writer(f); w.writerow(["date", "created_cum", "done_cum"])
        for d in days:
            cc += created_by[d]; cd += done_by[d]
            w.writerow([d, cc, cd])
            xs.append(datetime.strptime(d, "%Y-%m-%d")); cs.append(cc); ds.append(cd)
    fig, ax = plt.subplots(figsize=(9, 4.2))
    ax.fill_between(xs, cs, ds, alpha=0.18, color="#C44E52", label="Work-in-flight")
    ax.plot(xs, cs, color="#4C72B0", lw=2, label=f"Created")
    ax.plot(xs, ds, color="#55A868", lw=2, label=f"Done")
    ax.set_ylabel("Issue count (cumulative)")
    ax.set_title("Jira Issue Flow")
    ax.grid(alpha=0.3); ax.legend(loc="upper left")
    fig.autofmt_xdate(); fig.tight_layout(); fig.savefig(fig_out, dpi=150); plt.close(fig)

# Entry

if __name__ == "__main__":
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("== NASA-TLX / SUS ==")
    groups = load_nasa(NASA_CSV)
    for label, rows in groups.items():
        s = summarise(rows)
        print(f"-- {label}  (n={s['n']}) --")
        for k, v in s["means"].items(): print(f"   {k:<12} {v:4.2f}")
        print(f"   Raw TLX 0-10  : {s['raw_tlx']:4.2f}")
        print(f"   Rescaled 0-100: {s['tlx_100']:4.1f}")
        print(f"   SUS mean/med  : {s['sus_mean']:.1f} / {s['sus_median']:.1f}")
        print(f"   SUS min /max  : {s['sus_min']:.1f} / {s['sus_max']:.1f}")
    tlx_figure(groups, FIG_DIR / "tlx_bars.png")

    print("\n== Jira (live) ==")
    issues, events = jira_pull()
    jira_report(issues, events,
                FIG_DIR / "jira_cumulative.png",
                DATA_DIR / "jira_cumulative.csv")
