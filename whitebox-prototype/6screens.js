// PLAY SCREEN 
function drawPlayScreen() {
  resetMatrix();
  const dt = Math.min(deltaTime / 1000, 0.033);

  // --- TIMER ---
  if (!timerRunning) timerRunning = true;
  if (timerRunning && catHP > 0 && dogHP > 0) {
    gameTimer -= dt;
    if (gameTimer <= 0) {
      if (catHP === dogHP) {
        // Tied — add 15s overtime immediately, keep playing silently
        gameTimer = 15;
        overtimeActive = true;
      } else {
        gameTimer = 0; // time's up, winner = higher HP
      }
    }
  }

  const timeUp = gameTimer <= 0 && catHP !== dogHP;
  const gameOver = catHP <= 0 || dogHP <= 0 || timeUp;

  if (!gameOver) {
    player.controllable = true; dogBody.controllable = true;
    angleObj.update(); powerObj.update(dt);
    ciyangAngleObj.update(); ciyangPowerObj.update(dt);
    cd._updateCharacter(player, dt, angleObj);
    cd._updateCharacter(dogBody, dt, ciyangAngleObj);

    // ── Player 1 fires ───────────────────────────────────────────
    if (powerObj.justReleased && powerObj.value > 10) {
      const fromX = player.x + player.w * (player.facing === 1 ? 0.9 : 0.1);
      const fromY = player.y + player.h * 0.35;
      const wDef  = playerWeapons.current;
      _spawnWeaponShot(fromX, fromY, angleObj, powerObj, "player", wDef);
    }

    // ── Player 2 / AI fires ──────────────────────────────────────
    if (gameMode === "SINGLE") {
      // AI: simple logic — charge then fire when facing player
      _updateAI(dt);
    }
    if (ciyangPowerObj.justReleased && ciyangPowerObj.value > 10) {
      const fromX = dogBody.x + dogBody.w * (dogBody.facing === 1 ? 0.9 : 0.1);
      const fromY = dogBody.y + dogBody.h * 0.35;
      const wDef  = dogWeapons.current;
      _spawnWeaponShot(fromX, fromY, ciyangAngleObj, ciyangPowerObj, "dog", wDef);
    }

    for (const p of cd.projectiles) if (p.alive) cd._updateProjectile(p, dt);
    cd.projectiles = cd.projectiles.filter(p => p.alive);
    cd.floatTexts.forEach(t => { t.y += t.vy * dt; t.life -= dt; });
    cd.floatTexts = cd.floatTexts.filter(t => t.life > 0);
  }

  // DRAW 
  drawImageCover(imgBg, 0, 0, 1600, 900);

  noStroke(); fill(101, 67, 33, 220);
  rect(0, GROUND_Y - 5, 1600, 60);

  // Wall pillar — visual only, no collision
  if (imgWall) {
    image(imgWall, 750, GROUND_Y - 200, 100, 200);
  }

  // Mattew sprite (faces RIGHT naturally, flip when facing=-1)
  drawCharSprite(dogBody, imgTarget, -1);
  drawHeadLabel(LABELS.target, dogBody.x + dogBody.w / 2, dogBody.y);

  drawAimTrajectory(player, angleObj, powerObj);
  drawAimTrajectoryDog(dogBody, ciyangAngleObj, ciyangPowerObj);

  // Cat sprite (faces RIGHT naturally, flip when facing=-1)
  drawCharSprite(player, imgPlayer, -1);
  drawHeadLabel(LABELS.player, player.x + player.w / 2, player.y);

  // Projectiles — use the weapon image stored on each projectile
  for (const p of cd.projectiles) {
    if (!p.alive) continue;
    push(); translate(p.x, p.y); rotate(Math.atan2(p.vy, p.vx));
    const pImg = (p.weaponImg) ? p.weaponImg : imgPan;
    drawContain(pImg, -p.r * 4, -p.r * 3.1, p.r * 8, p.r * 6.2);
    pop();
  }

  // Float texts
  fill(255, 50, 50); textSize(26); textAlign(CENTER);
  for (const t of cd.floatTexts) text(t.text, t.x, t.y);

  // HUD - top corners, under health bar (~72px tall)
  push();
  noStroke();

  // Player 1 HUD (top-left) — shows weapon icon + cycle hint
  const pw1 = playerWeapons.current;
  const pw1Img = weaponImages[pw1.imgKey];
  fill(0, 0, 0, 140); rect(8, 74, 260, 70, 6);
  // Weapon icon
  if (pw1Img) { push(); imageMode(CORNER); drawContain(pw1Img, 12, 77, 36, 36); pop(); }
  fill(200, 230, 255); textAlign(LEFT, TOP); textSize(13);
  text(`${LABELS.player} | Angle: ${angleObj.angleDeg.toFixed(0)}°  Power: ${powerObj.value.toFixed(0)}`, 55, 79);
  fill(255, 210, 80); textSize(11);
  text(`⚔ ${pw1.label}  ↩${pw1.maxBounces}  (Q / E to change)`, 55, 96);
  fill(170, 170, 170); textSize(11);
  text("A/D move  W/S aim  F fire", 55, 109);
  text("Hold F to charge, release to fire", 55, 122);

  // Player 2 / AI HUD (top-right) — shows weapon icon + cycle hint
  const pw2 = dogWeapons.current;
  const pw2Img = weaponImages[pw2.imgKey];
  fill(0, 0, 0, 140); rect(1600 - 268, 74, 260, 70, 6);
  if (pw2Img) { push(); imageMode(CORNER); drawContain(pw2Img, 1600 - 50, 77, 36, 36); pop(); }
  fill(255, 220, 180); textAlign(RIGHT, TOP); textSize(13);
  text(`Angle: ${ciyangAngleObj.angleDeg.toFixed(0)}°  Power: ${ciyangPowerObj.value.toFixed(0)} | ${LABELS.target}`, 1600 - 55, 79);
  fill(255, 210, 80); textSize(11);
  if (gameMode === "DUAL") {
    text(`⚔️ ${pw2.label} - ${pw2.maxBounces}  (I / P to change)`, 1600 - 55, 96);
  } else {
    text(`⚔️ ${pw2.label} - ${pw2.maxBounces}  (AI)`, 1600 - 55, 96);
  }
  fill(170, 170, 170); textSize(11);
  text("←/→ move  ↑/↓ aim  Space fire", 1600 - 55, 109);
  text("Hold Space to charge, release", 1600 - 55, 122);

  pop();

  drawHealthBars();

  // TIMER — sits below the health bar, centred
  {
    const secs = Math.ceil(Math.max(gameTimer, 0));
    const isLow = secs <= 10 && !overtimeActive;
    const pulse = isLow ? (0.5 + 0.5 * Math.sin(millis() * 0.01)) : 0;
    const timerX = 1600 / 2;
    const timerY = 82;
    const boxW = overtimeActive ? 210 : 130;
    const boxH = overtimeActive ? 46 : 38;

    push(); rectMode(CENTER); textAlign(CENTER, CENTER);
    fill(0, 0, 0, 120); rect(timerX + 3, timerY + 3, boxW, boxH, 10);
    if (overtimeActive) fill(160, 80, 0, 230);
    else if (isLow) fill(lerp(60, 180, pulse), 0, 0, 230);
    else fill(20, 20, 40, 210);
    stroke(255, 220, 50); strokeWeight(2);
    rect(timerX, timerY, boxW, boxH, 10);
    noStroke();
    if (overtimeActive) {
      fill(255, 180, 50); textSize(12); text("OVERTIME", timerX, timerY - 9);
      fill(255, 230, 100); textSize(20); text(secs + "s", timerX, timerY + 10);
    } else {
      fill(isLow ? color(255, lerp(80, 255, pulse), 80) : color(255, 220, 50));
      textStyle(BOLD); textSize(22);
      const m = Math.floor(secs / 60), s2 = secs % 60;
      text((m > 0 ? m + ":" : "") + (s2 < 10 && m > 0 ? "0" : "") + s2, timerX, timerY + 1);
    }
    textStyle(NORMAL); pop();
  }

  // BACK BUTTON — bottom-centre, always visible and clickable
  push(); rectMode(CORNER);
  const bkX = 1600 / 2 - 75, bkY = 860, bkW2 = 150, bkH2 = 44;
  fill(0, 0, 0, 120); noStroke(); rect(bkX + 3, bkY + 3, bkW2, bkH2, 14);
  fill(80, 80, 100); rect(bkX, bkY, bkW2, bkH2, 14);
  fill(255); textSize(18); textAlign(CENTER, CENTER); noStroke();
  text("← BACK", bkX + bkW2 / 2, bkY + bkH2 / 2);
  pop();

  // WIN OVERLAY
  if (gameOver) {
    let winnerIsRish;
    if (catHP <= 0) winnerIsRish = false;
    else if (dogHP <= 0) winnerIsRish = true;
    else winnerIsRish = catHP > dogHP; // time up

    const winnerName = winnerIsRish ? LABELS.player : LABELS.target;
    const winnerHP = winnerIsRish ? catHP : dogHP;
    const winnerImg = winnerIsRish ? imgPlayer : imgTarget;

    push(); fill(0, 0, 0, 180); rect(0, 0, 1600, 900);
    const px = 1600 / 2, py = 900 / 2 - 60, ps = 200;
    drawContain(winnerImg, px - ps / 2, py - ps / 2, ps, ps);
    textAlign(CENTER, CENTER);
    textSize(72); fill(255, 220, 50); stroke(0); strokeWeight(4);
    text(`🏆 ${winnerName} Wins!`, 1600 / 2, py + ps / 2 + 30);
    noStroke(); textSize(28); fill(180, 255, 180);
    text(`Remaining HP: ${winnerHP}`, 1600 / 2, py + ps / 2 + 100);

    // Play Again button
    const paW = 240, paH = 56, paX = 1600 / 2 - paW / 2, paY = py + ps / 2 + 145;
    const paHover = mouseX > paX && mouseX < paX + paW && mouseY > paY && mouseY < paY + paH;
    fill(0, 0, 0, 140); rect(paX + 4, paY + 4, paW, paH, 16);
    fill(paHover ? color(60, 200, 80) : color(40, 160, 60)); rect(paX, paY, paW, paH, 16);
    fill(255); textSize(26); textStyle(BOLD);
    text("🔄 Play Again", 1600 / 2, paY + paH / 2 + 1);
    textStyle(NORMAL);

    // Back to menu button
    const bmW = 200, bmH = 44, bmX = 1600 / 2 - bmW / 2, bmY = paY + paH + 16;
    const bmHover = mouseX > bmX && mouseX < bmX + bmW && mouseY > bmY && mouseY < bmY + bmH;
    fill(0, 0, 0, 120); rect(bmX + 3, bmY + 3, bmW, bmH, 12);
    fill(bmHover ? color(100, 100, 160) : color(70, 70, 110)); rect(bmX, bmY, bmW, bmH, 12);
    fill(220); textSize(20);
    text("← Back to Menu", 1600 / 2, bmY + bmH / 2 + 1);

    pop();
  }
}

// ── Weapon-aware shot spawner ────────────────────────────────────
// Fires 1–3 projectiles based on the weapon definition.
// Each projectile carries a reference to its weapon image for rendering.
function _spawnWeaponShot(fromX, fromY, aObj, pObj, owner, wDef) {
  const count  = wDef.count || 1;
  const spread = wDef.spreadDeg || 0;
  const power  = pObj.consume();   // consume once, share value across shots
  const wImg   = weaponImages[wDef.imgKey] || imgPan;

  for (let i = 0; i < count; i++) {
    // Angle offset for multi-shot spread — centre the burst around base angle
    const offsetDeg = (count === 1) ? 0 : (i - (count - 1) / 2) * spread;
    const offsetRad = (offsetDeg * Math.PI) / 180;

    // Build a temporary angle object shifted by offsetRad — include direction for wind
    const shiftedAngle = {
      angleRad:  aObj.angleRad + offsetRad,
      angleDeg:  aObj.angleDeg + offsetDeg,
      direction: aObj.direction,   // +1 = firing right, -1 = firing left
    };

    // Fake a powerObj that returns the already-consumed value
    const fakePower = { consume() { return power; }, value: power };

    const p = cd.spawnProjectile({
      fromX, fromY,
      radius:     wDef.radius,
      angleObj:   shiftedAngle,
      powerObj:   fakePower,
      powerScale: wDef.powerScale,
      owner,
      maxBounces: wDef.maxBounces,
    });

    // Attach metadata for rendering and special effects
    p.weaponImg    = wImg;
    p.weaponId     = wDef.id;
    p.weaponDamage = wDef.damage;
    p.special      = wDef.special;

    // Ghost weapon: mark so collision skips static bodies
    if (wDef.special === "ghost") p.ghost = true;

    // Boomerang: negative wind drag (handled in _updateProjectile override in 8language.js)
    if (wDef.special === "boomerang") p.boomerang = true;
  }
}

// ── Minimal AI for Single Player mode ───────────────────────────
// The AI (dogBody / ciyangPowerObj) auto-charges and fires when facing the player.
let _aiTimer = 0;
function _updateAI(dt) {
  _aiTimer += dt;

  // Simple: always face the player
  const dir = (player.x < dogBody.x) ? -1 : 1;
  ciyangAngleObj.setDirection(dir);
  dogBody.facing = dir;

  // Aim at roughly the right angle
  const dx = player.x - dogBody.x;
  const dy = player.y - dogBody.y;
  const targetAngle = Math.abs(Math.atan2(-dy, Math.abs(dx)) * 180 / Math.PI);
  // Gradually nudge angle
  const diff = targetAngle - ciyangAngleObj.angleDeg;
  ciyangAngleObj.angleDeg += clamp(diff * dt * 2, -2, 2);
  ciyangAngleObj.angleDeg = clamp(ciyangAngleObj.angleDeg, 0, 80);

  // Charge and fire every 2.8 seconds
  if (_aiTimer < 2.0) {
    // Charge phase — simulate key held
    ciyangPowerObj.value = clamp(ciyangPowerObj.value + ciyangPowerObj.chargeRatePerSec * dt, 0, ciyangPowerObj.max);
    ciyangPowerObj.isCharging = true;
    ciyangPowerObj._wasCharging = true;
    ciyangPowerObj.justReleased = false;
  } else if (_aiTimer < 2.05) {
    // Release pulse
    ciyangPowerObj.isCharging = false;
    ciyangPowerObj.justReleased = true;
    ciyangPowerObj._wasCharging = false;
  } else {
    ciyangPowerObj.justReleased = false;
    if (_aiTimer > 2.8) _aiTimer = 0;
  }
}

// START SCREEN 
function drawStartScreen() {
  resetMatrix();
  drawImageCover(imgBgFantasy, 0, 0, 1600, 900);
  textSize(60); fill(0, 0, 0, 200); rect(0, 0, 1600, 900);

  fill(0, 0, 0, 150); textSize(70);
  text("MERCHANT FIGHTERS", 1600 / 2 + 4, 900 / 3 + 4);
  fill(255, 220, 50);
  text("MERCHANT FIGHTERS", 1600 / 2, 900 / 3);
  //fill(255); textSize(28);
  //text("Rish vs Ciyang", 1600 / 2, 900 / 3 + 70);

  fill(80, 200, 80); rect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 25);
  fill(255); textSize(36); 
  text("START", btnX, btnY);

  // Controls guide
  const s = 20, ico = 48, rY = 900 / 2 + 160, gap = 70;
  const lx = 1600 / 2 - 220, cx = 1600 / 2, rx = 1600 / 2 + 220;

  image(keyLeft, lx - s, rY, ico, ico); image(keyRight, lx + s, rY, ico, ico);
  fill(255); textSize(26); text("MOVE", cx, rY);
  image(keyA, rx - s, rY, ico, ico); image(keyD, rx + s, rY, ico, ico);

  image(keyUp, lx - s, rY + gap, ico, ico); image(keyDown, lx + s, rY + gap, ico, ico);
  fill(255); textSize(26); text("ADJUST ANGLE", cx, rY + gap);

  fill(255); textSize(22); text("HOLD SPACE TO CHARGE • RELEASE TO FIRE", cx, rY + gap * 2);
  push(); imageMode(CENTER); image(keySpace, cx, rY + gap * 2 + 50, 160, 40); pop();
}

// LEVEL SCREEN 
function drawLevelScreen() {
  resetMatrix();
  drawImageCover(imgBgFantasy, 0, 0, 1600, 900);
  fill(0, 0, 0, 200); rect(0, 0, 1600, 900);
  fill(255, 220, 50); textSize(70); text("Select Difficulty", 1600 / 2, 900 / 5);

  push(); rectMode(CENTER); textAlign(CENTER, CENTER); textStyle(BOLD);
  let bW = 320, bH = bW * 32 / 96, gap = 30;
  let startY = 900 / 2 + 20 - (bH * 3 + gap * 2) / 2 + bH / 2;
  let diffs = ["EASY", "MEDIUM", "HARD"];

  for (let i = 0; i < 3; i++) {
    let cx = 1600 / 2, cy = startY + i * (bH + gap);
    if (hitRect(cx, cy, bW, bH)) tint(200, 200, 255); else noTint();
    image(difficultyUI, cx - bW / 2, cy - bH / 2, bW, bH);
    noTint(); fill(255); stroke(0); strokeWeight(4); textSize(35);
    text(diffs[i], cx, cy); noStroke();
  }
  drawBackBtn(900 - 100);
  pop(); rectMode(CORNER); textStyle(NORMAL);
}