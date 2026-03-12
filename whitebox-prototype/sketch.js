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

// ─── IMAGES ───────────────────────────────────────────────────────────────────
let imgBg, imgPlayer, imgTarget, imgPan;
let keyA, keyD, keyUp, keyDown, keyLeft, keyRight, keySpace;
let difficultyUI;

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
  
  if (!powerObj.isCharging && powerObj.value <= 0 && selectedDifficulty=="HARD") return;

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

// ─── AIM TRAJECTORY (CIYANG / DOG) ───────────────────────────────────────────
function drawAimTrajectoryDog(ch, angleObj, powerObj) {
  if (powerObj.value <= 0 && selectedDifficulty=="HARD") return;

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

// ─── PLAY SCREEN ──────────────────────────────────────────────────────────────
function drawPlayScreen(){
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

//Helenlabel  
// ─── START SCREEN ─────────────────────────────────────────────────────────────
function drawStartScreen(){
  drawImageCover(imgBg,0, 0, width, height);

  textSize(60);
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);

  //text shadow
  fill(0, 0, 0, 150);
  textSize(90);
  text("🐱 MERCHANT FIGHTER 🐶", width / 2 + 6, height / 3 + 6);

  //main title
  fill(255, 220, 50);
  text("🐱 MERCHANT FIGHTER 🐶", width / 2, height / 3);

  //subtitle
  fill(255);
  textSize(30);
  text("Rish vs Ciyang", width / 2, height / 3 + 80);


  // shadow
  fill(80, 200, 80);
  rect(btnX -btnW/2, btnY - btnH/2, btnW, btnH, 25);

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

  const row4Y = row3Y + 50;
  push();
  imageMode(CENTER);
  image(keySpace, centerZoneX, row4Y, 160, 40);
  pop();
}

//Helenlabel
// ─── LEVEL SCREEN ───────────────────────────────────────────────────────────── 
function drawLevelScreen(){
  drawImageCover(imgPlayScreen, 0, 0, width, height);

  //background overlay
  fill(0, 0, 0, 200);
  rect(0,0,width , height);

  //title
  fill(255, 220, 50);
  textSize(70);
  text("Select Difficulty", width / 2, height / 5);

    push()
    rectMode(CENTER);
    textAlign(CENTER, CENTER);
    textStyle(BOLD); //pixelated looks?

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

//Helenlabel
// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function mousePressed(){
  if (gameState=="START"){
    if (mouseX>btnX -btnW/2 && mouseX<btnX +btnW/2 &&mouseY>btnY - btnH/2 &&mouseY<btnY + btnH/2){
      gameState = "CHOOSE";
    }
  }else if(gameState=="CHOOSE") {
      let backBtnY = height - 100;
      let backBtnW = 150;
      let backBtnH = 50;
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
              selectedDifficulty = difficulties[i];
              gameState = "PLAY";
              break;
          }
      }
      if (mouseX > width / 2 - backBtnW / 2 && mouseX < width / 2 + backBtnW / 2 &&
          mouseY > backBtnY - backBtnH / 2 && mouseY < backBtnY + backBtnH / 2) {
          gameState = "START";
          return;
      }
  }

}

// ─── GLOBALS ──────────────────────────────────────────────────────────────────
let cd, angleObj, powerObj, player, dogBody;
let catHP = 100;
let dogHP = 100;
let ciyangAngleObj, ciyangPowerObj;

//Helenlabel
//for navigation of the screen: START/ CHOOSE/ PLAY
let gameState = "START"; 
//EASY/ DIFFICULT
let selectedDifficulty ="";
let width= 1600;
let height = 900;

// ===== START BUTTON =====
let btnX = width / 2;
let btnY = height / 2 + 40;
let btnW = 260;
let btnH = 80;

const GROUND_Y = 850;
function preload() {
  imgBg     = loadImage("bg.jpg");
  imgPlayScreen = loadImage("assets/images/battle_scene-0.png");
  imgPlayer = loadImage("player.png");
  imgTarget = loadImage("target.png");
  imgPan    = loadImage("pan.png");

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
  textAlign(CENTER,CENTER);
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
    max: 130,
    chargeRatePerSec: 90,
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
    max: 145,
    chargeRatePerSec: 90,
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
  
  if(gameState=="START"){
    drawStartScreen();
  }else if(gameState=="CHOOSE"){
    drawLevelScreen();
  }else{
    //difficulty adjustment
    if(selectedDifficulty=="HARD"){
      powerObj.difficultyAdjustment(200, 170);
      ciyangPowerObj.difficultyAdjustment(200, 170);
      cd.updateSpeed(player, 480);
      cd.updateSpeed(dogBody, 480);
    } //pending for implementation for the medium level
    drawPlayScreen();
  }
}

