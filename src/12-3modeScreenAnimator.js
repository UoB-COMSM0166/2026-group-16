class ModeScreenAnimator {
  constructor() {
    this.phase = 'IDLE';
    this.startTime = 0;

    // 背景缩放动画参数
    this.bgScale = 1.0;           // 起始缩放
    this.bgTargetScale = 1.05;
    this.bgScaleDuration = 1.0; // 动画持续时间（秒）

    this.buttonFloatEnabled = false;
    this.buttonFloatTime = 0;
    this.buttonFloatOffset = 0;
    this.floatAmplitude = 5;
    this.floatSpeed = 4.0;

    this.S_BTN = { x: 253, y: 639, w: 470, h: 125 };
    this.D_BTN = { x: 876, y: 637, w: 476, h: 127 };
  }

  reset() {
    this.phase = 'IDLE';
    this.startTime = 0;
    this.bgScale = 1.0;
    this.buttonFloatEnabled = false;
    this.buttonFloatOffset = 0;
  }

  startIfIdle() {
    if (this.phase === 'IDLE') {
      this.phase = 'BG_SCALE';
      this.startTime = millis();
    }
  }

  update() {
    this.startIfIdle();

    const now = millis();

    if (this.phase === 'BG_SCALE') {
      const elapsed = (now - this.startTime) / 1000;
      const t = Math.min(elapsed / this.bgScaleDuration, 1.0);

      this.bgScale = this._easeOutBack(t, 1.0, 1.05);

      if (elapsed >= this.bgScaleDuration) {
        this.phase = 'DONE';
        this.buttonFloatEnabled = true;
      }
    }

    if (this.buttonFloatEnabled && !window._modeScreenHovered) {
      this.buttonFloatTime += deltaTime / 1000;
      this.buttonFloatOffset = Math.sin(this.buttonFloatTime * this.floatSpeed) * this.floatAmplitude;
    } else if (window._modeScreenHovered) {
      this.buttonFloatOffset *= 0.9;
    }
  }

  _easeOutBack(t, startVal, endVal) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const val = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    return startVal + (endVal - startVal) * val;
  }

  getBgScale() { return this.bgScale; }
  getButtonFloatOffset() { return this.buttonFloatOffset; }

  getSButtonDrawY() { return this.S_BTN.y + this.buttonFloatOffset; }
  getDButtonDrawY() { return this.D_BTN.y + this.buttonFloatOffset; }
}