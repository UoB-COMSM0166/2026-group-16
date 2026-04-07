// ------------ WEAPONS --------------------------------------------
// Weapon definitions: each weapon has unique projectile behaviour.
// The WEAPONS class tracks which weapon is active for a given player
// and exposes helpers used by spawnProjectile and the draw layer.

const WEAPON_DEFS = [
  {
    id: "pan",
    label: "Pan",
    imgKey: "weapon_pan",
    damage: 15,
    radius: 12,
    powerScale: 8,
    maxBounces: 3,
    count: 1,          // how many projectiles spawned per shot
    spreadDeg: 0,      // angular spread between multi-shot pellets (degrees)
    special: null,
  },
  {
    id: "bomb",
    label: "Bomb",
    imgKey: "weapon_bomb",
    damage: 30,
    radius: 18,
    powerScale: 7,
    maxBounces: 0,     // explodes on first hit — no bouncing
    count: 1,
    spreadDeg: 0,
    special: "explode",  // large blast, extra damage shown as float text
  },
  {
    id: "boomerang",
    label: "Boomerang",
    imgKey: "weapon_boomerang",
    damage: 12,
    radius: 11,
    powerScale: 7,
    maxBounces: 5,     // comes back-ish via many bounces
    count: 1,
    spreadDeg: 0,
    special: "boomerang", // reversed wind drag
  },
  {
    id: "cannon",
    label: "Cannon",
    imgKey: "weapon_cannon",
    damage: 25,
    radius: 16,
    powerScale: 10,
    maxBounces: 1,
    count: 1,
    spreadDeg: 0,
    special: null,
  },
  {
    id: "dagger",
    label: "Dagger",
    imgKey: "weapon_dagger",
    damage: 10,
    radius: 8,
    powerScale: 9,
    maxBounces: 2,
    count: 1,
    spreadDeg: 0,
    special: null,
  },
  {
    id: "doubletap",
    label: "Double Tap",
    imgKey: "weapon_doubletap",
    damage: 12,
    radius: 11,
    powerScale: 8,
    maxBounces: 2,
    count: 2,          // fires 2 projectiles
    spreadDeg: 8,
    special: null,
  },
  {
    id: "ghost",
    label: "Ghost",
    imgKey: "weapon_ghost",
    damage: 18,
    radius: 14,
    powerScale: 7,
    maxBounces: 4,
    count: 1,
    spreadDeg: 0,
    special: "ghost",  // ignores walls (passes through static bodies)
  },
  {
    id: "ice",
    label: "Ice Shard",
    imgKey: "weapon_ice",
    damage: 15,
    radius: 12,
    powerScale: 9,
    maxBounces: 3,
    count: 1,
    spreadDeg: 0,
    special: "ice",    // slow-down effect message on hit
  },
  {
    id: "poison",
    label: "Poison",
    imgKey: "weapon_poison",
    damage: 10,
    radius: 13,
    powerScale: 7,
    maxBounces: 1,
    count: 1,
    spreadDeg: 0,
    special: "poison", // extra DoT visual message
  },
  {
    id: "triple",
    label: "Triple Arrow",
    imgKey: "weapon_triple",
    damage: 10,
    radius: 9,
    powerScale: 9,
    maxBounces: 1,
    count: 3,
    spreadDeg: 10,
    special: null,
  },
];

// ── WEAPONS selector ─────────────────────────────────────────────
class WEAPONS {
  constructor() {
    this.list  = WEAPON_DEFS;
    this.index = 0;   // active weapon index
  }

  get current() { return this.list[this.index]; }
  get count()   { return this.list.length; }

  next() { this.index = (this.index + 1) % this.count; }
  prev() { this.index = (this.index + this.count - 1) % this.count; }

  // Cycle with key codes (called from keyPressed in sketch.js)
  // player1: Q = prev (81), E = next (69)
  // player2: I = prev (73), P = next (80)
  handleKey(code, role) {
    if (role === "player") {
      if (code === 81) this.prev();   // Q
      if (code === 69) this.next();   // E
    } else if (role === "dog") {
      if (code === 73) this.prev();   // I
      if (code === 80) this.next();   // P
    }
  }
}

// ── WEAPON SELECT SCREEN ─────────────────────────────────────────
// Draws a full weapon selection screen for one or both players.
// Call drawWeaponSelectScreen() from draw() when gameState === "WEAPON_SELECT"
//
// Layout:
//   Single-player: full-width panel for the human player only (P1)
//   Dual-player:   left half = P1, right half = P2

function drawWeaponSelectScreen() {
  resetMatrix();
  // Dark overlay on whatever bg we have
  if (imgBg) drawImageCover(imgBg, 0, 0, 1600, 900);
  push();
  fill(0, 0, 0, 200); noStroke();
  rect(0, 0, 1600, 900);
  pop();

  const isDual  = (gameMode === "DUAL");
  const panels  = isDual ? 2 : 1;
  const panelW  = 1600 / panels;

  // Title
  push();
  textAlign(CENTER, CENTER);
  fill(255, 220, 50); textSize(52); noStroke();
  text("⚔ Choose Your Weapon", 1600 / 2, 52);
  pop();

  const COLS = 5, ROWS = 2;
  const CELL  = 78, GAP = 12;
  const GRID_W = COLS * CELL + (COLS - 1) * GAP;
  const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;

  for (let p = 0; p < panels; p++) {
    const weaponsObj = (p === 0) ? playerWeapons : dogWeapons;
    const role       = (p === 0) ? "P1" : "P2";
    const playerName = (p === 0) ? LABELS.player : LABELS.target;
    const panelCX    = panelW * p + panelW / 2;

    // Panel label
    push();
    textAlign(CENTER, CENTER); fill(200, 220, 255); textSize(26); noStroke();
    text(`${role} — ${playerName}`, panelCX, 110);
    pop();

    // Sub-hint
    push();
    textAlign(CENTER, CENTER); fill(170, 170, 170); textSize(15); noStroke();
    if (p === 0) text("Click to select  •  Q / E to cycle in game", panelCX, 138);
    else         text("Click to select  •  I / P to cycle in game",  panelCX, 138);
    pop();

    // Weapon grid
    const gridX = panelCX - GRID_W / 2;
    const gridY = 165;

    for (let i = 0; i < WEAPON_DEFS.length; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx  = gridX + col * (CELL + GAP) + CELL / 2;
      const cy  = gridY + row * (CELL + GAP) + CELL / 2;
      const wx  = cx - CELL / 2, wy = cy - CELL / 2;
      const sel = (weaponsObj.index === i);
      const hov = (mouseX > wx && mouseX < wx + CELL && mouseY > wy && mouseY < wy + CELL);
      const def = WEAPON_DEFS[i];
      const img = weaponImages[def.imgKey];

      push();
      // Cell background
      fill(0, 0, 0, 140); noStroke();
      rect(wx + 3, wy + 3, CELL, CELL, 14);

      if (sel) {
        fill(255, 200, 0); stroke(255, 255, 100); strokeWeight(3);
      } else if (hov) {
        fill(60, 80, 140); stroke(150, 180, 255); strokeWeight(2);
      } else {
        fill(30, 30, 60); stroke(80, 80, 120); strokeWeight(1);
      }
      rect(wx, wy, CELL, CELL, 12);

      // Weapon image
      if (img) {
        const imgPad = 14;
        drawContain(img, wx + imgPad, wy + imgPad, CELL - imgPad * 2, CELL - imgPad * 2 - 22);
      }

      // Weapon label
      noStroke();
      fill(sel ? color(30, 30, 0) : color(220, 220, 255));
      textSize(11); textAlign(CENTER, BOTTOM);
      text(def.label, cx, wy + CELL - 5);

      // Selected checkmark
      if (sel) {
        fill(255, 220, 0); textSize(18); textAlign(RIGHT, TOP);
        text("✓", wx + CELL - 4, wy + 3);
      }
      pop();
    }

    // Selected weapon info box
    const selDef = weaponsObj.current;
    const infoY  = gridY + GRID_H + 18;
    push();
    fill(0, 0, 0, 160); noStroke();
    rect(panelCX - 240, infoY, 480, 130, 14);
    stroke(255, 200, 0); strokeWeight(1.5); noFill();
    rect(panelCX - 240, infoY, 480, 130, 14);

    const selImg = weaponImages[selDef.imgKey];
    if (selImg) {
      push(); imageMode(CENTER);
      drawContain(selImg, panelCX - 220, infoY + 15, 80, 80);
      pop();
    }

    noStroke();
    fill(255, 220, 50); textSize(20); textAlign(LEFT, TOP);
    text(`★ ${selDef.label}`, panelCX - 130, infoY + 12);
    fill(200, 220, 255); textSize(13);
    text(`Damage: ${selDef.damage}   Bounces: ${selDef.maxBounces}   Shots: ${selDef.count}`, panelCX - 130, infoY + 42);
    text(`Speed scale: ×${selDef.powerScale}   Spread: ${selDef.spreadDeg}°`, panelCX - 130, infoY + 62);
    if (selDef.special) {
      fill(180, 255, 180);
      text(`✦ Special: ${selDef.special}`, panelCX - 130, infoY + 82);
    }
    pop();
  }

  // ── Confirm button ──────────────────────────────────────────────
  const confirmY = 760;
  const cfW = 260, cfH = 52;
  const cfX = 1600 / 2 - cfW / 2;
  const cfHov = (mouseX > cfX && mouseX < cfX + cfW && mouseY > confirmY && mouseY < confirmY + cfH);
  push();
  fill(0, 0, 0, 140); noStroke();
  rect(cfX + 3, confirmY + 3, cfW, cfH, 16);
  fill(cfHov ? color(60, 200, 80) : color(40, 160, 60)); noStroke();
  rect(cfX, confirmY, cfW, cfH, 16);
  fill(255); textSize(24); textAlign(CENTER, CENTER); textStyle(BOLD);
  text("▶  CONFIRM", 1600 / 2, confirmY + cfH / 2 + 1);
  textStyle(NORMAL);
  pop();

  // Back button
  const bkW = 150, bkH = 44;
  const bkX = 1600 / 2 - bkW / 2;
  const bkYY = confirmY + cfH + 16;
  push();
  fill(0, 0, 0, 120); noStroke(); rect(bkX + 3, bkYY + 3, bkW, bkH, 14);
  fill(80, 80, 100); rect(bkX, bkYY, bkW, bkH, 14);
  fill(255); textSize(18); textAlign(CENTER, CENTER); noStroke();
  text("← BACK", bkX + bkW / 2, bkYY + bkH / 2);
  pop();

  // Divider for dual mode — stops above the Confirm button
  if (isDual) {
    push();
    stroke(100, 100, 160); strokeWeight(1.5);
    line(800, 90, 800, 745);
    pop();
  }
}

// ── MODE SELECT SCREEN ───────────────────────────────────────────
function drawModeScreen() {
  resetMatrix();
  if (imgBgFantasy) drawImageCover(imgBgFantasy, 0, 0, 1600, 900);
  push();
  fill(0, 0, 0, 200); noStroke(); rect(0, 0, 1600, 900);
  pop();

  push();
  textAlign(CENTER, CENTER); noStroke();
  fill(255, 220, 50); textSize(60);
  text("Select Mode", 1600 / 2, 200);
  pop();

  const modes = [
    { label: "👤  Single Player", sub: "You vs AI", id: "SINGLE" },
    { label: "👥  Dual Player",   sub: "Player vs Player", id: "DUAL"   },
  ];

  const bW = 380, bH = 90, gap = 30;
  const startY = 900 / 2 - (bH * 2 + gap) / 2 + bH / 2;

  for (let i = 0; i < modes.length; i++) {
    const cx = 1600 / 2, cy = startY + i * (bH + gap);
    const hov = (mouseX > cx - bW/2 && mouseX < cx + bW/2 &&
                 mouseY > cy - bH/2 && mouseY < cy + bH/2);
    push();
    fill(0, 0, 0, 140); noStroke(); rect(cx - bW/2 + 4, cy - bH/2 + 4, bW, bH, 18);
    fill(hov ? color(80, 120, 200) : color(40, 60, 120));
    stroke(hov ? color(200, 220, 255) : color(80, 80, 160)); strokeWeight(2);
    rect(cx - bW/2, cy - bH/2, bW, bH, 18);
    noStroke();
    fill(255); textSize(32); textAlign(CENTER, CENTER); textStyle(BOLD);
    text(modes[i].label, cx, cy - 10);
    textStyle(NORMAL); fill(200, 200, 255); textSize(16);
    text(modes[i].sub, cx, cy + 22);
    pop();
  }

  // Back
  const bkW = 150, bkH = 44, bkX = 1600/2 - bkW/2, bkYY = 820;
  push();
  fill(0,0,0,120); noStroke(); rect(bkX+3, bkYY+3, bkW, bkH, 14);
  fill(80,80,100); rect(bkX, bkYY, bkW, bkH, 14);
  fill(255); textSize(18); textAlign(CENTER, CENTER); noStroke();
  text("← BACK", bkX + bkW/2, bkYY + bkH/2);
  pop();
}