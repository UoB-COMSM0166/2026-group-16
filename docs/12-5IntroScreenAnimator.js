class IntroScreenAnimator {
  constructor() {
    this.floatEnabled = true;
    this.floatTime = 0;
    this.floatOffset = 0;
    this.floatAmplitude = 6;
    this.floatSpeed = 5.0;
    this.hovered = false;
  }

  setHovered(h) { this.hovered = h; }

  update() {
    if (this.floatEnabled && !this.hovered) {
      this.floatTime += deltaTime / 1000;
      this.floatOffset = Math.sin(this.floatTime * this.floatSpeed) * this.floatAmplitude;
    } else if (this.hovered) {
      this.floatOffset *= 0.9;
    }
  }

  getFloatOffset() { return this.floatOffset; }
}