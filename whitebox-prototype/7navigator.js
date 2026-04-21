class Navigator {
  handleClick(mx, my) {
    if (gameState === "START") this._onStart(mx, my);
    else if (gameState === "CHOOSE") this._onChoose(mx, my);
    else if (gameState === "MODE") this._onMode(mx, my);
    else if (gameState === "CHARACTER") this._onCharacter(mx, my);
    else if (gameState === "WEAPON_SELECT") this._onWeaponSelect(mx, my);
    else if (gameState === "PLAY") this._onPlay(mx, my);
  }

  _onStart(mx, my) {
    const btn = startAnim.BTN_START;
    const left = btn.x;
    const right = btn.x + btn.w;
    const top = btn.y;
    const bottom = btn.y + btn.h;

    // can only click when animation is done
    if (!startAnim.isDone()) return;

    if (mx > left && mx < right && my > top && my < bottom) {
      gameState = "CHOOSE";
    }
  }

  _onChoose(mx, my) {
    const backY = 900 - 100, bkW = 150, bkH = 50;

    const easyBtn = { x: 471, y: 294, w: 584, h: 105 };
    const medBtn = { x: 470, y: 424, w: 584, h: 105 };
    const hardBtn = { x: 474, y: 550, w: 581, h: 106 };

    const buttons = [
      { rect: easyBtn, diff: "EASY" },
      { rect: medBtn, diff: "MEDIUM" },
      { rect: hardBtn, diff: "HARD" }
    ];

    for (let btn of buttons) {
      const r = btn.rect;
      if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
        selectedDifficulty = btn.diff;
        applyDifficultyAssets();
        modeAnim.reset();
        gameState = "MODE";
        return;
      }
    }

    if (mx > 1600 / 2 - bkW / 2 && mx < 1600 / 2 + bkW / 2 &&
      my > backY - bkH / 2 && my < backY + bkH / 2) {
      gameState = "START";
      if (typeof startAnim !== 'undefined') startAnim.reset();
      if (typeof levelAnim !== 'undefined') levelAnim.reset();
    }
  }

  // ── MODE SCREEN -4.13 add UI ──────────────────────────────────────────────────
  _onMode(mx, my) {
    const sBtn = { x: 253, y: 639, w: 470, h: 125 };
    const dBtn = { x: 876, y: 637, w: 476, h: 127 };

    const clickSingle = (mx > sBtn.x && mx < sBtn.x + sBtn.w &&
      my > sBtn.y && my < sBtn.y + sBtn.h);
    const clickDouble = (mx > dBtn.x && mx < dBtn.x + dBtn.w &&
      my > dBtn.y && my < dBtn.y + dBtn.h);

    if (clickSingle) {
      gameMode = "SINGLE";
      charSelectIndex = 0;
      dogCharSelectIndex = 0;
      gameState = "CHARACTER";
      return;
    }

    if (clickDouble) {
      gameMode = "DUAL";
      charSelectIndex = 0;
      dogCharSelectIndex = 0;
      gameState = "CHARACTER";
      return;
    }

    // back button
    const bkW = 150, bkH = 44, bkX = 1600 / 2 - bkW / 2, bkYY = 840;
    if (mx > bkX && mx < bkX + bkW && my > bkYY && my < bkYY + bkH) {
      gameState = "CHOOSE";
    }
  }

  // ── CHARACTER SCREEN ─────────────────────────────────────────────
  // In DUAL mode this screen is used twice: first P1 picks, then P2 picks.
  // We track which player is picking via _charTurn (0 = P1, 1 = P2).
  //Grace3.30__character select screen has 4 interactive elements: left arrow, right arrow, confirm button, back button
  _onCharacter(mx, my) {
    const isDual = (gameMode === "DUAL");
    const isP2Turn = isDual && _charTurn === 1;

    // left arrow (716, 402, 135, 134)
    if (mx > 716 && mx < 716 + 135 && my > 402 && my < 402 + 134) {
      if (isP2Turn) {
        dogCharSelectIndex = (dogCharSelectIndex + 3) % 4;
        if (dogCharSelectIndex === charSelectIndex) dogCharSelectIndex = (dogCharSelectIndex + 3) % 4;
      } else {
        charSelectIndex = (charSelectIndex + 3) % 4;
      }
      isSquashing = true;
      squashTime = 0;
      return;
    }
    // right arrow (1422, 402, 135, 134)
    if (mx > 1422 && mx < 1422 + 135 && my > 402 && my < 402 + 134) {
      if (isP2Turn) {
        dogCharSelectIndex = (dogCharSelectIndex + 1) % 4;
        if (dogCharSelectIndex === charSelectIndex) dogCharSelectIndex = (dogCharSelectIndex + 1) % 4;
      } else {
        charSelectIndex = (charSelectIndex + 1) % 4;
      }
      isSquashing = true;
      squashTime = 0;
      return;
    }
    // Confirm (1015, 506, 262, 97)
    if (mx > 1015 && mx < 1015 + 262 && my > 506 && my < 506 + 97) {
      // Block if P2 is trying to pick same character as P1
      if (isP2Turn && dogCharSelectIndex === charSelectIndex) return;
      if (isDual && _charTurn === 0) {
        // P1 confirmed — set P2 starting index to next available character
        _charTurn = 1;
        dogCharSelectIndex = (charSelectIndex + 1) % 4;
      } else {
        // P2 confirmed (or single player) — go to weapon select
        _charTurn = 0;
        applyCharacterLabels(); // update player names before weapon screen
        gameState = "WEAPON_SELECT";
      }
      return;
    }
    // Back (725, 820, 150, 50)
    const btnWb = 150, btnHb = 50;
    const bkX = 1600 / 2 - btnWb / 2;
    const bkY = 820;
    if (mx > bkX && mx < bkX + btnWb && my > bkY && my < bkY + btnHb) {
      if (isDual && _charTurn === 1) {
        _charTurn = 0; // go back to P1 pick
      } else {
        _charTurn = 0;
        gameState = "MODE";
      }
      return;
    }
  }

  // ── WEAPON SELECT SCREEN ─────────────────────────────────────────
  _onWeaponSelect(mx, my) {
    const isDual = (gameMode === "DUAL");
    const panels = isDual ? 2 : 1;
    const panelW = 1600 / panels;
    const COLS = 5, CELL = 78, GAP = 12;
    const GRID_W = COLS * CELL + (COLS - 1) * GAP;
    const gridY = 165;

    // Weapon cell hit-test — fires once per click via mousePressed
    for (let panelIdx = 0; panelIdx < panels; panelIdx++) {
      const weaponsObj = (panelIdx === 0) ? playerWeapons : dogWeapons;
      const panelCX = panelW * panelIdx + panelW / 2;
      const gridX = panelCX - GRID_W / 2;

      for (let i = 0; i < WEAPON_DEFS.length; i++) {
        const col = i % COLS, row = Math.floor(i / COLS);
        const wx = gridX + col * (CELL + GAP);
        const wy = gridY + row * (CELL + GAP);
        if (mx > wx && mx < wx + CELL && my > wy && my < wy + CELL) {
          weaponsObj.index = i;
          return;
        }
      }
    }

    // Confirm button (centred, y = 760)
    const cfW = 260, cfH = 52, cfX = 1600 / 2 - cfW / 2, cfY = 760;
    if (mx > cfX && mx < cfX + cfW && my > cfY && my < cfY + cfH) {
      gameState = "PLAY";
      resetGame();
      return;
    }

    // Back button
    const bkW = 150, bkH = 40;
    const bkX = 1600 / 2 - bkW / 2, bkYY = cfY + cfH + 16;
    if (mx > bkX && mx < bkX + bkW && my > bkYY && my < bkYY + bkH) {
      _charTurn = (gameMode === "DUAL") ? 1 : 0;
      gameState = "CHARACTER";
      return;
    }
  }

  _onPlay(mx, my) {
    // BACK button — bottom centre (always works)
    const bkX = 1600 / 2 - 75, bkY = 860, bkW2 = 150, bkH2 = 34;
    if (mx > bkX && mx < bkX + bkW2 && my > bkY && my < bkY + bkH2) {
      gameState = "CHARACTER";
      return;
    }

    // Game-over overlay buttons
    const gameOver = catHP <= 0 || dogHP <= 0 || (gameTimer <= 0 && catHP !== dogHP);
    if (gameOver) {
      const py = 900 / 2 - 60, ps = 200;
      const paW = 240, paH = 56, paX = 1600 / 2 - paW / 2, paY = py + ps / 2 + 145;
      const bmW = 200, bmH = 44, bmX = 1600 / 2 - bmW / 2, bmY = paY + paH + 16;

      // Play Again
      if (mx > paX && mx < paX + paW && my > paY && my < paY + paH) {
        resetGame();
        return;
      }
      // Back to Menu
      if (mx > bmX && mx < bmX + bmW && my > bmY && my < bmY + bmH) {
        gameState = "CHARACTER";
        return;
      }
    }
  }
}

// ── _charTurn tracks which player is currently picking character ──
// 0 = P1, 1 = P2 (only relevant in DUAL mode)
let _charTurn = 0;