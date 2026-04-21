// 背景=bg.jpg（希腊沉船湾） // 玩家=player.png（猫） 目标=target.png（狗） 弹体=pan.png（平底锅）
// 操作：A/D 或 ←/→ 移动；↑↓调角度；按住空格蓄力，松开发射
const LABELS = {
  player: "Rish",
  target: "Ciyang",
};

let gameState = "start";  // "start", "difficulty", "character", "battle"

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

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const sign = (v) => (v < 0 ? -1 : 1);
function vec2(x = 0, y = 0) { return { x, y }; }
function vecLen(a) { return Math.hypot(a.x, a.y); }
function vecNorm(a) { const l = vecLen(a) || 1; return { x: a.x / l, y: a.y / l }; }

// ─── ANGLE ────────────────────────────────────────────────────────────────────
class ANGLE {
  constructor({ direction = 1, angleDeg = 45, minDeg = 0, maxDeg = 80, stepDeg = 1 } = {}) {
    this.direction = direction;
    this.angleDeg = angleDeg;
    this.minDeg = minDeg;
    this.maxDeg = maxDeg;
    this.stepDeg = stepDeg;
  }
  setDirection(dir) { this.direction = dir >= 0 ? 1 : -1; }
  update() {
    if (keyIsDown(UP_ARROW)) this.angleDeg += this.stepDeg;
    if (keyIsDown(DOWN_ARROW)) this.angleDeg -= this.stepDeg;
    this.angleDeg = clamp(this.angleDeg, this.minDeg, this.maxDeg);
  }
  get angleRad() {
    const base = (this.angleDeg * Math.PI) / 180;
    return this.direction === 1 ? base : Math.PI - base;
  }
}

// ─── POWER ────────────────────────────────────────────────────────────────────
class POWER {
  constructor({ min = 0, max = 100, chargeRatePerSec = 70, decayRatePerSec = 0 } = {}) {
    this.min = min;
    this.max = max;
    this.chargeRatePerSec = chargeRatePerSec;
    this.decayRatePerSec = decayRatePerSec;
    this.value = min;
    this.isCharging = false;
    this.justReleased = false;
    this._wasCharging = false;
  }
  update(dt) {
    this.justReleased = false;
    this.isCharging = keyIsDown(32);
    if (this.isCharging) {
      this.value = clamp(this.value + this.chargeRatePerSec * dt, this.min, this.max);
    } else if (this.decayRatePerSec > 0) {
      this.value = clamp(this.value - this.decayRatePerSec * dt, this.min, this.max);
    }
    if (this._wasCharging && !this.isCharging) this.justReleased = true;
    this._wasCharging = this.isCharging;
  }
  consume() { const out = this.value; this.value = this.min; return out; }
}

// ─── COLLISION DETECTION ──────────────────────────────────────────────────────
class CollisionDetection {
  constructor({ worldWidth = 1600, worldHeight = 900, cellSize = 128, gravity = 900, windAccel = 50 } = {}) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.gravity = gravity;
    this.windAccel = windAccel;
    this.staticBodies = [];
    this.characters = [];
    this.projectiles = [];
    this.floatTexts = [];
    this._grid = new Map();
    this._nextId = 1;
  }

  _cellKey(cx, cy) { return `${cx},${cy}`; }

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

  addCharacter({ x, y, w = 60, h = 60, speed = 280, tag = "player" }) {
    const ch = {
      id: this._nextId++, type: "character", tag,
      x, y, w, h, vx: 0, vy: 0, speed,
      onGround: false, facing: 1,
      controllable: tag === "player",
    };
    this.characters.push(ch);
    return ch;
  }

  spawnProjectile({ fromX, fromY, radius = 12, angleObj, powerObj, powerScale = 8, owner = "player" }) {
    const power = powerObj.consume();
    const speed = power * powerScale;
    const a = angleObj.angleRad;
    const p = {
      id: this._nextId++, type: "projectile",
      x: fromX, y: fromY, r: radius,
      vx: Math.cos(a) * speed,
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
    const ox2 = (stat.x + stat.w) - dynamic.x;
    const oy1 = (dynamic.y + dynamic.h) - stat.y;
    const oy2 = (stat.y + stat.h) - dynamic.y;
    const penX = Math.min(ox1, ox2);
    const penY = Math.min(oy1, oy2);
    if (penX < penY) {
      dynamic.x += ox1 < ox2 ? -penX : penX;
      dynamic.vx = 0;
    } else {
      if (oy1 < oy2) { dynamic.y -= penY; dynamic.vy = 0; dynamic.onGround = true; }
      else { dynamic.y += penY; dynamic.vy = 0; }
    }
  }

  _updateCharacter(ch, dt, angleObj) {
    if (ch.controllable) {
      const left = keyIsDown(LEFT_ARROW) || keyIsDown(65);
      const right = keyIsDown(RIGHT_ARROW) || keyIsDown(68);
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
    p.vy += this.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < -200 || p.x > this.worldWidth + 200 || p.y > this.worldHeight + 200) {
      p.alive = false;
      if (turn === "waiting_rish") { turn = "ciyang"; }
      if (turn === "waiting_ciyang") { turn = "rish"; }
      return;
    }

    for (const ch of this.characters) {
      if (ch.tag === p.owner) continue;
      const rect = { x: ch.x, y: ch.y, w: ch.w, h: ch.h };
      const hit = CollisionDetection.circleAABBHit(p, rect);
      if (hit) {
        if (ch.tag === "dog") {
          dogHP = Math.max(0, dogHP - 15);
          this.floatTexts.push({
            x: ch.x + ch.w / 2, y: ch.y - 20, vy: -50, life: 1.2,
            text: dogHP <= 0 ? "Ciyang defeated! 💀" : "-15 HP!"
          });
          turn = "ciyang";
        } else if (ch.tag === "player") {
          catHP = Math.max(0, catHP - 15);
          this.floatTexts.push({
            x: ch.x + ch.w / 2, y: ch.y - 20, vy: -50, life: 1.2,
            text: catHP <= 0 ? "Rish defeated! 💀" : "-15 HP!"
          });
          turn = "rish";
        }
        p.alive = false; return;
      }
    }

    const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    for (const id of this._queryNearbyAABB(box)) {
      const stat = this.staticBodies.find(b => b.id === id);
      if (!stat) continue;
      const hit = CollisionDetection.circleAABBHit(p, stat);
      if (hit) {
        if (turn === "waiting_rish") { turn = "ciyang"; }
        if (turn === "waiting_ciyang") { turn = "rish"; }
        p.alive = false; return;
      }
    }
  }
}

// ─── IMAGES ───────────────────────────────────────────────────────────────────
let imgBg, imgPlayer, imgTarget, imgPan;
let keyA, keyD, keyUp, keyDown, keyLeft, keyRight, keySpace;
let difficultyUI;

function drawImageCover(img, dx, dy, dw, dh) {
  const sr = img.width / img.height, dr = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (dr > sr) { sh = img.width / dr; sy = (img.height - sh) / 2; }
  else { sw = img.height * dr; sx = (img.width - sw) / 2; }
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
  const x = centerX - bw / 2;
  const y = topY - bh - LABEL_STYLE.offsetY;
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
  const a = angleObj.angleRad;

  let vx = Math.cos(a) * speed;
  let vy = -Math.sin(a) * speed;
  let px = fromX, py = fromY;

  const GRAVITY = 900, WIND = 50, SIM_DT = 0.015, MAX_DOTS = 10;

  push();
  for (let i = 0; i < MAX_DOTS; i++) {
    const t = i / MAX_DOTS;
    const alpha = lerp(240, 0, t);
    const dotR = lerp(7, 2, t);

    noFill();
    stroke(255, 220, 60, alpha * 0.45);
    strokeWeight(dotR * 0.9);
    ellipse(px, py, dotR * 2.6, dotR * 2.6);

    noStroke();
    fill(255, 245, 130, alpha);
    ellipse(px, py, dotR * 2, dotR * 2);

    vx += WIND * SIM_DT;
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
  const HUD_Y = 10;
  const HUD_H = 52;
  const MARGIN = 18;
  const GAP = 120;
  const BAR_W = (width / 2) - MARGIN - GAP / 2;
  const BAR_H = 38;
  const BAR_Y = HUD_Y + (HUD_H - BAR_H) / 2;
  const BORD = 5;
  const R = 6;

  push();
  noStroke();

  function drawFighterBar(label, hp, side) {
    const pct = clamp(hp / 100, 0, 1);
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
  const vsY = BAR_Y + BAR_H / 2;
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
  const a = angleObj.angleRad;

  let vx = Math.cos(a) * speed;
  let vy = -Math.sin(a) * speed;
  let px = fromX, py = fromY;
  const GRAVITY = 900, WIND = 50, SIM_DT = 0.015, MAX_DOTS = 10;

  push();
  for (let i = 0; i < MAX_DOTS; i++) {
    const t = i / MAX_DOTS;
    const alpha = lerp(240, 0, t);
    const dotR = lerp(7, 2, t);
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

let turn = "rish";

let ciyangAngleObj, ciyangPowerObj;

const GROUND_Y = 850;

function preload() {
  imgBg = loadImage("assets/images/bg.jpg");
  imgPlayer = loadImage("assets/images/player.png");
  imgTarget = loadImage("assets/images/target.png");
  imgPan = loadImage("assets/images/pan.png");

  // UI images
  keyA = loadImage("assets/ui/key_a.png");
  keyD = loadImage("assets/ui/key_d.png");
  keyUp = loadImage("assets/ui/key_up.png");
  keyDown = loadImage("assets/ui/key_down.png");
  keyLeft = loadImage("assets/ui/key_left.png");
  keyRight = loadImage("assets/ui/key_right.png");
  keySpace = loadImage("assets/ui/key_space.png");

  difficultyUI = loadImage("assets/ui/difficult-select-01.png");
}

function setup() {
  createCanvas(1600, 900);
  noSmooth();

  angleObj = new ANGLE({ direction: 1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1 });
  powerObj = new POWER({ min: 0, max: 100, chargeRatePerSec: 70 });

  ciyangAngleObj = new ANGLE({ direction: -1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1 });
  ciyangPowerObj = new POWER({ min: 0, max: 100, chargeRatePerSec: 70 });

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
    speed: 0, tag: "dog",
  });
  dogBody.facing = -1; // starts facing left toward cat

  const CAT_H = 120;
  // ── Cat: left side, ~250px from center ──
  player = cd.addCharacter({
    x: 380, y: GROUND_Y - CAT_H,
    w: 120, h: CAT_H,
    speed: 280, tag: "player",
  });

  player.controllable = false;
  dogBody.controllable = false;
}

function draw() {
  // ===== State Management =====
  if (gameState === "start") {
    let tempTurn = turn;
    let tempControllablePlayer = player.controllable;
    let tempControllableDog = dogBody.controllable;

    player.controllable = false;
    dogBody.controllable = false;

    // Draw background and characters (same as before)
    drawImageCover(imgBg, 0, 0, width, height);

    // Draw ground
    noStroke();
    fill(101, 67, 33, 220);
    const ground = cd.staticBodies.find(b => b.tag === "ground");
    if (ground) rect(ground.x, ground.y, ground.w, ground.h);

    // Draw wall
    const wall = cd.staticBodies.find(b => b.tag === "wall");
    if (wall) {
      fill(0, 0, 0, 60);
      rect(wall.x + 6, wall.y + 6, wall.w, wall.h, 4);
      fill(120, 90, 50, 230);
      rect(wall.x, wall.y, wall.w, wall.h, 4);
      fill(160, 120, 70, 180);
      rect(wall.x + 4, wall.y + 4, wall.w - 8, 10, 3);
    }

    // Draw dog
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

    // Draw cat
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

    // Restore temporary variables
    turn = tempTurn;
    player.controllable = tempControllablePlayer;
    dogBody.controllable = tempControllableDog;

    // Draw start screen overlay
    drawStartScreen();
    return;

  } else if (gameState === "difficulty") {
    // Draw background first
    drawImageCover(imgBg, 0, 0, width, height);
    // Draw difficulty selection overlay
    drawDifficultyScreen();
    return;

  } else if (gameState === "character") {
    // Draw background first
    drawImageCover(imgBg, 0, 0, width, height);
    // Draw character selection overlay
    drawCharacterScreen();
    return;
  }


  const dt = Math.min(deltaTime / 1000, 0.033);

  const gameOver = catHP <= 0 || dogHP <= 0;

  if (!gameOver) {
    // ── RISH'S TURN ─────────────────────────────────────────────────────────
    if (turn === "rish") {
      player.controllable = true;
      dogBody.controllable = false;
      angleObj.update();
      powerObj.update(dt);
      for (const ch of cd.characters) cd._updateCharacter(ch, dt, angleObj);
      if (powerObj.justReleased && powerObj.value > 0) {
        const fromX = player.x + player.w * (player.facing === 1 ? 0.9 : 0.1);
        const fromY = player.y + player.h * 0.35;
        cd.spawnProjectile({ fromX, fromY, radius: 12, angleObj, powerObj, powerScale: 8, owner: "player" });
        turn = "waiting_rish";
      }

      // ── RISH PAN FLYING ──────────────────────────────────────────────────────
    } else if (turn === "waiting_rish") {
      player.controllable = false;

      // ── CIYANG'S TURN ────────────────────────────────────────────────────────
    } else if (turn === "ciyang") {
      player.controllable = false;
      dogBody.controllable = true;
      dogBody.speed = 280;
      ciyangAngleObj.update();
      ciyangPowerObj.update(dt);
      for (const ch of cd.characters) cd._updateCharacter(ch, dt, ciyangAngleObj);
      if (ciyangPowerObj.justReleased && ciyangPowerObj.value > 0) {
        const fromX = dogBody.x + dogBody.w * (dogBody.facing === 1 ? 0.9 : 0.1);
        const fromY = dogBody.y + dogBody.h * 0.35;
        cd.spawnProjectile({ fromX, fromY, radius: 12, angleObj: ciyangAngleObj, powerObj: ciyangPowerObj, powerScale: 8, owner: "dog" });
        dogBody.controllable = false;
        turn = "waiting_ciyang";
      }

      // ── CIYANG PAN FLYING ────────────────────────────────────────────────────
    } else if (turn === "waiting_ciyang") {
      player.controllable = false;
    }

    for (const p of cd.projectiles) if (p.alive) cd._updateProjectile(p, dt);
    cd.floatTexts.forEach(t => { t.y += t.vy * dt; t.life -= dt; });
    cd.floatTexts = cd.floatTexts.filter(t => t.life > 0);
  }

  // ── DRAW ──────────────────────────────────────────────────────────────────
  drawImageCover(imgBg, 0, 0, width, height);

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
  if (turn === "rish") drawAimTrajectory(player, angleObj, powerObj);
  if (turn === "ciyang") drawAimTrajectoryDog(dogBody, ciyangAngleObj, ciyangPowerObj);

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
    const rot = Math.atan2(p.vy, p.vx);
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
  if (turn === "ciyang") {
    text(`Angle: ${ciyangAngleObj.angleDeg.toFixed(0)}°`, 20, 82);
    text(`Power: ${ciyangPowerObj.value.toFixed(0)}`, 20, 102);
  } else {
    text(`Angle: ${angleObj.angleDeg.toFixed(0)}°`, 20, 82);
    text(`Power: ${powerObj.value.toFixed(0)}`, 20, 102);
  }
  text(`Move: A/D  |  Aim: ↑↓  |  Charge & Fire: Space`, 20, 122);

  // Turn banner
  const bannerTurn = turn === "rish"
    ? `🐱 ${LABELS.player}'s Turn — Aim & Fire!`
    : turn === "ciyang"
      ? `🐶 ${LABELS.target}'s Turn — Aim & Fire!`
      : (turn === "waiting_rish" || turn === "waiting_ciyang")
        ? "💨 Projectile flying..."
        : "";

  if (bannerTurn && !gameOver) {
    const bx = width / 2, by = 148;
    push();
    textAlign(CENTER, CENTER);
    textSize(20);
    const bw = textWidth(bannerTurn) + 28;
    fill(0, 0, 0, 160);
    rect(bx - bw / 2, by - 16, bw, 32, 8);
    fill(turn === "rish" ? color(100, 200, 255) : color(255, 180, 80));
    noStroke();
    text(bannerTurn, bx, by);
    pop();
  }

  // Health bars
  drawHealthBars();

  // ── WIN SCREEN ────────────────────────────────────────────────────────────
  if (gameOver) {
    const winnerIsRish = dogHP <= 0;
    const winnerName = winnerIsRish ? LABELS.player : LABELS.target;
    const winnerHP = winnerIsRish ? catHP : dogHP;
    const winnerImg = winnerIsRish ? imgPlayer : imgTarget;

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

    // --- SE-24 Grace: return button ---
    let backBtnX = width / 2;
    let backBtnY = height / 2 + 220;
    let backBtnW = 200;
    let backBtnH = 50;

    // button shadow
    fill(0, 0, 0, 100);
    rect(backBtnX + 3, backBtnY + 3, backBtnW, backBtnH, 15);

    // mouse hover effect
    if (mouseX > backBtnX - backBtnW / 2 && mouseX < backBtnX + backBtnW / 2 &&
      mouseY > backBtnY - backBtnH / 2 && mouseY < backBtnY + backBtnH / 2) {
      fill(100, 150, 255);  // lighter blue
    } else {
      fill(70, 130, 255);   // blue
    }

    rect(backBtnX, backBtnY, backBtnW, backBtnH, 15);

    fill(255);
    textSize(22);
    text("Return to Start Screen", backBtnX, backBtnY);

    pop();
  }
}


// ----- SE-24 Grace: Draw Start Screen -----
function drawStartScreen() {
  push();
  rectMode(CENTER);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);

  // dark overlay
  fill(0, 0, 0, 200);
  rect(width / 2, height / 2, width, height);

  // ===== TITLE =====
  textAlign(CENTER, CENTER);

  // shadow
  fill(0, 0, 0, 150);
  textSize(90);
  text("🐱 MERCHANT FIGHTER 🐶", width / 2 + 6, height / 3 + 6);

  // main title
  fill(255, 220, 50);
  text("🐱 MERCHANT FIGHTER 🐶", width / 2, height / 3);

  // subtitle
  fill(255);
  textSize(30);
  text("Rish vs Ciyang", width / 2, height / 3 + 80);

  // ===== START BUTTON =====
  let btnX = width / 2;
  let btnY = height / 2 + 40;
  let btnW = 260;
  let btnH = 80;

  // shadow
  fill(0, 0, 0, 120);
  rect(btnX + 4, btnY + 4, btnW, btnH, 25);

  // hover
  if (mouseX > btnX - btnW / 2 && mouseX < btnX + btnW / 2 &&
    mouseY > btnY - btnH / 2 && mouseY < btnY + btnH / 2) {
    fill(110, 255, 110);
  } else {
    fill(80, 200, 80);
  }

  rect(btnX, btnY, btnW, btnH, 25);
  fill(255);
  textSize(36);
  text("START", btnX, btnY);

  // ===== introduction: grid =====
  const iconSize = 48;
  const spacing = 20;
  const rowStartY = height / 2 + 160;
  const rowGap = 70;

  // centerX for each of the three zones: left, center, right
  const leftZoneX = width / 2 - 220;
  const centerZoneX = width / 2;
  const rightZoneX = width / 2 + 220;

  // ---------- first row: move ----------
  const row1Y = rowStartY;

  image(keyLeft, leftZoneX - spacing, row1Y, iconSize, iconSize);
  image(keyRight, leftZoneX + spacing, row1Y, iconSize, iconSize);

  fill(255);
  textSize(26);
  text("MOVE", centerZoneX, row1Y);

  image(keyA, rightZoneX - spacing, row1Y, iconSize, iconSize);
  image(keyD, rightZoneX + spacing, row1Y, iconSize, iconSize);

  // ---------- second row: aim ----------
  const row2Y = rowStartY + rowGap;

  image(keyUp, leftZoneX - spacing, row2Y, iconSize, iconSize);
  image(keyDown, leftZoneX + spacing, row2Y, iconSize, iconSize);

  fill(255);
  textSize(26);
  text("ADJUST ANGLE", centerZoneX, row2Y);

  // ---------- third row: fire ----------
  const row3Y = rowStartY + rowGap * 2;

  fill(255);
  textSize(22);
  text("HOLD SPACE TO CHARGE • RELEASE TO FIRE", centerZoneX, row3Y);

  // space key image
  const row4Y = row3Y + 50;
  push();
  imageMode(CENTER);
  image(keySpace, centerZoneX, row4Y, 160, 40);
  pop();

  pop();
  rectMode(CORNER);
}

// ----- SE-24 Grace: Reset Game -----
function resetGame() {
  // RESET HEALTH
  catHP = 100;
  dogHP = 100;

  // RESET CHARACTER POSITIONS
  player.x = 380;
  player.y = GROUND_Y - 120;
  dogBody.x = 1100;
  dogBody.y = GROUND_Y - 110;

  // Restet angles
  angleObj.angleDeg = 45;
  ciyangAngleObj.angleDeg = 45;

  // Reset power
  powerObj.value = 0;
  ciyangPowerObj.value = 0;

  cd.projectiles = [];
  turn = "rish";

  player.controllable = true;
  dogBody.controllable = false;
}


// ----- SE-24 Grace: mouse interactions -----
function mousePressed() {
  if (gameState === "start") {
    // START screen: PLAY button
    let btnX = width / 2;
    let btnY = height / 2 + 40;
    let btnW = 260;
    let btnH = 80;
    if (mouseX > btnX - btnW / 2 && mouseX < btnX + btnW / 2 &&
      mouseY > btnY - btnH / 2 && mouseY < btnY + btnH / 2) {
      gameState = "difficulty";
    }
  } else if (gameState === "difficulty") {
    // Back button
    let backBtnY = height - 100;
    let backBtnW = 150;
    let backBtnH = 50;
    if (mouseX > width / 2 - backBtnW / 2 && mouseX < width / 2 + backBtnW / 2 &&
      mouseY > backBtnY - backBtnH / 2 && mouseY < backBtnY + backBtnH / 2) {
      gameState = "start";
      return;
    }

    // difficulty selection: 3 buttons
    let btnW = 320;
    let btnH = btnW * 32 / 96; // 134
    let gap = 30;
    let startY = height / 2 + 20 - (btnH * 3 + gap * 2) / 2 + btnH / 2;
    let difficulties = ["EASY", "MEDIUM", "HARD"];
    for (let i = 0; i < 3; i++) {
      let cx = width / 2;
      let cy = startY + i * (btnH + gap);
      if (mouseX > cx - btnW / 2 && mouseX < cx + btnW / 2 &&
        mouseY > cy - btnH / 2 && mouseY < cy + btnH / 2) {
        console.log(difficulties[i] + " selected");
        gameState = "character";
        break;
      }
    }
  } else if (gameState === "character") {
    // Character selection
    let cardW = 300;
    let cardH = 400;
    let gap = 80;
    let leftCardX = width / 2 - cardW - gap / 2;
    let rightCardX = width / 2 + gap / 2;
    let backBtnY = height - 60;
    let backBtnW = 150;
    let backBtnH = 50;

    // Back button
    if (mouseX > width / 2 - backBtnW / 2 && mouseX < width / 2 + backBtnW / 2 &&
      mouseY > backBtnY - backBtnH / 2 && mouseY < backBtnY + backBtnH / 2) {
      gameState = "difficulty";
      return;
    }

    // Left character (Rish/Cat)
    if (mouseX > leftCardX - cardW / 2 && mouseX < leftCardX + cardW / 2 &&
      mouseY > height / 2 - cardH / 2 && mouseY < height / 2 + cardH / 2) {
      console.log("Rish selected");
      gameState = "battle";
      resetGame();
    }

    // Right character (Ciyang/Dog)
    if (mouseX > rightCardX - cardW / 2 && mouseX < rightCardX + cardW / 2 &&
      mouseY > height / 2 - cardH / 2 && mouseY < height / 2 + cardH / 2) {
      console.log("Ciyang selected");
      gameState = "battle";
      resetGame();
    }
  } else if (gameState === "battle") {
    // Game over return button
    let gameOver = catHP <= 0 || dogHP <= 0;
    if (gameOver) {
      let backBtnX = width / 2;
      let backBtnY = height / 2 + 220;
      let backBtnW = 200;
      let backBtnH = 50;
      if (mouseX > backBtnX - backBtnW / 2 && mouseX < backBtnX + backBtnW / 2 &&
        mouseY > backBtnY - backBtnH / 2 && mouseY < backBtnY + backBtnH / 2) {
        gameState = "start";
      }
    }
  }
}

// ----- SE-24 Grace: Difficulty Selection Screen -----
function drawDifficultyScreen() {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textStyle(BOLD); //pixelated looks?

  // background overlay
  fill(0, 0, 0, 200);
  rect(width / 2, height / 2, width, height);

  // title
  fill(255, 220, 50);
  textSize(70);
  text("Select Difficulty", width / 2, height / 5);

  // buttons
  let btnW = 320;
  let btnH = btnW * 32 / 96;
  let gap = 30;
  let startY = height / 2 + 20 - (btnH * 3 + gap * 2) / 2 + btnH / 2; // center of first button:Y

  let difficulties = ["EASY", "MEDIUM", "HARD"];

  for (let i = 0; i < 3; i++) {
    let cx = width / 2;
    let cy = startY + i * (btnH + gap);
    let label = difficulties[i];

    // hover detection
    let hover = mouseX > cx - btnW / 2 && mouseX < cx + btnW / 2 &&
      mouseY > cy - btnH / 2 && mouseY < cy + btnH / 2;

    // image turn blue on hover
    if (hover) {
      tint(200, 200, 255);
    } else {
      noTint();
    }

    // image button
    image(difficultyUI, cx - btnW / 2, cy - btnH / 2, btnW, btnH);

    // draw text on top of image
    noTint();
    fill(255);
    stroke(0);
    strokeWeight(4);
    textSize(35); // adjest text size to fit better
    text(label, cx, cy);
    noStroke();
  }

  // return button
  let backBtnW = 150;
  let backBtnH = 50;
  let backBtnY = height - 100;
  fill(0, 0, 0, 120);
  rect(width / 2 + 3, backBtnY + 3, backBtnW, backBtnH, 20);
  fill(150, 150, 150);
  rect(width / 2, backBtnY, backBtnW, backBtnH, 20);
  fill(255);
  textSize(24);
  text("← BACK", width / 2, backBtnY);

  pop();
  rectMode(CORNER);
  textStyle(NORMAL);
}

// -----SE-24 Grace: Character Selection Screen -----
function drawCharacterScreen() {

  push();
  rectMode(CENTER);

  fill(0, 0, 0, 200);
  rect(width / 2, height / 2, width, height);

  // Title
  textAlign(CENTER, CENTER);
  fill(255, 220, 50);
  textSize(70);
  text("Choose Your Character", width / 2, height / 5);

  // Character cards container
  let cardW = 300;
  let cardH = 400;
  let gap = 80;
  let leftCardX = width / 2 - cardW - gap / 2;
  let rightCardX = width / 2 + gap / 2;

  // ===== LEFT CHARACTER (Rish / Cat) =====
  // Card background
  fill(0, 0, 0, 150);
  rect(leftCardX + 6, height / 2 + 6, cardW, cardH, 20);
  if (mouseX > leftCardX - cardW / 2 && mouseX < leftCardX + cardW / 2 &&
    mouseY > height / 2 - cardH / 2 && mouseY < height / 2 + cardH / 2) {
    fill(100, 150, 255, 200);
  } else {
    fill(50, 50, 80, 200);
  }
  rect(leftCardX, height / 2, cardW, cardH, 20);

  // Character image placeholder (using existing player image)
  let imgSize = 180;
  push();
  imageMode(CENTER);
  if (imgPlayer) {
    // Draw with contain to fit in circle
    drawContain(imgPlayer, leftCardX - imgSize / 2, height / 2 - 150, imgSize, imgSize);
  }
  pop();

  // Character name
  fill(255);
  textSize(36);
  text(LABELS.player, leftCardX, height / 2 + 50);

  // Character description (placeholder)
  textSize(18);
  fill(220, 220, 220);
  text("The agile cat warrior", leftCardX, height / 2 + 90);
  text("Balanced fighter", leftCardX, height / 2 + 120);

  // ===== RIGHT CHARACTER (Ciyang / Dog) =====
  // Card background
  fill(0, 0, 0, 150);
  rect(rightCardX + 6, height / 2 + 6, cardW, cardH, 20);
  if (mouseX > rightCardX - cardW / 2 && mouseX < rightCardX + cardW / 2 &&
    mouseY > height / 2 - cardH / 2 && mouseY < height / 2 + cardH / 2) {
    fill(255, 150, 100, 200);
  } else {
    fill(80, 50, 50, 200);
  }
  rect(rightCardX, height / 2, cardW, cardH, 20);

  // Character image placeholder (using existing target image)
  push();
  imageMode(CENTER);
  if (imgTarget) {
    push();
    translate(rightCardX, height / 2 - 60);
    scale(-1, 1); // Flip to face right for the selection screen
    drawContain(imgTarget, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
    pop();
  }
  pop();

  // Character name
  fill(255);
  textSize(36);
  text(LABELS.target, rightCardX, height / 2 + 50);

  // Character description (placeholder)
  textSize(18);
  fill(220, 220, 220);
  text("The powerful dog warrior", rightCardX, height / 2 + 90);
  text("Heavy hitter", rightCardX, height / 2 + 120);

  // Back button (same as difficulty screen)
  let backBtnW = 150;
  let backBtnH = 50;
  let backBtnY = height - 60;
  fill(0, 0, 0, 120);
  rect(width / 2 + 3, backBtnY + 3, backBtnW, backBtnH, 20);
  fill(150, 150, 150);
  rect(width / 2, backBtnY, backBtnW, backBtnH, 20);
  fill(255);
  textSize(24);
  text("← BACK", width / 2, backBtnY);

  pop();
  rectMode(CORNER);
}