class LevelScreenAnimator {
  constructor() {
    this.phase = 'IDLE';
    this.startTime = 0;

    this.bgOffsetY = 0;
    this.floatAmplitude = 30;
    this.floatSpeed = 0.4;

    this.buttonAlpha = 0;
    this.buttonsFadeDuration = 1.2;

    this.SCREEN_W = 1600;
    this.SCREEN_H = 900;
    this.BG_H = 1202;

    this.MAX_BG_OFFSET = -(this.BG_H - this.SCREEN_H); // 结果 = -302
  }

  reset() {
    this.phase = 'IDLE';
    this.startTime = 0;
    this.bgOffsetY = 0;
    this.buttonAlpha = 0;
  }

  startIfIdle() {
    if (this.phase === 'IDLE') {
      this.phase = 'ANIMATING';
      this.startTime = millis();
    }
  }

  update() {
    this.startIfIdle();

    if (this.phase !== 'ANIMATING') return;

    const now = millis();
    const elapsed = (now - this.startTime) / 1000;

    const sinVal = Math.sin(elapsed * this.floatSpeed);
    this.bgOffsetY = this.MAX_BG_OFFSET + (this.floatAmplitude * sinVal);

    const t = Math.min(elapsed / this.buttonsFadeDuration, 1.0);
    this.buttonAlpha = this._easeOutCubic(t);
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  getBgOffsetY() { return this.bgOffsetY; }
  getButtonAlpha() { return this.buttonAlpha; }
}