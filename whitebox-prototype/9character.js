const CHARACTERS_FANTASY = [
  {
    name: "John", portrait: "portrait_John_fantasy.png", nameUI: "name_John.png", bioUI: "bio_John.png",
    bioText: { EN: "A fierce warrior from the northern lands. Master of the broadsword.", ZH: "来自北方的凶猛战士，阔剑大师。" }
  },
  {
    name: "Kira", portrait: "portrait_Kira_fantasy.png", nameUI: "name_Kira.png", bioUI: "bio_Kira.png",
    bioText: { EN: "Swift as the wind, she strikes before you blink.", ZH: "疾如风，瞬杀之刃。" }
  },
  {
    name: "Mat", portrait: "portrait_Mat_fantasy.png", nameUI: "name_Mat.png", bioUI: "bio_Mat.png",
    bioText: { EN: "Archer with a keen eye. Never misses.", ZH: "眼神锐利的弓箭手，百发百中。" }
  },
  {
    name: "Jo", portrait: "portrait_Jo_fantasy.png", nameUI: "name_Jo.png", bioUI: "bio_Jo.png",
    bioText: { EN: "A wandering monk who fights with bare hands.", ZH: "以空手战斗的流浪武僧。" }
  }
];

const CHARACTERS_MODERN = [
  {
    name: "John", portrait: "portrait_John_modern.png", nameUI: "name_John.png", bioUI: "bio_John.png",
    bioText: { EN: "A modern warrior with high-tech armor.", ZH: "身着高科技盔甲的现代战士。" }
  },
  {
    name: "Kira", portrait: "portrait_Kira_modern.png", nameUI: "name_Kira.png", bioUI: "bio_Kira.png",
    bioText: { EN: "Cyber-enhanced assassin with lightning speed.", ZH: "拥有闪电速度的机械刺客。" }
  },
  {
    name: "Mat", portrait: "portrait_Mat_modern.png", nameUI: "name_Mat.png", bioUI: "bio_Mat.png",
    bioText: { EN: "Sniper with perfect aim and tactical gear.", ZH: "精准瞄准、装备齐全的狙击手。" }
  },
  {
    name: "Jo", portrait: "portrait_Jo_modern.png", nameUI: "name_Jo.png", bioUI: "bio_Jo.png",
    bioText: { EN: "Street fighter with improvised weapons.", ZH: "使用临时武器的街头格斗家。" }
  }
];

let charSelectIndex = 0;

function drawCharacterScreen() {
  resetMatrix();

  const isModern = (selectedDifficulty === "HARD");
  const isDual   = (gameMode === "DUAL");
  // In DUAL mode _charTurn: 0 = P1 picking, 1 = P2 picking
  const isP2Turn = isDual && _charTurn === 1;
  // Use appropriate index for whichever player is currently choosing
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

  // ── Player turn banner ─────────────────────────────────────────
  {
    const label = isDual
      ? (isP2Turn ? "Player 2 — Choose Your Character" : "Player 1 — Choose Your Character")
      : "Choose Your Character";
    const bannerCol = isP2Turn ? [255, 160, 60] : [80, 160, 255];
    push();
    fill(0, 0, 0, 180); noStroke(); rect(0, 0, 1600, 50);
    fill(...bannerCol); textSize(26); textAlign(CENTER, CENTER); noStroke();
    text(label, 1600 / 2, 25);
    // If DUAL and P1 already chose, show P1's selection in corner
    if (isDual && isP2Turn) {
      const p1Assets = isModern ? csAssets_modern : csAssets_fantasy;
      const p1Name   = p1Assets[charSelectIndex % p1Assets.length]?.name || "";
      fill(200, 230, 255); textSize(15); textAlign(LEFT, CENTER);
      text(`P1 selected: ${p1Name}`, 20, 25);
    }
    pop();
  }

  const platformY = isModern ? 365 : 395; // 向下移动20像素
  image(platformGlow, 211, platformY, 404, 393);

  image(frameDiamond, 867, 152, 546, 643);

  const portraitX = 211, portraitY = 149, portraitW = 479, portraitH = 647;
  drawContain(cur.portrait, portraitX, portraitY, portraitW, portraitH);

  // If P2 is picking and currently viewing P1's character, show TAKEN overlay
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

  image(cur.nameUI, 1039, 282, 202, 147);

  image(cur.bioUI, 1016, 429, 251, 58);

  image(arrowLeft, 716, 402, 135, 134);
  image(arrowRight, 1422, 402, 135, 134);

  // 确认按钮区域
  const btnX = 1015, btnY = 506, btnW = 262, btnH = 97;
  const isHover = (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH);
  if (isHover) {
    tint(180, 180, 180);
  } else {
    noTint();
  }
  image(btnConfirm, btnX, btnY, btnW, btnH);
  noTint();

  // 绘制文字 — 像素风格
  push();
  textAlign(CENTER, CENTER);
  textFont('Courier New');
  textStyle(BOLD);
  textSize(41);
  stroke(0);
  strokeWeight(4);
  fill(255);
  
  // Both P1 and P2 always show SELECT ▶ on the confirm button
  const confirmLabel = "SELECT";
  text(confirmLabel, btnX + btnW / 2, btnY + btnH / 2);
  pop();

  // Back button
  {
    const btnW = 150, btnH = 44;
    const btnX = 1600 / 2 - btnW / 2;
    const btnY = 820;
    push(); rectMode(CORNER);
    fill(0, 0, 0, 120); noStroke(); rect(btnX + 3, btnY + 3, btnW, btnH, 14);
    fill(80, 80, 100); rect(btnX, btnY, btnW, btnH, 14);
    fill(255); textSize(18); textAlign(CENTER, CENTER); noStroke();
    text("← BACK", 1600 / 2, btnY + btnH / 2);
    pop();
  }

  // ========== 动态 Bio 面板（跟随鼠标） ==========
  const portraitRect = { x: 211, y: 149, w: 479, h: 647 };
  const isHovering = (mouseX > portraitRect.x && mouseX < portraitRect.x + portraitRect.w &&
    mouseY > portraitRect.y && mouseY < portraitRect.y + portraitRect.h);

  if (isHovering) {
    const panelImg = isModern ? modernBioPanel : fantasyBioPanel;
    const panelW = isModern ? 283 : 346;
    const panelH = isModern ? 404 : 442;

    // 跟随鼠标位置
    let panelX = mouseX + 20;
    let panelY = mouseY + 20;
    if (panelX + panelW > width) panelX = mouseX - panelW - 20;
    if (panelY + panelH > height) panelY = mouseY - panelH - 20;
    panelX = constrain(panelX, 0, width - panelW);
    panelY = constrain(panelY, 0, height - panelH);

    if (panelImg) {
      image(panelImg, panelX, panelY, panelW, panelH);

      const bioTextObj = cur.bioText || { EN: "No description available.", ZH: "暂无描述。" };
      const lang = LANG.current;
      const bioStr = bioTextObj[lang] || bioTextObj.EN;

      // 居中像素风格文字
      push();
      textAlign(CENTER, CENTER);
      textFont('Courier New');
      textStyle(BOLD);
      textSize(18);
      fill(0);
      noStroke();

      const textMargin = 15;
      const textAreaW = panelW - textMargin * 2;
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

      const lineHeight = 26;
      const totalHeight = lines.length * lineHeight;
      let startY = textAreaY - totalHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        text(lines[i], textAreaX, startY + i * lineHeight);
      }
      pop();
    }
  }
}