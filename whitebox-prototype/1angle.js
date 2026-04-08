// ------------ ANGLE --------------------------------------------
class ANGLE {
  direction;
  angleDeg;
  minDeg;
  maxDeg;
  stepDeg;
  upKey;
  downKey;

  constructor({ direction = 1, angleDeg = 45, minDeg = 0, maxDeg = 80, stepDeg = 1, upKey = UP_ARROW, downKey = DOWN_ARROW } = {}) {
    this.direction = direction;
    this.angleDeg  = angleDeg;
    this.minDeg    = minDeg;
    this.maxDeg    = maxDeg;
    this.stepDeg   = stepDeg;
    this.upKey     = upKey;
    this.downKey   = downKey;
  }
  setDirection(dir) {
    if (dir >= 0) {
      this.direction = 1;
    } else {
      this.direction = -1;
    }
  }
  update() {
    if (keyIsDown(this.upKey)) {
      this.angleDeg += this.stepDeg;
    } else if (keyIsDown(this.downKey)) {
      this.angleDeg -= this.stepDeg;
    }
    this.angleDeg = clamp(this.angleDeg, this.minDeg, this.maxDeg);
  }
  get angleRad() {
    const base = (this.angleDeg * Math.PI) / 180;
    return this.direction === 1 ? base : Math.PI - base;
  }
}