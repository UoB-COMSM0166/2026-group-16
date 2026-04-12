class Navigator {
  handleClick(mx, my) {
    if (gameState === "START") this._onStart(mx, my);
    else if (gameState === "CHOOSE") this._onChoose(mx, my);
    else if (gameState === "CHARACTER") this._onCharacter(mx, my);
    else if (gameState === "PLAY") this._onPlay(mx, my);
  }

  _onStart(mx, my) {
    if (mx > btnX - btnW / 2 && mx < btnX + btnW / 2 &&
      my > btnY - btnH / 2 && my < btnY + btnH / 2) {
      gameState = "CHOOSE";
    }
  }

  _onChoose(mx, my) {
    const backY = 900 - 100, bkW = 150, bkH = 50;
    const bW = 320, bH = bW * 32 / 96, gap = 30;
    const startY = 900 / 2 + 20 - (bH * 3 + gap * 2) / 2 + bH / 2;
    const diffs = ["EASY", "MEDIUM", "HARD"];

    for (let i = 0; i < 3; i++) {
      const cx = 1600 / 2, cy = startY + i * (bH + gap);
      if (mx > cx - bW / 2 && mx < cx + bW / 2 &&
        my > cy - bH / 2 && my < cy + bH / 2) {
        selectedDifficulty = diffs[i];
        applyDifficultyAssets(); // swap images immediately for character screen
        gameState = "CHARACTER";
        return;
      }
    }
    if (mx > 1600 / 2 - bkW / 2 && mx < 1600 / 2 + bkW / 2 &&
      my > backY - bkH / 2 && my < backY + bkH / 2) {
      gameState = "START";
    }
  }

  //Grace3.30__character select screen has 4 interactive elements: left arrow, right arrow, confirm button, back button
  _onCharacter(mx, my) {
    // left arrow (716, 402, 135, 134)
    if (mx > 716 && mx < 716 + 135 && my > 402 && my < 402 + 134) {
      charSelectIndex = (charSelectIndex + 3) % 4;
      isSquashing = true;
      squashTime = 0;
      return;
    }
    // right arrow (1422, 402, 135, 134)
    if (mx > 1422 && mx < 1422 + 135 && my > 402 && my < 402 + 134) {
      charSelectIndex = (charSelectIndex + 1) % 4;
      isSquashing = true;
      squashTime = 0;
      return;
    }
    // Confirm (1015, 506, 262, 97)
    if (mx > 1015 && mx < 1015 + 262 && my > 506 && my < 506 + 97) {
      gameState = "PLAY";
      resetGame();
      return;
    }
    // Back (725, 820, 150, 50)
    const btnW = 150, btnH = 50;
    const bkX = 1600 / 2 - btnW / 2;
    const bkY = 820;
    if (mx > bkX && mx < bkX + btnW && my > bkY && my < bkY + btnH) {
      gameState = "CHOOSE";
      charSelectIndex = 0;
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