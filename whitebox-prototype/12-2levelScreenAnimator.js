// levelScreenAnimator.js
// 管理难度选择界面的动画序列：背景上下缓慢浮动 + 按钮渐显

class LevelScreenAnimator {
  constructor() {
    this.phase = 'IDLE';
    this.startTime = 0;

    // 背景浮动参数
    this.bgOffsetY = 0;
    this.floatAmplitude = 30;      // 浮动幅度（像素）
    this.floatSpeed = 0.4;         // 弧度/秒

    // 按钮渐显参数
    this.buttonAlpha = 0;
    this.buttonsFadeDuration = 1.2;

    // 屏幕尺寸
    this.SCREEN_W = 1600;
    this.SCREEN_H = 900;
    this.BG_H = 1202;              // ← 改成新图的高度

    // 最大偏移量（让背景能完整覆盖屏幕）
    this.MAX_BG_OFFSET = -(this.BG_H - this.SCREEN_H); // 结果 = -302
  }

  reset() {
    this.phase = 'IDLE';
    this.startTime = 0;
    this.bgOffsetY = 0;
    this.buttonAlpha = 0;
  }

  // 每次进入难度选择界面时调用（可自动触发）
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

    // 背景浮动：使用正弦波循环移动
    const sinVal = Math.sin(elapsed * this.floatSpeed);
    this.bgOffsetY = this.MAX_BG_OFFSET + (this.floatAmplitude * sinVal);

    // 按钮渐显：从 0 到 1，完成后保持
    const t = Math.min(elapsed / this.buttonsFadeDuration, 1.0);
    this.buttonAlpha = this._easeOutCubic(t);
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  getBgOffsetY() { return this.bgOffsetY; }
  getButtonAlpha() { return this.buttonAlpha; }
}