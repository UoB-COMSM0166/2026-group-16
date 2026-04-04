// RENDERING HELPERS 

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

// AIM TRAJECTORY (shared)
function _drawAimBase(ch, aObj, pObj, dotCol) {
  const fromX = ch.x + ch.w * (ch.facing === 1 ? 0.9 : 0.1);
  const fromY = ch.y + ch.h * 0.35;
  const speed = pObj.value * 8;
  const a     = aObj.angleRad;
  let vx = Math.cos(a) * speed, vy = -Math.sin(a) * speed;
  let px = fromX, py = fromY;

  const DOT_GAP  = 28;
  const simStep  = 0.016;
  const maxSteps = 800;

  const isMedium = selectedDifficulty === "MEDIUM";
  let totalDist = 0;
  if (isMedium) {
    let tvx = vx, tvy = vy, tpx = px, tpy = py;
    for (let i = 0; i < maxSteps; i++) {
      const ox = tpx, oy = tpy;
      tvx += 50 * simStep; tvy += 900 * simStep;
      tpx += tvx * simStep; tpy += tvy * simStep;
      if (tpx < -200 || tpx > 1800 || tpy > 960) break;
      totalDist += Math.sqrt((tpx-ox)*(tpx-ox) + (tpy-oy)*(tpy-oy));
    }
  }
  const arcLimit = isMedium ? totalDist * 0.5 : Infinity;

  const SKIP_DIST = 40;
  let skipped  = false;
  let skipAcc  = 0;
  let distAcc  = 0;
  let arcTravelled = 0;

  const pulse = 0.5 + 0.5 * Math.sin(millis() * 0.006);

  push();
  noStroke();

  for (let i = 0; i < maxSteps; i++) {
    const prevX = px, prevY = py;
    vx += 50  * simStep;
    vy += 900 * simStep;
    px += vx  * simStep;
    py += vy  * simStep;

    if (px < -200 || px > 1800 || py > 960) break;

    const dx = px - prevX, dy = py - prevY;
    const stepDist = Math.sqrt(dx * dx + dy * dy);

    if (!skipped) {
      skipAcc += stepDist;
      if (skipAcc >= SKIP_DIST) skipped = true;
      continue;
    }

    arcTravelled += stepDist;
    if (arcTravelled > arcLimit) break;

    distAcc += stepDist;
    if (distAcc >= DOT_GAP) {
      distAcc = 0;
      const t = Math.min(arcTravelled / (isMedium ? arcLimit : (totalDist || 1200)), 1);
      const alpha = lerp(255, 80, t);
      const r     = lerp(7, 3.5, t) + pulse * 1.5;
      fill(...dotCol, alpha);
      ellipse(px, py, r * 2, r * 2);
    }
  }
  pop();
}

function drawAimTrajectory(ch, angleObj, powerObj) {
  if (!powerObj.isCharging) return;
  if (selectedDifficulty === "HARD") return;
  _drawAimBase(ch, angleObj, powerObj, [255, 220, 50]);
}

function drawAimTrajectoryDog(ch, angleObj, powerObj) {
  if (!powerObj.isCharging) return;
  if (selectedDifficulty === "HARD") return;
  _drawAimBase(ch, angleObj, powerObj, [255, 140, 40]);
}

//  HEALTH BARS 
function drawHealthBars() {
  const HUD_Y = 10, HUD_H = 52, MARGIN = 18, GAP = 120;
  const BAR_W = (1600 / 2) - MARGIN - GAP / 2, BAR_H = 38;
  const BAR_Y = HUD_Y + (HUD_H - BAR_H) / 2, BORD = 5, R = 6;

  push(); noStroke();

  function drawFighterBar(label, hp, side) {
    const pct = clamp(hp / 100, 0, 1);
    const barX = side === "left" ? MARGIN : 1600 / 2 + GAP / 2;
    fill(255,200,0); rect(barX-BORD, BAR_Y-BORD, BAR_W+BORD*2, BAR_H+BORD*2, R+BORD);
    fill(140,0,0);   rect(barX-2, BAR_Y-2, BAR_W+4, BAR_H+4, R+2);
    fill(20,0,0);    rect(barX, BAR_Y, BAR_W, BAR_H, R);
    const fillW = BAR_W * pct;
    const fillX = side === "left" ? barX : barX + BAR_W - fillW;
    fill(255,0,0,70);      rect(fillX-2, BAR_Y-2, fillW+4, BAR_H+4, R);
    fill(220,20,20);       rect(fillX, BAR_Y, fillW, BAR_H, R);
    fill(255,120,120,120); rect(fillX, BAR_Y+3, fillW, BAR_H*0.28, R);
    fill(255,240,180); noStroke(); textSize(17); textStyle(BOLD);
    if (side === "left") { textAlign(LEFT,CENTER);  text(label, barX+10, BAR_Y+BAR_H/2+1); }
    else                 { textAlign(RIGHT,CENTER); text(label, barX+BAR_W-10, BAR_Y+BAR_H/2+1); }
  }

  const vsX = 1600/2, vsY = BAR_Y + BAR_H/2;
  fill(255,200,0); ellipse(vsX, vsY, GAP-10, HUD_H+8);
  fill(140,0,0);   ellipse(vsX, vsY, GAP-20, HUD_H-4);
  fill(255,220,50); textAlign(CENTER,CENTER); textSize(22); textStyle(BOLD);
  text("VS", vsX, vsY+1);
  drawFighterBar(LABELS.player, catHP, "left");
  drawFighterBar(LABELS.target, dogHP, "right");
  textStyle(NORMAL); pop();
}

// SHARED: Back Button 
function drawBackBtn(y) {
  fill(0,0,0,120); rect(1600/2+3, y+3, 150, 50, 20);
  fill(150,150,150); rect(1600/2, y, 150, 50, 20);
  fill(255); textSize(24); text("← BACK", 1600/2, y);
}

//  SHARED: Character Card
function drawCharCard(cx, cardW, cardH, charImg, flipImg, label, desc1, desc2, hoverCol, idleCol) {
  fill(0,0,0,150); rect(cx+6, 900/2+6, cardW, cardH, 20);
  let hovered = hitRect(cx, 900/2, cardW, cardH);
  fill(...(hovered ? hoverCol : idleCol)); rect(cx, 900/2, cardW, cardH, 20);
  let imgSize = 180;
  push(); imageMode(CENTER);
  if (charImg) {
    if (flipImg) {
      push(); translate(cx, 900/2-60); scale(-1,1);
      drawContain(charImg, -imgSize/2, -imgSize/2, imgSize, imgSize); pop();
    } else {
      drawContain(charImg, cx-imgSize/2, 900/2-150, imgSize, imgSize);
    }
  }
  pop();
  fill(255); textSize(36); text(label, cx, 900/2+50);
  textSize(18); fill(220,220,220);
  text(desc1, cx, 900/2+90); text(desc2, cx, 900/2+120);
}

function drawCharSprite(ch, img, flipWhen) {
  push();
  if (ch.facing === flipWhen) {
    translate(ch.x + ch.w, 0); scale(-1,1);
    drawContain(img, 0, ch.y, ch.w, ch.h);
  } else {
    drawContain(img, ch.x, ch.y, ch.w, ch.h);
  }
  pop();
}