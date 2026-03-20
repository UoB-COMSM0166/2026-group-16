// ---------- COLLISION DETECTION --------------------------
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
          tryPlaySound(sndHit);
        } else if (ch.tag === "player") {
          catHP = Math.max(0, catHP - 15);
          this.floatTexts.push({ x: ch.x + ch.w / 2, y: ch.y - 20, vy: -50, life: 1.2,
            text: catHP <= 0 ? "Rish defeated! 💀" : "-15 HP!" });
          tryPlaySound(sndHit);
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

  updateSpeed(ch, speed) {
    ch.speed = speed;
  }
}