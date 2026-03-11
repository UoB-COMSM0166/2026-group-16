//testing for minor changes on github


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
  
  if (!powerObj.isCharging && powerObj.value <= 0 && selectedDifficulty=="DIFFICULT") return;

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
  if (powerObj.value <= 0 && selectedDifficulty=="DIFFICULT") return;

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
  fill('black');
  text("Merchant Fighters!", width/2, height/2-110);
  
  //Draw "Play" Button
  fill(100, 200, 100);
  rect(750, 225, 100, 50);
  fill(255);
  textSize(20);
  text("PLAY", width/2, 255);
}

//Helenlabel
// ─── LEVEL SCREEN ───────────────────────────────────────────────────────────── 
function drawLevelScreen(){
  drawImageCover(imgBg,0, 0, width, height);
  
  textSize(32);
  fill('black');
  text("Select Difficulty", width/2, 200);
  
  //Easy Button
  fill(200, 200, 100);
  rect(700, 300, 200, 50);
  
  //Difficult Button
  fill(500, 200, 100);
  rect(700, 500, 200, 50);
  
  fill(255);
  text("EASY",width/2, 330);
  text("DIFFICULT", width/2, 530);
  
}

//Helenlabel
// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function mousePressed(){
  if (gameState=="START"){
    //clicking within the area of play button
    //rect(750, 225, 100, 50);
    if (mouseX>750 && mouseX<850 &&mouseY>225 &&mouseY<275){
      gameState = "CHOOSE";
    }
  }else if(gameState=="CHOOSE"){
    //Easy Button
    if(mouseX>700 && mouseX<900 &&mouseY>300 &&mouseY<350){
       gameState="PLAY";
       selectedDifficulty="EASY";
    }
    //Difficult Button
    if(mouseX>700 && mouseX<900 &&mouseY>500 &&mouseY<550){
       gameState="PLAY";
       selectedDifficulty="DIFFICULT";
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

const GROUND_Y = 850;
function preload() {
  imgBg     = loadImage("bg.jpg");
  imgPlayer = loadImage("player.png");
  imgTarget = loadImage("target.png");
  imgPan    = loadImage("pan.png");
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
    if(selectedDifficulty=="DIFFICULT"){
      powerObj.difficultyAdjustment(200, 170);
      ciyangPowerObj.difficultyAdjustment(200, 170);
      cd.updateSpeed(player, 480);
      cd.updateSpeed(dogBody, 480);
    }
    drawPlayScreen();
  }
}

