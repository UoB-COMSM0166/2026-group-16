# 🎮 Merchant Fighter — UI Flow

> This document describes the screen navigation flow and UI elements for each screen.
> For full element specs, see [`docs/ArtAssetList.md`](./ArtAssetList.md).

---

## Navigation Flow

```mermaid
flowchart TD
    A([🎮 Start Screen]) --> B([⚙️ Difficulty Select])

    B -->|Easy / Medium| C([🗡️ Character Select\nFantasy Route])
    B -->|Hard| D([🏫 Character Select\nModern Route])

    C -->|Select teacher| E([⚔️ Battle Screen\nFantasy])
    D -->|Select teacher| F([⚔️ Battle Screen\nModern])

    E -->|Win / Lose| G([🏆 Victory / Defeat Screen])
    F -->|Win / Lose| G

    G -->|Restart| B
    G -->|Main Menu| A

    style A fill:#2E2E6E,color:#fff,stroke:#fff
    style B fill:#2E2E6E,color:#fff,stroke:#fff
    style C fill:#3A5E8A,color:#fff,stroke:#fff
    style D fill:#5A3E6E,color:#fff,stroke:#fff
    style E fill:#3A5E8A,color:#fff,stroke:#fff
    style F fill:#5A3E6E,color:#fff,stroke:#fff
    style G fill:#2E6E4E,color:#fff,stroke:#fff
```

---

## Screen Details

### Screen 1 — Start Screen

```mermaid
flowchart LR
    subgraph START["🎮 Start Screen — 1920×1080"]
        direction TB
        L[Game Title Logo\n1920×300]
        H[How-to-Play Panel\n600×400]
        K[Key Bindings Panel\n400×300]
        S[▶ Start Button\n240×80]
        M[🔊 BGM Toggle\n48×48]
    end

    S -->|click| DIFF([Difficulty Select])
```

---

### Screen 2 — Difficulty Select

```mermaid
flowchart LR
    subgraph DIFF["⚙️ Difficulty Select — 1920×1080"]
        direction TB
        E[🟢 Easy Button\n280×100]
        MD[🟠 Medium Button\n280×100]
        H[🔴 Hard Button\n280×100]
        BK[← Back Button\n160×60]
        DESC[Difficulty Description\ndynamic text]
    end

    E -->|click| CF([Character Select\nFantasy])
    MD -->|click| CF
    H -->|click| CM([Character Select\nModern])
    BK -->|click| START([Start Screen])
```

---

### Screen 3a — Character Select (Fantasy Route)

```mermaid
flowchart LR
    subgraph CSF["🗡️ Character Select · Fantasy (Carousel) — 1920×1080"]
        direction TB
        
        BG[bg_charselect_fantasy 1920×1080]

        CHAR["Focused Character Display (current_character)"]

        LEFT[◀ Previous Button 120×120]
        RIGHT[Next ▶ Button 120×120]

        BASE["Circle Platform (shared style)"]
        NAME["Character Name Label"]

        BIO["Character Bio Panel 500×200 (dynamic)"]

        OK[✔ Confirm Button 200×70]
        BK[← Back Button 160×60]
    end

    LEFT -->|click| CHAR
    RIGHT -->|click| CHAR

    CHAR -->|update| NAME
    CHAR -->|update| BIO

    OK -->|click| BF([Battle Screen Fantasy])
    BK -->|click| DIFF([Difficulty Select])
```

---

### Screen 3b — Character Select (Modern Route)

```mermaid
flowchart LR
    subgraph CSF["🗡️ Character Select · Modern (Carousel) — 1920×1080"]
        direction TB
        
        BG[bg_charselect_modern 1920×1080]

        CHAR["Focused Character Display (current_character)"]

        LEFT[◀ Previous Button 120×120]
        RIGHT[Next ▶ Button 120×120]

        BASE["Circle Platform (shared style)"]
        NAME["Character Name Label"]

        BIO["Character Bio Panel 500×200 (dynamic)"]

        OK[✔ Confirm Button 200×70]
        BK[← Back Button 160×60]
    end

    LEFT -->|click| CHAR
    RIGHT -->|click| CHAR

    CHAR -->|update| NAME
    CHAR -->|update| BIO

    OK -->|click| BF([Battle Screen Modern])
    BK -->|click| DIFF([Difficulty Select])
```

---

### Screen 4 — Battle Screen

> Same layout for both Fantasy and Modern routes. Visual assets differ per route.

```mermaid
flowchart TB
    subgraph BATTLE["⚔️ Battle Screen — 1920×1080"]
        direction LR

        subgraph LEFT["Player Side"]
            PS[Player Sprite\n128×128+]
            PHP[Player HP Bar\n400×40]
            WS[Weapon / Skill Icons\n64×64 each]
        end

        subgraph MID["Centre"]
            WALL[Centre Wall\n~100×600]
            TIMER[Round Timer\n120×60]
        end

        subgraph RIGHT["Enemy Side"]
            ES[Enemy Teacher Sprite\n128×128+]
            EHP[Enemy HP Bar\n400×40]
        end

        subgraph HUD["HUD Overlay"]
            KEYS[Key Hints]
            MENU[☰ Menu Button\n100×40]
            DLG[Dialogue Box\n550×200]
        end
    end

    MENU -->|click| PAUSE{Pause Menu}
    PAUSE -->|Resume| BATTLE
    PAUSE -->|Restart| BATTLE
    PAUSE -->|Quit| START([Start Screen])

    BATTLE -->|Win / Lose| RESULT([Victory / Defeat Screen])
```

---

### Screen 5 — Victory / Defeat Screen

```mermaid
flowchart LR
    subgraph RESULT["🏆 Victory / Defeat — 1920×1080"]
        direction TB
        BG[bg_victory / bg_defeat\n1920×1080]
        TITLE[text_victory / text_defeat\n800×200]
        POSE[Character Result Pose\n300×400]
        STATS[Battle Stats Panel\n600×300\noptional]
        RST[🔄 Restart Button\n200×70]
        MM[🏠 Main Menu Button\n200×70]
    end

    RST -->|click| DIFF([Difficulty Select])
    MM -->|click| START([Start Screen])
```

---

## Weapon System Flow

```mermaid
flowchart TD
    subgraph EASY["🏹 Easy / Medium — Fantasy"]
        BOW[weapon_bow] --> AN[arrow_normal]
        BOW --> AF[arrow_fire\n+ burn debuff]
        BOW --> AI[arrow_ice\n+ slow debuff]
    end

    subgraph HARD["💻 Hard — Modern · Shared"]
        SC[paper_scroll\narea hit]
        RP[red_pen\nrotating dart]
        EP[error_popup\nfreeze 1.5s]
        CU[cursor\nrapid ×3]
        CZ[Ctrl+Z\nreverse movement]
        CC[Ctrl+C/V\ndouble hit]
    end

    subgraph EXCLUSIVE["🎓 Hard — Teacher Exclusive"]
        TA["Teacher A\ntextbook_normal\ntextbook_charged"]
        TB["Teacher B\nbsod → screen blue 2s\ninfinite_loop → hits ×3"]
    end

    style EASY fill:#3A5E8A,color:#fff,stroke:#fff
    style HARD fill:#5A3E6E,color:#fff,stroke:#fff
    style EXCLUSIVE fill:#7E2E2E,color:#fff,stroke:#fff
```

---

*Last updated: 2026-03-11 | See [`ArtAssetList.md`](./ArtAssetList.md) for full asset specs.*
