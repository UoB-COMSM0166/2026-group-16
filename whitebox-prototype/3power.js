// ─── POWER ────────────────────────────────────────────────────────────────────
class POWER {
  min;
  max;
  chargeRatePerSec;
  decayRatePerSec;
  value;
  isCharging;
  justReleased;
  _wasCharging;
  fireKey;

  constructor({ min = 0, max = 100, chargeRatePerSec = 70, decayRatePerSec = 0, fireKey = 32 } = {}) {
    this.min              = min;
    this.max              = max;
    this.chargeRatePerSec = chargeRatePerSec;
    this.decayRatePerSec  = decayRatePerSec;
    this.value            = min;
    this.isCharging       = false;
    this.justReleased     = false;
    this._wasCharging     = false;
    this.fireKey          = fireKey;
  }
  update(dt) {
    this.justReleased = false;
    this.isCharging   = keyIsDown(this.fireKey)
    if (this.isCharging) {
      this.value = clamp(this.value + this.chargeRatePerSec * dt, this.min, this.max);
    } else if (this.decayRatePerSec > 0) {
      this.value = clamp(this.value - this.decayRatePerSec * dt, this.min, this.max);
    }
    if (this._wasCharging && !this.isCharging) this.justReleased = true;
    this._wasCharging = this.isCharging;
  }
  consume() {
    const out = this.value;
    this.value = this.min;
    return out; }
  
  difficultyAdjustment(maxPower, chargeRate){
    this.max=maxPower;
    this.chargeRatePerSec=chargeRate;
  }
}