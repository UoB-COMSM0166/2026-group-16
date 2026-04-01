// PLAY SCREEN 
function drawPlayScreen(){
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

  const timeUp   = gameTimer <= 0 && catHP !== dogHP;
  const gameOver = catHP <= 0 || dogHP <= 0 || timeUp;

  if (!gameOver) {
    player.controllable = true; dogBody.controllable = true;
    angleObj.update(); powerObj.update(dt);
    ciyangAngleObj.update(); ciyangPowerObj.update(dt);
    cd._updateCharacter(player, dt, angleObj);
    cd._updateCharacter(dogBody, dt, ciyangAngleObj);

        // 玩家发射
    if (powerObj.justReleased && powerObj.value > 10) {
      const fromX = player.x + player.w * (player.facing === 1 ? 0.9 : 0.1);
      const fromY = player.y + player.h * 0.35;
      cd.spawnProjectile({fromX, fromY, radius: 12, angleObj, powerObj, powerScale: 8, owner: "player", maxBounces: MAX_BOUNCES});
    }
    // Ciyang 发射
    if (ciyangPowerObj.justReleased && ciyangPowerObj.value > 10) {
      const fromX = dogBody.x + dogBody.w * (dogBody.facing === 1 ? 0.9 : 0.1);
      const fromY = dogBody.y + dogBody.h * 0.35;
      cd.spawnProjectile({fromX, fromY, radius: 12, angleObj: ciyangAngleObj, powerObj: ciyangPowerObj, powerScale: 8, owner: "dog", maxBounces: MAX_BOUNCES});
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
  drawHeadLabel(LABELS.target, dogBody.x + dogBody.w/2, dogBody.y);

  drawAimTrajectory(player, angleObj, powerObj);
  drawAimTrajectoryDog(dogBody, ciyangAngleObj, ciyangPowerObj);

  // Cat sprite (faces RIGHT naturally, flip when facing=-1)
  drawCharSprite(player, imgPlayer, -1);
  drawHeadLabel(LABELS.player, player.x + player.w/2, player.y);

  // Projectiles
  for (const p of cd.projectiles) {
    if (!p.alive) continue;
    push(); translate(p.x, p.y); rotate(Math.atan2(p.vy, p.vx));
    drawContain(imgPan, -p.r*4, -p.r*3.1, p.r*8, p.r*6.2); pop();
  }

  // Float texts
  fill(255,50,50); textSize(26); textAlign(CENTER);
  for (const t of cd.floatTexts) text(t.text, t.x, t.y);

  // HUD - top corners, under health bar (~72px tall)
  push();
  noStroke();

  // Rish (top-left)
  fill(0,0,0,140); rect(8, 74, 220, 54, 6);
  fill(200, 230, 255); textAlign(LEFT, TOP); textSize(13);
  text(`${LABELS.player} | Angle: ${angleObj.angleDeg.toFixed(0)}°  Power: ${powerObj.value.toFixed(0)}`, 15, 79);
  fill(170,170,170); textSize(11);
  text("A/D move  W/S aim  F fire", 15, 96);
  text("Hold F to charge, release to fire", 15, 110);

  // Ciyang (top-right)
  fill(0,0,0,140); rect(1600-228, 74, 220, 54, 6);
  fill(255, 220, 180); textAlign(RIGHT, TOP); textSize(13);
  text(`Angle: ${ciyangAngleObj.angleDeg.toFixed(0)}°  Power: ${ciyangPowerObj.value.toFixed(0)} | ${LABELS.target}`, 1600-15, 79);
  fill(170,170,170); textSize(11);
  text("←/→ move  ↑/↓ aim  Space fire", 1600-15, 96);
  text("Hold Space to charge, release", 1600-15, 110);

  pop();

  drawHealthBars();

  // TIMER — sits below the health bar, centred
  {
    const secs   = Math.ceil(Math.max(gameTimer, 0));
    const isLow  = secs <= 10 && !overtimeActive;
    const pulse  = isLow ? (0.5 + 0.5 * Math.sin(millis() * 0.01)) : 0;
    const timerX = 1600 / 2;
    const timerY = 82;
    const boxW   = overtimeActive ? 210 : 130;
    const boxH   = overtimeActive ? 46 : 38;

    push(); rectMode(CENTER); textAlign(CENTER, CENTER);
    fill(0,0,0,120); rect(timerX+3, timerY+3, boxW, boxH, 10);
    if (overtimeActive)      fill(160, 80, 0, 230);
    else if (isLow)          fill(lerp(60,180,pulse), 0, 0, 230);
    else                     fill(20, 20, 40, 210);
    stroke(255,220,50); strokeWeight(2);
    rect(timerX, timerY, boxW, boxH, 10);
    noStroke();
    if (overtimeActive) {
      fill(255,180,50); textSize(12); text("OVERTIME", timerX, timerY-9);
      fill(255,230,100); textSize(20); text(secs + "s", timerX, timerY+10);
    } else {
      fill(isLow ? color(255, lerp(80,255,pulse), 80) : color(255,220,50));
      textStyle(BOLD); textSize(22);
      const m = Math.floor(secs/60), s2 = secs%60;
      text((m>0 ? m+":" : "") + (s2<10&&m>0?"0":"") + s2, timerX, timerY+1);
    }
    textStyle(NORMAL); pop();
  }

  // BACK BUTTON — bottom-centre, always visible and clickable
  push(); rectMode(CORNER);
  const bkX = 1600/2 - 75, bkY = 860, bkW2 = 150, bkH2 = 34;
  fill(0,0,0,120); rect(bkX+3, bkY+3, bkW2, bkH2, 10);
  fill(100,100,120); rect(bkX, bkY, bkW2, bkH2, 10);
  fill(255); textSize(15); textAlign(CENTER, CENTER);
  text("← BACK", bkX + bkW2/2, bkY + bkH2/2);
  pop();

  // WIN OVERLAY
  if (gameOver) {
    let winnerIsRish;
    if      (catHP <= 0)  winnerIsRish = false;
    else if (dogHP <= 0)  winnerIsRish = true;
    else                  winnerIsRish = catHP > dogHP; // time up

    const winnerName = winnerIsRish ? LABELS.player : LABELS.target;
    const winnerHP   = winnerIsRish ? catHP : dogHP;
    const winnerImg  = winnerIsRish ? imgPlayer : imgTarget;

    push(); fill(0,0,0,180); rect(0,0,1600,900);
    const px = 1600/2, py = 900/2 - 60, ps = 200;
    drawContain(winnerImg, px-ps/2, py-ps/2, ps, ps);
    textAlign(CENTER,CENTER);
    textSize(72); fill(255,220,50); stroke(0); strokeWeight(4);
    text(`🏆 ${winnerName} Wins!`, 1600/2, py+ps/2+30);
    noStroke(); textSize(28); fill(180,255,180);
    text(`Remaining HP: ${winnerHP}`, 1600/2, py+ps/2+100);

    // Play Again button
    const paW = 240, paH = 56, paX = 1600/2 - paW/2, paY = py+ps/2+145;
    const paHover = mouseX > paX && mouseX < paX+paW && mouseY > paY && mouseY < paY+paH;
    fill(0,0,0,140); rect(paX+4, paY+4, paW, paH, 16);
    fill(paHover ? color(60,200,80) : color(40,160,60)); rect(paX, paY, paW, paH, 16);
    fill(255); textSize(26); textStyle(BOLD);
    text("🔄 Play Again", 1600/2, paY + paH/2 + 1);
    textStyle(NORMAL);

    // Back to menu button
    const bmW = 200, bmH = 44, bmX = 1600/2 - bmW/2, bmY = paY + paH + 16;
    const bmHover = mouseX > bmX && mouseX < bmX+bmW && mouseY > bmY && mouseY < bmY+bmH;
    fill(0,0,0,120); rect(bmX+3, bmY+3, bmW, bmH, 12);
    fill(bmHover ? color(100,100,160) : color(70,70,110)); rect(bmX, bmY, bmW, bmH, 12);
    fill(220); textSize(20);
    text("← Back to Menu", 1600/2, bmY + bmH/2 + 1);

    pop();
  }
}

// START SCREEN 
function drawStartScreen(){
  resetMatrix();
  drawImageCover(imgBg, 0, 0, 1600, 900);
  textSize(60); fill(0,0,0,200); rect(0,0,1600,900);

  fill(0,0,0,150); textSize(70);
  text("MERCHANT FIGHTER", 1600/2+4, 900/3+4);
  fill(255,220,50);
  text("MERCHANT FIGHTER", 1600/2, 900/3);
  fill(255); textSize(28);
  text("Rish vs Ciyang", 1600/2, 900/3+70);

  fill(80,200,80); rect(btnX-btnW/2, btnY-btnH/2, btnW, btnH, 25);
  fill(255); textSize(36); text("START", btnX, btnY);

  // Controls guide
  const s = 20, ico = 48, rY = 900/2+160, gap = 70;
  const lx = 1600/2-220, cx = 1600/2, rx = 1600/2+220;

  image(keyLeft, lx-s, rY, ico, ico); image(keyRight, lx+s, rY, ico, ico);
  fill(255); textSize(26); text("MOVE", cx, rY);
  image(keyA, rx-s, rY, ico, ico); image(keyD, rx+s, rY, ico, ico);

  image(keyUp, lx-s, rY+gap, ico, ico); image(keyDown, lx+s, rY+gap, ico, ico);
  fill(255); textSize(26); text("ADJUST ANGLE", cx, rY+gap);

  fill(255); textSize(22); text("HOLD SPACE TO CHARGE • RELEASE TO FIRE", cx, rY+gap*2);
  push(); imageMode(CENTER); image(keySpace, cx, rY+gap*2+50, 160, 40); pop();
}

// LEVEL SCREEN 
function drawLevelScreen(){
  resetMatrix();
  drawImageCover(imgPlayScreen, 0, 0, 1600, 900);
  fill(0,0,0,200); rect(0,0,1600,900);
  fill(255,220,50); textSize(70); text("Select Difficulty", 1600/2, 900/5);

  push(); rectMode(CENTER); textAlign(CENTER,CENTER); textStyle(BOLD);
  let bW = 320, bH = bW*32/96, gap = 30;
  let startY = 900/2+20 - (bH*3+gap*2)/2 + bH/2;
  let diffs = ["EASY", "MEDIUM", "HARD"];

  for (let i = 0; i < 3; i++) {
    let cx = 1600/2, cy = startY + i*(bH+gap);
    if (hitRect(cx, cy, bW, bH)) tint(200,200,255); else noTint();
    image(difficultyUI, cx-bW/2, cy-bH/2, bW, bH);
    noTint(); fill(255); stroke(0); strokeWeight(4); textSize(35);
    text(diffs[i], cx, cy); noStroke();
  }
  drawBackBtn(900-100);
  pop(); rectMode(CORNER); textStyle(NORMAL);
}

//  CHARACTER SCREEN 
function drawCharacterScreen() {
  resetMatrix();
  push(); rectMode(CENTER);
  fill(0,0,0,200); rect(1600/2, 900/2, 1600, 900);
  textAlign(CENTER,CENTER); fill(255,220,50); textSize(70);
  text("Choose Your Character", 1600/2, 900/5);

  let cardW = 300, cardH = 400, gap = 80;
  let lx = 1600/2 - cardW - gap/2, rx = 1600/2 + gap/2;

  drawCharCard(lx, cardW, cardH, imgPlayer, false, LABELS.player,
    "The agile cat warrior", "Balanced fighter", [100,150,255,200], [50,50,80,200]);
  drawCharCard(rx, cardW, cardH, imgTarget, false, LABELS.target,
    "The powerful dog warrior", "Heavy hitter", [255,150,100,200], [80,50,50,200]);

  drawBackBtn(900-60);
  pop(); rectMode(CORNER);
}