let squashTime = 0;
let squashDuration = 0.07;
let isSquashing = false;
let lastGameState = null;
let leftArrowSquashTime = 0;
let rightArrowSquashTime = 0;
const ARROW_SQUASH_DURATION = 0.1;

let charSelectIndex = 0;
let pIconAnimActive = false;
let pIconAnimTime = 0;
const pIconAnimDuration = 0.35;
let lastCharTurn = 0;

function _elasticOut(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
}

function drawCharacterScreen() {
  resetMatrix();

  if (lastGameState !== "CHARACTER" && gameState === "CHARACTER") {
    charSelectIndex = 0;
    isSquashing = true;
    squashTime = 0;
  }
  lastGameState = gameState;

  if (gameMode === "DUAL" && lastCharTurn !== _charTurn) {
    pIconAnimActive = true;
    pIconAnimTime = 0;
    lastCharTurn = _charTurn;
  }

  if (isSquashing) {
    squashTime += deltaTime / 1000;
    if (squashTime >= squashDuration) {
      squashTime = squashDuration;
      isSquashing = false;
    }
  }

  let mx = mouseX, my = mouseY;
  if (mouseIsPressed && leftArrowSquashTime <= 0) {
    if (mx > 716 && mx < 716 + 135 && my > 402 && my < 402 + 134) {
      leftArrowSquashTime = 0.001;
    }
  }
  if (mouseIsPressed && rightArrowSquashTime <= 0) {
    if (mx > 1422 && mx < 1422 + 135 && my > 402 && my < 402 + 134) {
      rightArrowSquashTime = 0.001;
    }
  }
  if (leftArrowSquashTime > 0) {
    leftArrowSquashTime += deltaTime / 1000;
    if (leftArrowSquashTime >= ARROW_SQUASH_DURATION) leftArrowSquashTime = 0;
  }
  if (rightArrowSquashTime > 0) {
    rightArrowSquashTime += deltaTime / 1000;
    if (rightArrowSquashTime >= ARROW_SQUASH_DURATION) rightArrowSquashTime = 0;
  }

  const isModern = (selectedDifficulty === "HARD");
  const isDual = (gameMode === "DUAL");
  const isP2Turn = isDual && _charTurn === 1;
  const activeIndex = isP2Turn ? dogCharSelectIndex : charSelectIndex;

  const bgImg = isModern ? modernBgCharSelect : fantasyBgCharSelect;
  const assets = isModern ? csAssets_modern : csAssets_fantasy;
  const arrowLeft = isModern ? modernArrowLeft : fantasyArrowLeft;
  const arrowRight = isModern ? modernArrowRight : fantasyArrowRight;
  const platformGlow = isModern ? modernPlatformGlow : fantasyPlatformGlow;
  const frameDiamond = isModern ? modernFrameDiamond : fantasyFrameDiamond;
  const btnConfirm = isModern ? modernBtnConfirm : fantasyBtnConfirm;

  if (!assets || assets.length === 0) return;
  const cur = assets[activeIndex % assets.length];
  if (!cur) return;

  drawImageCover(bgImg, 0, 0, 1600, 900);

  // Player turn banner
  {
    const label = isDual
      ? (isP2Turn ? "Player 2 — Choose Your Character" : "Player 1 — Choose Your Character")
      : "Choose Your Character";
    const bannerCol = isP2Turn ? [255, 160, 60] : [80, 160, 255];

    push();
    fill(0, 0, 0, 180); noStroke(); rect(0, 0, 1600, 50);
    fill(...bannerCol); textSize(26); textAlign(CENTER, CENTER); noStroke();
    text(label, 1600 / 2, 25);
    if (isDual && isP2Turn) {
      const p1Assets = isModern ? csAssets_modern : csAssets_fantasy;
      const p1Name = p1Assets[charSelectIndex % p1Assets.length]?.name || "";
      fill(200, 230, 255); textSize(15); textAlign(LEFT, CENTER);
      text(`P1 selected: ${p1Name}`, 20, 25);
    }
    pop();
  }

  // P1/P2 icon
  if (gameMode === "DUAL") {
    let pImg, pX, pY, pW, pH;
    const isP1Turn = (_charTurn === 0);
    if (isModern) {
      pImg = isP1Turn ? modernP1Img : modernP2Img;
      pX = 1332; pY = 60; pW = 221; pH = 129;
    } else {
      pImg = isP1Turn ? fantasyP1Img : fantasyP2Img;
      pX = 1327; pY = 58; pW = 236; pH = 146;
    }
    if (pImg) {
      push();
      imageMode(CORNER);
      let drawY = pY;
      if (pIconAnimActive) {
        const t = pIconAnimTime / pIconAnimDuration;
        const offset = -200 * (1 - _elasticOut(t));
        drawY = pY + offset;
      }
      image(pImg, pX, drawY, pW, pH);
      pop();
    }
  }

  const platformY = isModern ? 365 : 395;
  image(platformGlow, 211, platformY, 404, 393);
  image(frameDiamond, 867, 152, 546, 643);

  const portraitX = 211, portraitY = 149, portraitW = 479, portraitH = 647;

  // 角色肖像（带弹跳动画）
  push();
  let scaleX = 1, scaleY = 1;
  if (isSquashing) {
    let t = squashTime / squashDuration;
    let s = Math.sin(t * Math.PI);
    scaleX = 1 + s * 0.15;
    scaleY = 1 - s * 0.15;
  }
  translate(portraitX + portraitW / 2, portraitY + portraitH / 2);
  scale(scaleX, scaleY);
  drawContain(cur.portrait, -portraitW / 2, -portraitH / 2, portraitW, portraitH);
  pop();

  // TAKEN overlay
  if (isP2Turn && activeIndex === charSelectIndex) {
    push();
    fill(0, 0, 0, 160); noStroke();
    rect(portraitX, portraitY, portraitW, portraitH);
    fill(255, 60, 60); textSize(48); textAlign(CENTER, CENTER); textStyle(BOLD);
    noStroke();
    text("TAKEN", portraitX + portraitW / 2, portraitY + portraitH / 2);
    textStyle(NORMAL);
    pop();
  }

  if (pIconAnimActive) {
    pIconAnimTime += deltaTime / 1000;
    if (pIconAnimTime >= pIconAnimDuration) {
      pIconAnimTime = pIconAnimDuration;
      pIconAnimActive = false;
    }
  }

  let floatOffset = sin(millis() * 0.006) * 4;
  image(cur.nameUI, 1039, 282 + floatOffset, 202, 147);
  image(cur.bioUI, 1016, 429, 251, 58);

  // 左箭头
  push();
  let sx = 1, sy = 1, yOffset = 0;
  if (leftArrowSquashTime > 0) {
    let t = leftArrowSquashTime / ARROW_SQUASH_DURATION;
    let s = Math.sin(t * Math.PI);
    sx = 1 + s * 0.1;
    sy = 1 - s * 0.1;
    yOffset = -Math.sin(t * Math.PI) * -20;
  }
  translate(716 + 135 / 2, 402 + 134 / 2 + yOffset);
  scale(sx, sy);
  image(arrowLeft, -135 / 2, -134 / 2, 135, 134);
  pop();

  // 右箭头
  push();
  let rx = 1, ry = 1, yOffsetR = 0;
  if (rightArrowSquashTime > 0) {
    let t = rightArrowSquashTime / ARROW_SQUASH_DURATION;
    let s = Math.sin(t * Math.PI);
    rx = 1 + s * 0.1;
    ry = 1 - s * 0.1;
    yOffsetR = -Math.sin(t * Math.PI) * -20;
  }
  translate(1422 + 135 / 2, 402 + 134 / 2 + yOffsetR);
  scale(rx, ry);
  image(arrowRight, -135 / 2, -134 / 2, 135, 134);
  pop();

  // 确认按钮
  const btnX = 1015, btnY = 506, btnW = 262, btnH = 97;
  const isHover = (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH);
  if (isHover) tint(180, 180, 180);
  else noTint();
  image(btnConfirm, btnX, btnY, btnW, btnH);
  noTint();

  push();
  textAlign(CENTER, CENTER);
  textFont(pixelFont);
  textStyle(BOLD);
  textSize(27);
  fill(255);
  stroke(0);
  strokeWeight(4);
  fill(255);
  text("SELECT", btnX + btnW / 2, btnY + btnH / 2);
  pop();

  // 返回按钮
  {
    const btnW = 150, btnH = 50;
    const btnX = 1600 / 2 - btnW / 2;
    const btnY = 820;
    fill(0, 0, 0, 120); rect(btnX + 3, btnY + 3, btnW, btnH, 20);
    fill(150, 150, 150); rect(btnX, btnY, btnW, btnH, 20);
    fill(255); textSize(24); textAlign(CENTER, CENTER);
    textFont(pixelFont);
    text("← BACK", 1600 / 2, btnY + btnH / 2);
  }

  // Bio悬浮面板
  const portraitRect = { x: 211, y: 149, w: 479, h: 647 };
  const isHovering = (mouseX > portraitRect.x && mouseX < portraitRect.x + portraitRect.w &&
    mouseY > portraitRect.y && mouseY < portraitRect.y + portraitRect.h);

  if (isHovering) {
    const panelImg = isModern ? modernBioPanel : fantasyBioPanel;
    const panelW = isModern ? 283 : 346;
    const panelH = isModern ? 404 : 442;
    let panelX = mouseX + 20;
    let panelY = mouseY + 20;
    if (panelX + panelW > width) panelX = mouseX - panelW - 20;
    if (panelY + panelH > height) panelY = mouseY - panelH - 20;
    panelX = constrain(panelX, 0, width - panelW);
    panelY = constrain(panelY, 0, height - panelH);

    if (panelImg) {
      image(panelImg, panelX, panelY, panelW, panelH);

      let charBioOverlay = null;
      const charName = cur.name;
      if (isModern) {
        if (charName === "John") charBioOverlay = bioM_John;
        else if (charName === "Kira") charBioOverlay = bioM_Kira;
        else if (charName === "Mat") charBioOverlay = bioM_Mat;
        else if (charName === "Jo") charBioOverlay = bioM_Jo;
      } else {
        if (charName === "John") charBioOverlay = bioF_John;
        else if (charName === "Kira") charBioOverlay = bioF_Kira;
        else if (charName === "Mat") charBioOverlay = bioF_Mat;
        else if (charName === "Jo") charBioOverlay = bioF_Jo;
      }
      if (charBioOverlay) {
        image(charBioOverlay, panelX, panelY, panelW, panelH);
      }

      const bioTextObj = cur.bioText || { EN: "No description available.", ZH: "暂无描述。" };
      const lang = LANG.current;
      const bioStr = bioTextObj[lang] || bioTextObj.EN;

      push();
      textAlign(CENTER, CENTER);

      let fontSize, leftMargin, topMargin, textAreaW, lineHeight;
      if (isModern) {
        fontSize = 14;
        leftMargin = 30;
        topMargin = 250;
        textAreaW = panelW - leftMargin * 2;
        lineHeight = 22;
      } else {
        fontSize = 16;
        leftMargin = 40;
        topMargin = 280;
        textAreaW = panelW - leftMargin * 2;
        lineHeight = 20;
      }

      if (pixelFont) textFont(pixelFont);
      else textFont(isModern ? 'Courier New' : 'Georgia');
      textStyle(NORMAL);
      textSize(fontSize);
      fill(40, 25, 10);
      noStroke();

      // 计算文字区域中心坐标
      const textAreaX = panelX + panelW / 2;
      const textAreaY = panelY + panelH / 2;

      // 自动换行
      let words = bioStr.split(' ');
      let lines = [];
      let currentLine = "";
      for (let word of words) {
        let testLine = currentLine ? currentLine + " " + word : word;
        if (textWidth(testLine) > textAreaW) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const totalHeight = lines.length * lineHeight;
      let startY = textAreaY - totalHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        text(lines[i], textAreaX, startY + i * lineHeight);
      }
      pop();
    }
  }
}