// PLAY SCREEN 
function drawPlayScreen(){
  resetMatrix();
  const dt = Math.min(deltaTime / 1000, 0.033);
  const gameOver = catHP <= 0 || dogHP <= 0;

  if (!gameOver) {
    player.controllable = true; dogBody.controllable = true;
    angleObj.update(); powerObj.update(dt);
    ciyangAngleObj.update(); ciyangPowerObj.update(dt);
    cd._updateCharacter(player, dt, angleObj);
    cd._updateCharacter(dogBody, dt, ciyangAngleObj);

    if (powerObj.justReleased && powerObj.value > 0) {
      const fromX = player.x + player.w * (player.facing === 1 ? 0.9 : 0.1);
      const fromY = player.y + player.h * 0.35;
      cd.spawnProjectile({fromX, fromY, radius: 12, angleObj, powerObj, powerScale: 8, owner: "player"});
    }
    if (ciyangPowerObj.justReleased && ciyangPowerObj.value > 0) {
      const fromX = dogBody.x + dogBody.w * (dogBody.facing === 1 ? 0.9 : 0.1);
      const fromY = dogBody.y + dogBody.h * 0.35;
      cd.spawnProjectile({fromX, fromY, radius: 12, angleObj: ciyangAngleObj, powerObj: ciyangPowerObj, powerScale: 8, owner: "dog"});
      dogBody.controllable = false;
    }

    for (const p of cd.projectiles) if (p.alive) cd._updateProjectile(p, dt);
    cd.floatTexts.forEach(t => { t.y += t.vy * dt; t.life -= dt; });
    cd.floatTexts = cd.floatTexts.filter(t => t.life > 0);
  }

  // DRAW 
  drawImageCover(imgBg, 0, 0, 1600, 900);

  noStroke(); fill(101, 67, 33, 220);
  const ground = cd.staticBodies.find(b => b.tag === "ground");
  if (ground) rect(ground.x, ground.y, ground.w, ground.h);

  const wall = cd.staticBodies.find(b => b.tag === "wall");
  if (wall) {
    fill(0,0,0,60);       rect(wall.x+6, wall.y+6, wall.w, wall.h, 4);
    fill(120,90,50,230);   rect(wall.x, wall.y, wall.w, wall.h, 4);
    fill(160,120,70,180);  rect(wall.x+4, wall.y+4, wall.w-8, 10, 3);
  }

  // Dog sprite (faces LEFT naturally, flip when facing=1)
  drawCharSprite(dogBody, imgTarget, 1);
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

  // HUD
  fill(0); textSize(16); textAlign(LEFT);
  text(`Angle: ${ciyangAngleObj.angleDeg.toFixed(0)}°`, 20, 82);
  text(`Power: ${ciyangPowerObj.value.toFixed(0)}`,     20, 102);
  text(`Angle: ${angleObj.angleDeg.toFixed(0)}°`,       20, 82);
  text(`Power: ${powerObj.value.toFixed(0)}`,           20, 102);
  text(`${LABELS.player}: A/D move  W/S aim  F fire   |   ${LABELS.target}: ←/→ move  ↑/↓ aim  Space fire`, 20, 122);

  drawHealthBars();

  //  BACK BUTTON (top right, under health bar) 
  push();
  fill(0,0,0,120); rect(1600-116, 68, 104, 36, 10);
  fill(150,150,150); rect(1600-120, 64, 104, 36, 10);
  fill(255); textSize(16); textAlign(CENTER, CENTER);
  text("← BACK", 1600-68, 82);
  pop();

  // WIN OVERLAY
  if (gameOver) {
    const winnerIsRish = dogHP <= 0;
    const winnerName = winnerIsRish ? LABELS.player : LABELS.target;
    const winnerHP   = winnerIsRish ? catHP : dogHP;
    const winnerImg  = winnerIsRish ? imgPlayer : imgTarget;

    push(); fill(0,0,0,180); rect(0,0,1600,900);
    const px = 1600/2, py = 900/2 - 60, ps = 200;
    if (winnerIsRish) {
      drawContain(winnerImg, px-ps/2, py-ps/2, ps, ps);
    } else {
      push(); translate(px+ps/2, 0); scale(-1,1);
      drawContain(winnerImg, -ps/2, py-ps/2, ps, ps);
      pop();
    }
    textAlign(CENTER,CENTER);
    textSize(72); fill(255,220,50); stroke(0); strokeWeight(4);
    text(`🏆 ${winnerName} Wins!`, 1600/2, py+ps/2+30);
    noStroke(); textSize(28); fill(180,255,180);
    text(`Remaining HP: ${winnerHP}`, 1600/2, py+ps/2+100);
    textSize(22); fill(200,200,200);
    text("Refresh to play again", 1600/2, py+ps/2+145);
    pop();
  }
}

// START SCREEN 
function drawStartScreen(){
  resetMatrix();
  drawImageCover(imgBg, 0, 0, 1600, 900);
  textSize(60); fill(0,0,0,200); rect(0,0,1600,900);

  fill(0,0,0,150); textSize(70);
  text("🐱 MERCHANT FIGHTER 🐶", 1600/2+4, 900/3+4);
  fill(255,220,50);
  text("🐱 MERCHANT FIGHTER 🐶", 1600/2, 900/3);
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
  drawCharCard(rx, cardW, cardH, imgTarget, true, LABELS.target,
    "The powerful dog warrior", "Heavy hitter", [255,150,100,200], [80,50,50,200]);

  drawBackBtn(900-60);
  pop(); rectMode(CORNER);
}