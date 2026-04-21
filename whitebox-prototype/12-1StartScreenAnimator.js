class StartScreenAnimator {
  constructor() {
    this.phase = 'IDLE';
    this.startTime = 0;
    this.globalStartTime = 0;

    this.buttonFloatEnabled = false;
    this.buttonFloatTime = 0;
    this.buttonFloatOffset = 0;
    this.buttonHovered = false;

    this.durations = {
      bgFade: 0,
      bgMove: 2.5,
      titleFade: 0.9,
      buttonsFade: 0.5,
    };

    this.titleYOffset = 0;
    this.bgAlpha = 0;
    this.bgOffsetY = 0;
    this.titleAlpha = 0;
    this.buttonAlpha = 0;

    this.SCREEN_W = 1600;
    this.SCREEN_H = 900;
    this.BG_H = 2848;

    this.MAX_BG_OFFSET = -(this.BG_H - this.SCREEN_H);

    this.TITLE = { x: 294, y: 153, w: 1061, h: 380 };
    this.BTN_START = { x: 659, y: 558, w: 279, h: 101 };
    this.BTN_INTRO = { x: 283, y: 723, w: 1035, h: 96 };

    this.imgBg = null;
    this.imgTitle = null;
    this.imgBtnStart = null;
    this.imgBtnIntro = null;

    this.buttonsFadeStartTime = 0;
  }

  setImages(bg, title, btnStart, btnIntro) {
    this.imgBg = bg;
    this.imgTitle = title;
    this.imgBtnStart = btnStart;
    this.imgBtnIntro = btnIntro;
  }

  reset() {
    this.phase = 'IDLE';
    this.startTime = 0;
    this.globalStartTime = 0;
    this.bgAlpha = 0;
    this.bgOffsetY = this.MAX_BG_OFFSET;
    this.titleAlpha = 0;
    this.buttonAlpha = 0;
    this.buttonsFadeStartTime = 0;
    this.titleYOffset = -150;
    this.buttonFloatEnabled = false;
    this.buttonFloatTime = 0;
    this.buttonFloatOffset = 0;
    this.buttonHovered = false;
  }

  _startIfIdle() {
    if (this.phase === 'IDLE') {
      this.phase = 'BG_FADE';
      this.globalStartTime = millis();
      this.startTime = millis();
    }
  }

  setButtonHovered(hovered) {
    this.buttonHovered = hovered;
  }

  getButtonFloatOffset() { return this.buttonFloatOffset; }

  update() {
    this._startIfIdle();

    const now = millis();
    const elapsed = (now - this.startTime) / 1000;

    switch (this.phase) {
      case 'BG_FADE':
        this._updateBgFade(elapsed);
        break;
      case 'BG_MOVE':
        this._updateBgMove(elapsed);
        break;
      case 'TITLE':
        this._updateTitleFade(elapsed);
        break;
      case 'BUTTONS_FADE':
        this._updateButtonsFade(elapsed);
        break;
      case 'DONE':
        break;
    }
    if (this.phase === 'DONE') {
      this.buttonFloatEnabled = true;
    }

    if (this.buttonFloatEnabled && !this.buttonHovered) {
      const time = millis() / 1000;
      this.buttonFloatOffset = Math.sin(time * 5.0) * 6;  // 频率5.0，幅度6像素
    } else if (this.buttonHovered) {
      this.buttonFloatOffset *= 0.9;
    }
  }

  _updateBgFade(elapsed) {
    const dur = this.durations.bgFade;
    const t = Math.min(elapsed / dur, 1.0);
    this.bgAlpha = this._easeOutCubic(t);

    if (elapsed >= dur) {
      this.phase = 'BG_MOVE';
      this.startTime = millis();
    }
  }

  _updateBgMove(elapsed) {
    const dur = this.durations.bgMove;
    const t = Math.min(elapsed / dur, 1.0);
    const eased = this._easeInOutCubic(t);
    this.bgOffsetY = this.MAX_BG_OFFSET * (1 - eased);

    if (elapsed >= dur) {
      this.phase = 'TITLE';
      this.startTime = millis();
    }
  }

  _updateTitleFade(elapsed) {
    const dur = this.durations.titleFade;
    const t = Math.min(elapsed / dur, 1.0);
    this.titleAlpha = this._easeOutCubic(t);
    this.titleYOffset = this._elasticOut(t, -150, 0);

    if (elapsed >= dur) {
      this.phase = 'BUTTONS_FADE';
      this.buttonsFadeStartTime = millis() + 100;
      this.startTime = millis();
    }
  }

  getTitleYOffset() { return this.titleYOffset; }

  _updateButtonsFade(elapsed) {
    const now = millis();
    if (now < this.buttonsFadeStartTime) {
      this.buttonAlpha = 0;
      return;
    }

    const fadeElapsed = (now - this.buttonsFadeStartTime) / 1000;
    const dur = this.durations.buttonsFade;
    const t = Math.min(fadeElapsed / dur, 1.0);
    this.buttonAlpha = this._easeOutCubic(t);

    if (fadeElapsed >= dur) {
      this.phase = 'DONE';
    }
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  _easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  _elasticOut(t, startVal, endVal) {
    if (t === 0) return startVal;
    if (t === 1) return endVal;
    const p = 0.3;
    const s = p / 4;
    const val = Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    return startVal + (endVal - startVal) * val;
  }

  isDone() {
    return this.phase === 'DONE';
  }

  // ---- Getter -----
  getBgAlpha() { return this.bgAlpha; }
  getBgOffsetY() { return this.bgOffsetY; }
  getTitleAlpha() { return this.titleAlpha; }
  getButtonAlpha() { return this.buttonAlpha; }
}