# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "matplotlib",
#   "numpy",
#   "scipy",
# ]
# ///
from __future__ import annotations
import base64, csv, json, statistics as st, subprocess, urllib.parse, urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from scipy.stats import mannwhitneyu

ROOT      = Path(__file__).resolve().parents[2]
NASA_CSV  = ROOT / "docs" / "report" / "data" / "nasa_tlx_sus.csv"
FIG_DIR   = ROOT / "docs" / "report" / "figures"
DATA_DIR  = ROOT / "docs" / "report" / "data"
STYLE     = ROOT / "docs" / "report" / "styles" / "tufte.mplstyle"

plt.style.use(str(STYLE))

TLX_SCALES = ["mental", "physical", "temporal", "performance", "effort", "frustration"]
INK   = "#6B6B6B"
BLUE  = "#3B7BB8"
RED   = "#C0392B"
GREEN = "#4A8B5C"


# 1Password helper ------------------------------------------------------------

def op_read(ref: str) -> str:
    return subprocess.check_output(["op", "read", ref], text=True).strip()


# NASA-TLX and SUS ------------------------------------------------------------

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


def _tlx_matrix(rows: list[dict]) -> np.ndarray:
    """Rows × subscales, with Performance inverted."""
    m = np.array([[r[s] for s in TLX_SCALES] for r in rows], dtype=float)
    m[:, 3] = 10 - m[:, 3]
    return m


def _tlx_overall(rows: list[dict]) -> np.ndarray:
    """Per-respondent Raw TLX score (mean of six inverted-where-relevant subscales)."""
    return np.array([
        np.mean([r["mental"], r["physical"], r["temporal"],
                 10 - r["performance"], r["effort"], r["frustration"]])
        for r in rows
    ])


def tlx_figure(groups: dict[str, list[dict]], out: Path) -> None:
    """Side-by-side box plots of NASA-TLX subscales by difficulty."""
    labels = ["Mental", "Physical", "Temporal", "Perf. (inv.)", "Effort", "Frustration"]
    easy = _tlx_matrix(groups["Easy"])
    hard = _tlx_matrix(groups["Hard"])

    x = np.arange(len(labels))
    w = 0.35
    fig, ax = plt.subplots(figsize=(8, 4.2))

    def box(data, positions, colour):
        return ax.boxplot(
            [data[:, i] for i in range(data.shape[1])],
            positions=positions, widths=w * 0.9, patch_artist=True,
            medianprops=dict(color=colour, linewidth=1.2),
            boxprops=dict(facecolor="none", edgecolor=colour),
            whiskerprops=dict(color=colour),
            capprops=dict(color=colour),
            flierprops=dict(marker="o", markersize=3,
                            markeredgecolor=colour, markerfacecolor="none"),
        )

    box(easy, x - w/2, BLUE)
    box(hard, x + w/2, RED)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, ha="right")
    ax.set_ylabel("Rating")
    ax.set_ylim(-0.5, 10.5)
    ax.set_title("NASA-TLX distribution by difficulty")
    ax.legend(handles=[Line2D([], [], color=BLUE, label=f"Easy (n={len(easy)})"),
                       Line2D([], [], color=RED,  label=f"Hard (n={len(hard)})")],
              loc="upper right")

    fig.tight_layout(); fig.savefig(out); plt.close(fig)


def tlx_significance(groups: dict[str, list[dict]]) -> list[tuple]:
    """Mann-Whitney U per subscale + overall Raw TLX. One-sided: H1 = Hard > Easy.
    Returns rows of (label, median_easy, median_hard, U, p)."""
    labels = ["Mental demand", "Physical demand", "Temporal demand",
              "Performance (inv.)", "Effort", "Frustration"]
    rows = []
    for label, key in zip(labels, TLX_SCALES):
        e = np.array([r[key] for r in groups["Easy"]], dtype=float)
        h = np.array([r[key] for r in groups["Hard"]], dtype=float)
        if key == "performance":
            e, h = 10 - e, 10 - h
        u, p = mannwhitneyu(h, e, alternative="greater")
        rows.append((label, float(np.median(e)), float(np.median(h)), float(u), float(p)))

    e_o, h_o = _tlx_overall(groups["Easy"]), _tlx_overall(groups["Hard"])
    u, p = mannwhitneyu(h_o, e_o, alternative="greater")
    rows.append(("Raw TLX (overall)",
                 float(np.median(e_o)), float(np.median(h_o)), float(u), float(p)))

    print("Mann-Whitney U (one-sided: Hard > Easy):")
    for lab, me, mh, uu, pp in rows:
        sig = "*" if pp < 0.05 else " "
        print(f"   {lab:<22} med {me:4.1f} -> {mh:4.1f}   U={uu:5.0f}   p={pp:.3f} {sig}")
    return rows


def write_significance_org(rows: list[tuple], out: Path) -> None:
    """Emit an org-mode table you can #+INCLUDE: into the report."""
    with out.open("w") as f:
        f.write("| Subscale | Median (Easy) | Median (Hard) | U | p |\n")
        f.write("|----------+---------------+---------------+---+---|\n")
        for lab, me, mh, u, p in rows:
            star = "*" if p < 0.05 else ""
            f.write(f"| {lab} | {me:.1f} | {mh:.1f} | {u:.0f} | {p:.3f}{star} |\n")


# Jira ------------------------------------------------------------------------

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

    events = []   # (date, toStatus)
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
    ax.fill_between(xs, cs, ds, alpha=0.15, color=RED, label="Work-in-flight")
    ax.plot(xs, cs, label="Created")             # blue (1st in cycle)
    ax.plot(xs, ds, color=GREEN, label="Done")   # green; skip red to avoid clashing with WIP fill
    ax.set_ylabel("Issue count (cumulative)")
    ax.set_title("Jira issue flow")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    fig.tight_layout(); fig.savefig(fig_out); plt.close(fig)


# Entry -----------------------------------------------------------------------

if __name__ == "__main__":
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("NASA-TLX / SUS")
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

    sig_rows = tlx_significance(groups)
    write_significance_org(sig_rows, DATA_DIR / "tlx_significance.org")

    print("\n Querying Jira...")
    issues, events = jira_pull()
    jira_report(issues, events,
                FIG_DIR / "jira_cumulative.png",
                DATA_DIR / "jira_cumulative.csv")
