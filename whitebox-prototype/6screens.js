// PLAY SCREEN 
function drawPlayScreen() {
  resetMatrix();
  const dt = Math.min(deltaTime / 1000, 0.033);

  // Run autoplayer so keys are set BEFORE POWER/ANGLE.update() reads them
  if (window.GAME_AUTO && GAME_AUTO.enabled) GAME_AUTO.update(dt);

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
    ciyangAngleObj.update();
    ciyangPowerObj.update(dt);
    // In SINGLE mode: if VKEY didn't press fire, the charge came from real Space — cancel it
    if (gameMode === "SINGLE" && window.VKEY && VKEY.enabled && !VKEY.isDown(ciyangPowerObj.fireKey)) {
      if (ciyangPowerObj.isCharging) {
        ciyangPowerObj.value = ciyangPowerObj.min;
        ciyangPowerObj.isCharging = false;
        ciyangPowerObj.justReleased = false;
        ciyangPowerObj._wasCharging = false;
      }
    }
    cd._updateCharacter(player, dt, angleObj);
    cd._updateCharacter(dogBody, dt, ciyangAngleObj);

    // ── Blackout elapsed counter ──────────────────────────────────
    blackoutElapsed += dt;

    // Trigger blackout at 20s (MEDIUM + HARD)
    if (!blackout1Done && blackoutElapsed >= 20 &&
      (selectedDifficulty === "MEDIUM" || selectedDifficulty === "HARD")) {
      blackout1Done = true;
      blackoutActive = true;
      blackoutTimer = 5;
    }
    // Trigger second blackout at 40s (HARD only)
    if (!blackout2Done && blackoutElapsed >= 40 && selectedDifficulty === "HARD") {
      blackout2Done = true;
      blackoutActive = true;
      blackoutTimer = 5;
    }
    // Count down active blackout
    if (blackoutActive) {
      blackoutTimer -= dt;
      if (blackoutTimer <= 0) {
        blackoutActive = false;
        blackoutTimer = 0;
      }
    }

    // ── Player 1 fires ───────────────────────────────────────────
    if (powerObj.justReleased && powerObj.value > 10) {
      const fromX = player.x + player.w * (player.facing === 1 ? 0.9 : 0.1);
      const fromY = player.y + player.h * 0.35;
      const wDef = playerWeapons.current;
      _spawnWeaponShot(fromX, fromY, angleObj, powerObj, "player", wDef);
    }

    // ── Player 2 / AI fires ──────────────────────────────────────
    if (gameMode === "SINGLE") {
      // weapon switching handled by AutoPlayer
    }
    if (ciyangPowerObj.justReleased && ciyangPowerObj.value > 10) {
      const fromX = dogBody.x + dogBody.w * (dogBody.facing === 1 ? 0.9 : 0.1);
      const fromY = dogBody.y + dogBody.h * 0.35;
      const wDef = dogWeapons.current;
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
  // In SINGLE mode draw robot stretched to fill the character box (same height as player)
  if (gameMode === "SINGLE" && imgTarget) {
    push();
    imageMode(CORNER);
    if (dogBody.facing === 1) {
      image(imgTarget, dogBody.x, dogBody.y, dogBody.w, dogBody.h);
    } else {
      translate(dogBody.x + dogBody.w, dogBody.y);
      scale(-1, 1);
      image(imgTarget, 0, 0, dogBody.w, dogBody.h);
    }
    pop();
  } else {
    drawCharSprite(dogBody, imgTarget, -1);
  }
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
  textFont(pixelFont);
  noStroke();

  // ── HUD boxes: both 320px wide, 72px tall, 8px from edge, y=74 ──
  const HUD_W = 320, HUD_H = 72, HUD_Y = 74;
  const ICO = 44;
  const p1X = 8;
  const p2X = 1600 - HUD_W - 8;

  const pw1 = playerWeapons.current;
  const pw2 = dogWeapons.current;
  const pw1Img = (weaponImages[pw1.imgKey] && weaponImages[pw1.imgKey].width > 4) ? weaponImages[pw1.imgKey] : imgPan;
  const pw2Img = (weaponImages[pw2.imgKey] && weaponImages[pw2.imgKey].width > 4) ? weaponImages[pw2.imgKey] : imgPan;
  const icoY = HUD_Y + (HUD_H - ICO) / 2;

  fill(0, 0, 0, 140); rect(p1X, HUD_Y, HUD_W, HUD_H, 6);
  imageMode(CORNER); image(pw1Img, p1X + 4, icoY, ICO, ICO);
  const t1 = p1X + 4 + ICO + 4;
  fill(200, 230, 255); textAlign(LEFT, TOP); textSize(13);
  text(`${LABELS.player} | Angle: ${angleObj.angleDeg.toFixed(0)}° | Power: ${powerObj.value.toFixed(0)}`, t1, HUD_Y + 5);
  fill(255, 210, 80); textSize(11);
  text(`⚔️ ${pw1.label} | Bounces: ${pw1.maxBounces} | Q/E - To change weapons`, t1, HUD_Y + 23);
  fill(170, 170, 170); textSize(11);
  text("A/D move   W/S aim   F fire", t1, HUD_Y + 38);
  text("Hold F to charge, release to fire", t1, HUD_Y + 52);

  // ── P2 box (top-right) — all text LEFT-aligned after icon ──
  fill(0, 0, 0, 140); rect(p2X, HUD_Y, HUD_W, HUD_H, 6);
  image(pw2Img, p2X + 4, icoY, ICO, ICO);
  const t2 = p2X + 4 + ICO + 4;
  fill(255, 220, 180); textAlign(LEFT, TOP); textSize(13);
  text(`${LABELS.target} | Angle: ${ciyangAngleObj.angleDeg.toFixed(0)}° | Power: ${ciyangPowerObj.value.toFixed(0)}`, t2, HUD_Y + 5);
  fill(255, 210, 80); textSize(11);
  if (gameMode === "DUAL") {
    text(`⚔️ ${pw2.label} | Bounces: ${pw2.maxBounces} | I/P - To change weapons`, t2, HUD_Y + 23);
  } else {
    text(`⚔️ ${pw2.label} | Bounces: ${pw2.maxBounces}`, t2, HUD_Y + 23);
  }
  fill(170, 170, 170); textSize(11);
  if (gameMode === "DUAL") {
    text("←/→ move   ↑/↓ aim   Space fire", t2, HUD_Y + 38);
    text("Hold Space to charge, release", t2, HUD_Y + 52);
  }

  pop();

  // ── BLACKOUT OVERLAY ──────────────────────────────────────────
  // Covers everything except the HUD elements drawn after this block
  if (blackoutActive) {
    push();
    fill(0, 0, 0, 255);
    noStroke();
    rect(0, 0, 1600, 900);

    // Power arc for Player 1
    if (powerObj.isCharging) {
      _drawAimBase(player, angleObj, powerObj, [255, 220, 50],
        (playerWeapons.current.gravityScale !== undefined ? playerWeapons.current.gravityScale : 1),
        (playerWeapons.current.powerScale ? playerWeapons.current.powerScale : 8));
    }
    // Power arc for Player 2 / AI
    if (ciyangPowerObj.isCharging) {
      _drawAimBase(dogBody, ciyangAngleObj, ciyangPowerObj, [255, 140, 40],
        (dogWeapons.current.gravityScale !== undefined ? dogWeapons.current.gravityScale : 1),
        (dogWeapons.current.powerScale ? dogWeapons.current.powerScale : 8));
    }

    // "BLACKOUT" label
    fill(255, 60, 60); textAlign(CENTER, CENTER); textSize(48); textStyle(pixelFont); noStroke();
    text("⚫ BLACKOUT", 1600 / 2, 900 / 2);
    textStyle(pixelFont);
    pop();
  }

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

    push(); textFont(pixelFont); rectMode(CENTER); textAlign(CENTER, CENTER);
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
  const bkX = 1600 / 2 - 75, bkY = 860, bkW2 = 150, bkH2 = 34;
  fill(0, 0, 0, 120); rect(bkX + 3, bkY + 3, bkW2, bkH2, 10);
  fill(100, 100, 120); rect(bkX, bkY, bkW2, bkH2, 10);
  fill(255); textSize(15); textAlign(CENTER, CENTER);
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

    push(); textFont(pixelFont); fill(0, 0, 0, 180); rect(0, 0, 1600, 900);
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
  const count = wDef.count || 1;
  const spread = wDef.spreadDeg || 0;
  const power = pObj.consume();   // consume once, share value across shots
  const wImg = weaponImages[wDef.imgKey] || imgPan;

  for (let i = 0; i < count; i++) {
    // Angle offset for multi-shot spread — centre the burst around base angle
    const offsetDeg = (count === 1) ? 0 : (i - (count - 1) / 2) * spread;
    const offsetRad = (offsetDeg * Math.PI) / 180;

    // Build a temporary angle object shifted by offsetRad
    const shiftedAngle = {
      angleRad: aObj.angleRad + offsetRad,
      angleDeg: aObj.angleDeg + offsetDeg,
    };

    // Fake a powerObj that returns the already-consumed value
    const fakePower = { consume() { return power; }, value: power };

    const p = cd.spawnProjectile({
      fromX, fromY,
      radius: wDef.radius,
      angleObj: shiftedAngle,
      powerObj: fakePower,
      powerScale: wDef.powerScale,
      owner,
      maxBounces: wDef.maxBounces,
    });

    // Attach metadata for rendering and special effects
    p.weaponImg = wImg;
    p.weaponId = wDef.id;
    p.weaponDamage = wDef.damage;
    p.special = wDef.special;

    // Ghost weapon: mark so collision skips static bodies
    if (wDef.special === "ghost") p.ghost = true;

    // Boomerang: negative wind drag (handled in _updateProjectile override in 8language.js)
    if (wDef.special === "boomerang") p.boomerang = true;
  }
}

// START SCREEN - polished
function drawStartScreen() {
  resetMatrix();
  startAnim.update();

  push();

  // ---- 背景（直接显示 + 上移） ----
  push();
  tint(255, startAnim.getBgAlpha() * 255);
  translate(0, startAnim.getBgOffsetY());
  image(startAnim.imgBg, 0, 0, 1600, 2848);
  pop();

  // ---- 标题（淡入 + 下落） ----
  push();
  tint(255, startAnim.getTitleAlpha() * 255);
  translate(0, startAnim.getTitleYOffset());
  image(startAnim.imgTitle,
    startAnim.TITLE.x, startAnim.TITLE.y,
    startAnim.TITLE.w, startAnim.TITLE.h);
  pop();

  // ---- 按钮（渐显） ----
  const btnStart = startAnim.BTN_START;
  const btnIntro = startAnim.BTN_INTRO;

  // 检测鼠标是否悬停在任一按钮上
  const hoverStart = (mouseX > btnStart.x && mouseX < btnStart.x + btnStart.w &&
    mouseY > btnStart.y && mouseY < btnStart.y + btnStart.h);
  const hoverIntro = (mouseX > btnIntro.x && mouseX < btnIntro.x + btnIntro.w &&
    mouseY > btnIntro.y && mouseY < btnIntro.y + btnIntro.h);
  const anyHover = hoverStart || hoverIntro;

  // 将悬停状态告知动画器（用于暂停浮动）
  if (startAnim.setButtonHovered) {
    startAnim.setButtonHovered(anyHover);
  }

  const btnAlpha = startAnim.getButtonAlpha() * 255;
  const floatY = startAnim.getButtonFloatOffset ? startAnim.getButtonFloatOffset() : 0;

  // 开始按钮
  push();
  if (hoverStart) {
    tint(150, btnAlpha);   // 变灰（降低 RGB 通道）
  } else {
    tint(255, btnAlpha);
  }
  image(startAnim.imgBtnStart,
    btnStart.x, btnStart.y + floatY,   // 应用浮动偏移
    btnStart.w, btnStart.h);
  pop();

  // 介绍文字
  push();
  tint(255, btnAlpha);
  image(startAnim.imgBtnIntro,
    startAnim.BTN_INTRO.x, startAnim.BTN_INTRO.y,
    startAnim.BTN_INTRO.w, startAnim.BTN_INTRO.h);
  pop();

  pop();
}



// LEVEL SCREEN 
function drawLevelScreen() {
  resetMatrix();

  // 背景浮动
  push();
  translate(0, levelAnim.getBgOffsetY());
  if (typeof imgDifficultyBg !== 'undefined' && imgDifficultyBg) {
    image(imgDifficultyBg, 0, 0, 1600, 1202);
  } else {
    image(imgPlayScreen, 0, 0, 1600, 2848);
  }
  pop();

  // 标题（黄色黑描边像素字体）
  push();
  textFont(pixelFont);
  textSize(70);
  textAlign(CENTER, CENTER);
  fill(255, 220, 50);
  stroke(0);
  strokeWeight(5);
  text(LANG.t("selectDifficulty"), 1600 / 2, 900 / 5);
  pop();

  // 按钮渐显透明度
  const btnAlpha = levelAnim.getButtonAlpha() * 255;

  const easyBtn = { x: 471, y: 294, w: 584, h: 105, text: "EASY" };
  const medBtn = { x: 470, y: 424, w: 584, h: 105, text: "MEDIUM" };
  const hardBtn = { x: 474, y: 550, w: 581, h: 106, text: "HARD" };

  const buttons = [
    { img: imgDiffEasy, rect: easyBtn },
    { img: imgDiffMedium, rect: medBtn },
    { img: imgDiffHard, rect: hardBtn }
  ];

  const descTexts = {
    EASY: "Slower speed",
    MEDIUM: "Stronger enemy",
    HARD: "No aim guide"
  };

  for (let btn of buttons) {
    const r = btn.rect;
    const isHover = (mouseX > r.x && mouseX < r.x + r.w &&
      mouseY > r.y && mouseY < r.y + r.h);

    // 绘制按钮图片
    push();
    if (isHover) {
      tint(200, 200, 255, btnAlpha);   // 悬停时提亮
    } else {
      tint(255, btnAlpha);              // 正常显示
    }
    image(btn.img, r.x, r.y, r.w, r.h);
    pop();

    // 绘制按钮文字（黑色，居中）
    push();
    textFont(pixelFont);
    textSize(30);
    textAlign(CENTER, CENTER);
    fill(0);
    noStroke();
    text(r.text, r.x + r.w / 2, r.y + r.h * 0.45);
    pop();

    // 绘制说明文字（灰色，居中，小字）
    push();
    textFont(pixelFont);
    textSize(14);
    textAlign(CENTER, CENTER);
    fill(0);
    noStroke();
    const descY = r.y + r.h * 0.70;
    text(descTexts[r.text], r.x + r.w / 2, descY);
    pop();
  }

  // 返回按钮
  drawBackBtn(900 - 100);

  rectMode(CORNER);
  textStyle(NORMAL);
}

/*
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
*/