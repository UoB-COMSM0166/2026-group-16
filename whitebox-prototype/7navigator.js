class Navigator {
  handleClick(mx, my) {
    if      (gameState === "START")     this._onStart(mx, my);
    else if (gameState === "CHOOSE")    this._onChoose(mx, my);
    else if (gameState === "CHARACTER") this._onCharacter(mx, my);
    else if (gameState === "PLAY")      this._onPlay(mx, my);
  }

  _onStart(mx, my) {
    if (mx > btnX - btnW/2 && mx < btnX + btnW/2 &&
        my > btnY - btnH/2 && my < btnY + btnH/2) {
      gameState = "CHOOSE";
    }
  }

  _onChoose(mx, my) {
    const backY = 900 - 100, bkW = 150, bkH = 50;
    const bW = 320, bH = bW * 32 / 96, gap = 30;
    const startY = 900/2 + 20 - (bH*3 + gap*2)/2 + bH/2;
    const diffs = ["EASY", "MEDIUM", "HARD"];

    for (let i = 0; i < 3; i++) {
      const cx = 1600/2, cy = startY + i * (bH + gap);
      if (mx > cx - bW/2 && mx < cx + bW/2 &&
          my > cy - bH/2 && my < cy + bH/2) {
        selectedDifficulty = diffs[i];
        gameState = "CHARACTER";
        return;
      }
    }
    if (mx > 1600/2 - bkW/2 && mx < 1600/2 + bkW/2 &&
        my > backY - bkH/2   && my < backY + bkH/2) {
      gameState = "START";
    }
  }

  _onCharacter(mx, my) {
    const cardW = 300, cardH = 400, gap = 80;
    const lx = 1600/2 - cardW - gap/2;
    const rx = 1600/2 + gap/2;
    const backY = 900 - 60, bkW = 150, bkH = 50;

    if (mx > 1600/2 - bkW/2 && mx < 1600/2 + bkW/2 &&
        my > backY - bkH/2   && my < backY + bkH/2) {
      gameState = "CHOOSE";
      return;
    }
    if ((mx > lx - cardW/2 && mx < lx + cardW/2 ||
         mx > rx - cardW/2 && mx < rx + cardW/2) &&
         my > 900/2 - cardH/2 && my < 900/2 + cardH/2) {
      gameState = "PLAY";
      resetGame();
    }
  }

  _onPlay(mx, my) {
    // Back button: top right, under health bar
    if (mx > 1600 - 120 && mx < 1600 - 16 && my > 64 && my < 100) {
      gameState = "CHARACTER";
    }
  }
}