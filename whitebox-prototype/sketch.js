// 背景=bg.jpg（希腊沉船湾） // 玩家=player.png（猫） 目标=target.png（狗） 弹体=pan.png（平底锅）
// 操作：A/D 或 ←/→ 移动；↑↓调角度；按住空格蓄力，松开发射
const LABELS = {
  player: "Rish",
  target: "Ciyang",
};
const LABEL_STYLE = {
  fontSize: 22,
  paddingX: 10,
  paddingY: 6,
  offsetY: 14,
  radius: 10,
  textColor: [255, 255, 255],
  boxFill: [0, 120, 255, 210],
  boxStroke: [255, 255, 255, 230],
  boxStrokeWeight: 2,
};

function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

const sign  = (v) => (v < 0 ? -1 : 1);
function vec2(x = 0, y = 0) { return { x, y }; }
function vecLen(a) { return Math.hypot(a.x, a.y); }
function vecNorm(a) { const l = vecLen(a) || 1; return { x: a.x / l, y: a.y / l }; }

// ─── ANGLE ────────────────────────────────────────────────────────────────────
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
    } else {
      if (keyIsDown(this.downKey)) {
        this.angleDeg -= this.stepDeg;
      }
    }
    this.angleDeg = clamp(this.angleDeg, this.minDeg, this.maxDeg);
  }
  get angleRad() {
    const base = (this.angleDeg * Math.PI) / 180;
    return this.direction === 1 ? base : Math.PI - base;
  }
}

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
}

// ─── COLLISION DETECTION ──────────────────────────────────────────────────────
class CollisionDetection {
  constructor({ worldWidth = 1600, worldHeight = 900, cellSize = 128, gravity = 900, windAccel = 50 } = {}) {
    this.worldWidth   = worldWidth;
    this.worldHeight  = worldHeight;
    this.cellSize     = cellSize;
    this.cols         = Math.ceil(worldWidth  / cellSize);
    this.rows         = Math.ceil(worldHeight / cellSize);
    this.gravity      = gravity;
    this.windAccel    = windAccel;
    this.staticBodies = [];
    this.characters   = [];
    this.projectiles  = [];
    this.floatTexts   = [];
    this._grid        = new Map();
    this._nextId      = 1;
  }

  _cellKey(cx, cy) {
    return `${cx},${cy}`;
  }

  _getCellRangeForAABB(aabb) {
    const minCx = clamp(Math.floor(aabb.x / this.cellSize), 0, this.cols - 1);
    const maxCx = clamp(Math.floor((aabb.x + aabb.w) / this.cellSize), 0, this.cols - 1);
    const minCy = clamp(Math.floor(aabb.y / this.cellSize), 0, this.rows - 1);
    const maxCy = clamp(Math.floor((aabb.y + aabb.h) / this.cellSize), 0, this.rows - 1);
    return { minCx, maxCx, minCy, maxCy };
  }

  _insertToGrid(body) {
    const { minCx, maxCx, minCy, maxCy } = this._getCellRangeForAABB(body);
    body._cells = [];
    for (let cy = minCy; cy <= maxCy; cy++)
      for (let cx = minCx; cx <= maxCx; cx++) {
        const k = this._cellKey(cx, cy);
        if (!this._grid.has(k)) this._grid.set(k, new Set());
        this._grid.get(k).add(body.id);
        body._cells.push(k);
      }
  }

  _queryNearbyAABB(aabb) {
    const { minCx, maxCx, minCy, maxCy } = this._getCellRangeForAABB(aabb);
    const ids = new Set();
    for (let cy = minCy; cy <= maxCy; cy++)
      for (let cx = minCx; cx <= maxCx; cx++) {
        const set = this._grid.get(this._cellKey(cx, cy));
        if (set) for (const id of set) ids.add(id);
      }
    return ids;
  }

  addStaticRect({ x, y, w, h, tag = "wall" }) {
    const body = { id: this._nextId++, type: "static", tag, x, y, w, h };
    this.staticBodies.push(body);
    this._insertToGrid(body);
    return body;
  }

  addCharacter({ x, y, w = 60, h = 60, speed = 280, tag = "player", leftKey = LEFT_ARROW, rightKey = RIGHT_ARROW}) {
    const ch = {
      id: this._nextId++, type: "character", tag,
      x, y, w, h, vx: 0, vy: 0, speed,
      onGround: false, facing: 1,
      controllable: tag === "player",
      leftKey,
      rightKey
    };
    this.characters.push(ch);
    return ch;
  }

  spawnProjectile({ fromX, fromY, radius = 12, angleObj, powerObj, powerScale = 8, owner = "player" }) {
    const power = powerObj.consume();
    const speed = power * powerScale;
    const a     = angleObj.angleRad;
    const p = {
      id: this._nextId++, type: "projectile",
      x: fromX, y: fromY, r: radius,
      vx:  Math.cos(a) * speed,
      vy: -Math.sin(a) * speed,
      alive: true,
      owner,
    };
    this.projectiles.push(p);
    return p;
  }

  static aabbIntersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  static circleAABBHit(circle, rect) {
    const cx = clamp(circle.x, rect.x, rect.x + rect.w);
    const cy = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - cx, dy = circle.y - cy;
    if (dx * dx + dy * dy > circle.r * circle.r) return null;
    const eps = 1e-6;
    const normal = (Math.abs(dx) > eps || Math.abs(dy) > eps)
      ? vecNorm({ x: dx, y: dy }) : vec2(0, -1);
    return { point: { x: cx, y: cy }, normal };
  }

  static resolveAABBvsAABB(dynamic, stat) {
    const ox1 = (dynamic.x + dynamic.w) - stat.x;
    const ox2 = (stat.x + stat.w)       - dynamic.x;
    const oy1 = (dynamic.y + dynamic.h) - stat.y;
    const oy2 = (stat.y + stat.h)       - dynamic.y;
    const penX = Math.min(ox1, ox2);
    const penY = Math.min(oy1, oy2);
    if (penX < penY) {
      dynamic.x += ox1 < ox2 ? -penX : penX;
      dynamic.vx = 0;
    } else {
      if (oy1 < oy2) { dynamic.y -= penY; dynamic.vy = 0; dynamic.onGround = true; }
      else            { dynamic.y += penY; dynamic.vy = 0; }
    }
  }
  _updateCharacter(ch, dt, angleObj) {
    if (ch.controllable) {
      const left  = keyIsDown(ch.leftKey);
      const right = keyIsDown(ch.rightKey);
      ch.vx = left ? -ch.speed : right ? ch.speed : 0;
      ch.vy = 0;
      if (ch.vx !== 0) {
        ch.facing = sign(ch.vx);
        angleObj.setDirection(ch.facing);
      }
    } else {
      ch.vx = 0; ch.vy = 0;
    }
    ch.x = clamp(ch.x + ch.vx * dt, 0, this.worldWidth - ch.w);
    const box = { x: ch.x, y: ch.y, w: ch.w, h: ch.h };
    for (const id of this._queryNearbyAABB(box)) {
      const stat = this.staticBodies.find(b => b.id === id);
      if (!stat) continue;
      if (CollisionDetection.aabbIntersects(box, stat)) {
        const ox1 = (ch.x + ch.w) - stat.x;
        const ox2 = (stat.x + stat.w) - ch.x;
        const oy1 = (ch.y + ch.h) - stat.y;
        const oy2 = (stat.y + stat.h) - ch.y;
        if (Math.min(ox1, ox2) < Math.min(oy1, oy2)) {
          ch.x += ox1 < ox2 ? -Math.min(ox1, ox2) : Math.min(ox1, ox2);
        }
        box.x = ch.x;
      }
    }
  }

  _updateProjectile(p, dt) {
    p.vx += this.windAccel * dt;
    p.vy += this.gravity   * dt;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;

    if (p.x < -200 || p.x > this.worldWidth + 200 || p.y > this.worldHeight + 200) {
      p.alive = false;

      return;
    }

    for (const ch of this.characters) {
      if (ch.tag === p.owner) continue;
      const rect = { x: ch.x, y: ch.y, w: ch.w, h: ch.h };
      const hit  = CollisionDetection.circleAABBHit(p, rect);
      if (hit) {
        if (ch.tag === "dog") {
          dogHP = Math.max(0, dogHP - 15);
          this.floatTexts.push({ x: ch.x + ch.w / 2, y: ch.y - 20, vy: -50, life: 1.2,
            text: dogHP <= 0 ? "Ciyang defeated! 💀" : "-15 HP!" });
        } else if (ch.tag === "player") {
          catHP = Math.max(0, catHP - 15);
          this.floatTexts.push({ x: ch.x + ch.w / 2, y: ch.y - 20, vy: -50, life: 1.2,
            text: catHP <= 0 ? "Rish defeated! 💀" : "-15 HP!" });
        }
        p.alive = false;
        return;
      }
    }

    const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    for (const id of this._queryNearbyAABB(box)) {
      const stat = this.staticBodies.find(b => b.id === id);
      if (!stat) continue;
      const hit = CollisionDetection.circleAABBHit(p, stat);
      if (hit) {

        p.alive = false;
        return;
      }
    }
  }
}

// ─── IMAGES ───────────────────────────────────────────────────────────────────
let imgBg, imgPlayer, imgTarget, imgPan;

function drawImageCover(img, dx, dy, dw, dh) {
  const sr = img.width / img.height, dr = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (dr > sr) { sh = img.width / dr; sy = (img.height - sh) / 2; }
  else          { sw = img.height * dr; sx = (img.width  - sw) / 2; }
  image(img, dx, dy, dw, dh, sx, sy, sw, sh);
}

function drawContain(img, dx, dy, dw, dh) {
  const sr = img.width / img.height, dr = dw / dh;
  let tw = dw, th = dh;
  if (dr > sr) { tw = dh * sr; } else { th = dw / sr; }
  image(img, dx + (dw - tw) / 2, dy + (dh - th) / 2, tw, th);
}

function drawHeadLabel(textStr, centerX, topY) {
  if (!textStr) return;
  push();
  textSize(LABEL_STYLE.fontSize);
  textAlign(CENTER, CENTER);
  const tw = textWidth(textStr);
  const bw = tw + LABEL_STYLE.paddingX * 2;
  const bh = LABEL_STYLE.fontSize + LABEL_STYLE.paddingY * 2;
  const x  = centerX - bw / 2;
  const y  = topY - bh - LABEL_STYLE.offsetY;
  stroke(...LABEL_STYLE.boxStroke);
  strokeWeight(LABEL_STYLE.boxStrokeWeight);
  fill(...LABEL_STYLE.boxFill);
  rect(x, y, bw, bh, LABEL_STYLE.radius);
  noStroke();
  fill(...LABEL_STYLE.textColor);
  text(textStr, centerX, y + bh / 2 + 1);
  pop();
}

// ─── AIM TRAJECTORY (RISH / CAT) ─────────────────────────────────────────────
function drawAimTrajectory(ch, angleObj, powerObj) {
  if (!powerObj.isCharging && powerObj.value <= 0) return;

  const fromX = ch.x + ch.w * (ch.facing === 1 ? 0.9 : 0.1);
  const fromY = ch.y + ch.h * 0.35;
  const speed = powerObj.value * 8;
  const a     = angleObj.angleRad;

  let vx = Math.cos(a) * speed;
  let vy = -Math.sin(a) * speed;
  let px = fromX, py = fromY;

  const GRAVITY = 900, WIND = 50, SIM_DT = 0.015, MAX_DOTS = 10;

  push();
  for (let i = 0; i < MAX_DOTS; i++) {
    const t     = i / MAX_DOTS;
    const alpha = lerp(240, 0, t);
    const dotR  = lerp(7, 2, t);

    noFill();
    stroke(255, 220, 60, alpha * 0.45);
    strokeWeight(dotR * 0.9);
    ellipse(px, py, dotR * 2.6, dotR * 2.6);

    noStroke();
    fill(255, 245, 130, alpha);
    ellipse(px, py, dotR * 2, dotR * 2);

    vx += WIND    * SIM_DT;
    vy += GRAVITY * SIM_DT;
    px += vx * SIM_DT;
    py += vy * SIM_DT;
    if (px < -200 || px > 1800 || py > 950) break;
  }

  const tipX = fromX + Math.cos(a) * 36;
  const tipY = fromY - Math.sin(a) * 36;
  stroke(255, 200, 40, 200);
  strokeWeight(2.5);
  fill(255, 200, 40, 200);
  line(fromX, fromY, tipX, tipY);
  const hl = 9, ha = 0.42;
  noStroke();
  triangle(
    tipX, tipY,
    tipX - hl * Math.cos(a - ha), tipY + hl * Math.sin(a - ha),
    tipX - hl * Math.cos(a + ha), tipY + hl * Math.sin(a + ha),
  );
  pop();
}

// ─── HEALTH BARS ──────────────────────────────────────────────────────────────
function drawHealthBars() {
  const HUD_Y  = 10;
  const HUD_H  = 52;
  const MARGIN = 18;
  const GAP    = 120;
  const BAR_W  = (width / 2) - MARGIN - GAP / 2;
  const BAR_H  = 38;
  const BAR_Y  = HUD_Y + (HUD_H - BAR_H) / 2;
  const BORD   = 5;
  const R      = 6;

  push();
  noStroke();

  function drawFighterBar(label, hp, side) {
    const pct  = clamp(hp / 100, 0, 1);
    const barX = side === "left" ? MARGIN : width / 2 + GAP / 2;
    const barY = BAR_Y;

    fill(255, 200, 0);
    rect(barX - BORD, barY - BORD, BAR_W + BORD * 2, BAR_H + BORD * 2, R + BORD);
    fill(140, 0, 0);
    rect(barX - 2, barY - 2, BAR_W + 4, BAR_H + 4, R + 2);
    fill(20, 0, 0);
    rect(barX, barY, BAR_W, BAR_H, R);

    const fillW = BAR_W * pct;
    const fillX = side === "left" ? barX : barX + BAR_W - fillW;

    fill(255, 0, 0, 70);
    rect(fillX - 2, barY - 2, fillW + 4, BAR_H + 4, R);
    fill(220, 20, 20);
    rect(fillX, barY, fillW, BAR_H, R);
    fill(255, 120, 120, 120);
    rect(fillX, barY + 3, fillW, BAR_H * 0.28, R);

    fill(255, 240, 180);
    noStroke();
    textSize(17);
    textStyle(BOLD);
    if (side === "left") {
      textAlign(LEFT, CENTER);
      text(label, barX + 10, barY + BAR_H / 2 + 1);
    } else {
      textAlign(RIGHT, CENTER);
      text(label, barX + BAR_W - 10, barY + BAR_H / 2 + 1);
    }
  }

  const vsX = width / 2;
  const vsY  = BAR_Y + BAR_H / 2;
  fill(255, 200, 0);
  ellipse(vsX, vsY, GAP - 10, HUD_H + 8);
  fill(140, 0, 0);
  ellipse(vsX, vsY, GAP - 20, HUD_H - 4);
  fill(255, 220, 50);
  textAlign(CENTER, CENTER);
  textSize(22);
  textStyle(BOLD);
  text("VS", vsX, vsY + 1);

  drawFighterBar(LABELS.player, catHP, "left");
  drawFighterBar(LABELS.target, dogHP, "right");

  textStyle(NORMAL);
  pop();
}

// ─── AIM TRAJECTORY (CIYANG / DOG) ───────────────────────────────────────────
function drawAimTrajectoryDog(ch, angleObj, powerObj) {
  if (powerObj.value <= 0) return;

  const fromX = ch.x + ch.w * (ch.facing === 1 ? 0.9 : 0.1);
  const fromY = ch.y + ch.h * 0.35;
  const speed = powerObj.value * 8;
  const a     = angleObj.angleRad;

  let vx = Math.cos(a) * speed;
  let vy = -Math.sin(a) * speed;
  let px = fromX, py = fromY;
  const GRAVITY = 900, WIND = 50, SIM_DT = 0.015, MAX_DOTS = 10;

  push();
  for (let i = 0; i < MAX_DOTS; i++) {
    const t     = i / MAX_DOTS;
    const alpha = lerp(240, 0, t);
    const dotR  = lerp(7, 2, t);
    noFill();
    stroke(255, 140, 60, alpha * 0.45);
    strokeWeight(dotR * 0.9);
    ellipse(px, py, dotR * 2.6, dotR * 2.6);
    noStroke();
    fill(255, 180, 80, alpha);
    ellipse(px, py, dotR * 2, dotR * 2);
    vx += WIND * SIM_DT;
    vy += GRAVITY * SIM_DT;
    px += vx * SIM_DT;
    py += vy * SIM_DT;
    if (px < -200 || px > 1800 || py > 950) break;
  }

  const tipX = fromX + Math.cos(a) * 36;
  const tipY = fromY - Math.sin(a) * 36;
  stroke(255, 140, 40, 200);
  strokeWeight(2.5);
  fill(255, 140, 40, 200);
  line(fromX, fromY, tipX, tipY);
  const hl = 9, ha = 0.42;
  noStroke();
  triangle(tipX, tipY,
    tipX - hl * Math.cos(a - ha), tipY + hl * Math.sin(a - ha),
    tipX - hl * Math.cos(a + ha), tipY + hl * Math.sin(a + ha));
  pop();
}

// ─── GLOBALS ──────────────────────────────────────────────────────────────────
let cd, angleObj, powerObj, player, dogBody;
let catHP = 100;
let dogHP = 100;
let ciyangAngleObj, ciyangPowerObj;
const GROUND_Y = 850;
function preload() {
  imgBg     = loadImage("bg.jpg");
  imgPlayer = loadImage("player.png");
  imgTarget = loadImage("target.png");
  imgPan    = loadImage("pan.png");
}

function setup() {
  createCanvas(1600, 900);
  // W/S to aim, F to fire
  angleObj = new ANGLE({
    direction: 1,
    angleDeg: 45,
    minDeg: 0,
    maxDeg: 80,
    stepDeg: 1,
    upKey: 87,
    downKey: 83
  });
  powerObj = new POWER({
    min: 0,
    max: 100,
    chargeRatePerSec: 70,
    fireKey: 70
  });

  // ↑/↓ to aim, space to fire
  ciyangAngleObj = new ANGLE({
    direction: -1,
    angleDeg: 45,
    minDeg: 0,
    axDeg: 80,
    stepDeg: 1,
    upKey: UP_ARROW,
    downKey:DOWN_ARROW
  });
  ciyangPowerObj = new POWER({
    min: 0,
    max: 100,
    chargeRatePerSec: 70,
    fireKey: 32
  });

  cd = new CollisionDetection({
    worldWidth: 1600, worldHeight: 900,
    cellSize: 128, gravity: 900, windAccel: 50,
  });

  // Ground spans full width
  cd.addStaticRect({ x: 0, y: GROUND_Y, w: 1600, h: 50, tag: "ground" });

  // ── Wall: centered at x=770 (800 midpoint minus half of 60px width = 770) ──
  cd.addStaticRect({ x: 770, y: 650, w: 60, h: 200, tag: "wall" });

  const DOG_H = 110;
  // ── Dog: right side, ~250px from center ──
  dogBody = cd.addCharacter({
    x: 1100, y: GROUND_Y - DOG_H,
    w: 120, h: DOG_H,
    speed: 280, tag: "dog", leftKey: LEFT_ARROW, rightKey: RIGHT_ARROW
  });
  dogBody.facing = -1; // starts facing left toward cat

  const CAT_H = 120;
  // ── Cat: left side, ~250px from center ──
  player = cd.addCharacter({
    x: 380, y: GROUND_Y - CAT_H,
    w: 120, h: CAT_H,
    speed: 280, tag: "player",
    leftKey: 65, rightKey: 68
  });
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.033);
  const gameOver = catHP <= 0 || dogHP <= 0;

  if (!gameOver) {
      player.controllable  = true;
      dogBody.controllable = true;
      angleObj.update();
      powerObj.update(dt);
      ciyangAngleObj.update();
      ciyangPowerObj.update(dt);

    cd._updateCharacter(player,  dt, angleObj);
    cd._updateCharacter(dogBody, dt, ciyangAngleObj);

    if (powerObj.justReleased && powerObj.value > 0) {
      const fromX = player.x + player.w * (player.facing === 1 ? 0.9 : 0.1);
      const fromY = player.y + player.h * 0.35;
      cd.spawnProjectile({fromX, fromY, radius: 12, angleObj, powerObj, powerScale: 8, owner: "player"});
    }
      if (ciyangPowerObj.justReleased && ciyangPowerObj.value > 0) {
        const fromX = dogBody.x + dogBody.w * (dogBody.facing === 1 ? 0.9 : 0.1);
        const fromY = dogBody.y + dogBody.h * 0.35;
        cd.spawnProjectile({ fromX, fromY, radius: 12, angleObj: ciyangAngleObj, powerObj: ciyangPowerObj, powerScale: 8, owner: "dog" });
        dogBody.controllable = false;
      }

      for (const p of cd.projectiles) if (p.alive) cd._updateProjectile(p, dt);
      cd.floatTexts.forEach(t => { t.y += t.vy * dt; t.life -= dt; });
      cd.floatTexts = cd.floatTexts.filter(t => t.life > 0);
  }

  // ── DRAW ──────────────────────────────────────────────────────────────────
  drawImageCover(imgBg,0, 0, width, height);

  // Floor
  noStroke();
  fill(101, 67, 33, 220);
  const ground = cd.staticBodies.find(b => b.tag === "ground");
  if (ground) rect(ground.x, ground.y, ground.w, ground.h);

  // Wall
  const wall = cd.staticBodies.find(b => b.tag === "wall");
  if (wall) {
    fill(0, 0, 0, 60);
    rect(wall.x + 6, wall.y + 6, wall.w, wall.h, 4);
    fill(120, 90, 50, 230);
    rect(wall.x, wall.y, wall.w, wall.h, 4);
    fill(160, 120, 70, 180);
    rect(wall.x + 4, wall.y + 4, wall.w - 8, 10, 3);
  }

  // ── Dog (Ciyang) — mirror based on facing ──
  // Dog image naturally faces LEFT. facing=1 (right) = flip it.
  push();
  if (dogBody.facing === 1) {
    translate(dogBody.x + dogBody.w, 0);
    scale(-1, 1);
    drawContain(imgTarget, 0, dogBody.y, dogBody.w, dogBody.h);
  } else {
    drawContain(imgTarget, dogBody.x, dogBody.y, dogBody.w, dogBody.h);
  }
  pop();
  drawHeadLabel(LABELS.target, dogBody.x + dogBody.w / 2, dogBody.y);

  // Aim trajectory
  drawAimTrajectory(player, angleObj, powerObj);
  drawAimTrajectoryDog(dogBody, ciyangAngleObj, ciyangPowerObj);

  // ── Cat (Rish) — mirror based on facing ──
  push();
  if (player.facing === -1) {
    translate(player.x + player.w, 0);
    scale(-1, 1);
    drawContain(imgPlayer, 0, player.y, player.w, player.h);
  } else {
    drawContain(imgPlayer, player.x, player.y, player.w, player.h);
  }
  pop();
  drawHeadLabel(LABELS.player, player.x + player.w / 2, player.y);

  // Projectiles
  for (const p of cd.projectiles) {
    if (!p.alive) continue;
    const rot  = Math.atan2(p.vy, p.vx);
    const boxW = p.r * 8.0, boxH = p.r * 6.2;
    push();
    translate(p.x, p.y);
    rotate(rot);
    drawContain(imgPan, -boxW / 2, -boxH / 2, boxW, boxH);
    pop();
  }

  // Float texts
  fill(255, 50, 50);
  textSize(26);
  textAlign(CENTER);
  for (const t of cd.floatTexts) text(t.text, t.x, t.y);

  // HUD
  fill(0);
  textSize(16);
  textAlign(LEFT);
    text(`Angle: ${ciyangAngleObj.angleDeg.toFixed(0)}°`, 20, 82);
    text(`Power: ${ciyangPowerObj.value.toFixed(0)}`,     20, 102);
    text(`Angle: ${angleObj.angleDeg.toFixed(0)}°`,       20, 82);
    text(`Power: ${powerObj.value.toFixed(0)}`,           20, 102);
    text(`${LABELS.player}: A/D move  W/S aim  F fire   |   ${LABELS.target}: ←/→ move  ↑/↓ aim  Space fire`, 20, 122);



  // Health bars
  drawHealthBars();

  // ── WIN SCREEN ────────────────────────────────────────────────────────────
  if (gameOver) {
    const winnerIsRish = dogHP <= 0;
    const winnerName   = winnerIsRish ? LABELS.player : LABELS.target;
    const winnerHP     = winnerIsRish ? catHP : dogHP;
    const winnerImg    = winnerIsRish ? imgPlayer : imgTarget;

    push();
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);

    const px = width / 2, py = height / 2 - 60;
    const ps = 200;
    if (winnerIsRish) {
      drawContain(winnerImg, px - ps / 2, py - ps / 2, ps, ps);
    } else {
      translate(px + ps / 2, 0);
      scale(-1, 1);
      drawContain(winnerImg, -ps / 2, py - ps / 2, ps, ps);
      scale(-1, 1);
      translate(-(px + ps / 2), 0);
    }

    textAlign(CENTER, CENTER);
    textSize(72);
    fill(255, 220, 50);
    stroke(0);
    strokeWeight(4);
    text(`🏆 ${winnerName} Wins!`, width / 2, py + ps / 2 + 30);

    noStroke();
    textSize(28);
    fill(180, 255, 180);
    text(`Remaining HP: ${winnerHP}`, width / 2, py + ps / 2 + 100);

    textSize(22);
    fill(200, 200, 200);
    text("Refresh to play again", width / 2, py + ps / 2 + 145);
    pop();
  }
}