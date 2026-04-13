let squashTime = 0;          // 当前动画时间
let squashDuration = 0.07;   // 动画总时长（秒）
let isSquashing = false;
let lastGameState = null;    // 用于检测状态变化，触发入场弹跳
// ===== 箭头弹跳动画变量 =====
let leftArrowSquashTime = 0;      // 左箭头动画剩余时间（秒）
let rightArrowSquashTime = 0;     // 右箭头动画剩余时间（秒）
const ARROW_SQUASH_DURATION = 0.1; // 动画持续时间（秒）

let charSelectIndex = 0;
// P1/P2 图标下坠入场动画变量
let pIconAnimActive = false;
let pIconAnimTime = 0;
const pIconAnimDuration = 0.35;       // 动画持续时间（秒）
let lastCharTurn = 0;                 // 记录上一次的 _charTurn，用于检测回合切换

function _elasticOut(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const p = 0.3;
  const s = p / 4;
  return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
}

function drawCharacterScreen() {
  resetMatrix();

  // ── 检测是否刚进入 CHARACTER 界面 ─────────────────
  if (lastGameState !== "CHARACTER" && gameState === "CHARACTER") {
    charSelectIndex = 0;           // 重置为第一个角色
    isSquashing = true;
    squashTime = 0;
  }
  lastGameState = gameState;

  // ── 检测回合切换（双人模式）─────────────────────────────
  if (gameMode === "DUAL" && lastCharTurn !== _charTurn) {
    pIconAnimActive = true;
    pIconAnimTime = 0;
    lastCharTurn = _charTurn;
  }

  // ── 更新弹跳动画时间 ─────────────────────────────
  if (isSquashing) {
    squashTime += deltaTime / 1000;
    if (squashTime >= squashDuration) {
      squashTime = squashDuration;
      isSquashing = false;
    }
  }

  // ===== 箭头点击检测与动画更新 =====
  let mx = mouseX, my = mouseY;  // 获取鼠标位置
  // 检测左箭头点击（仅在未播放动画时触发）
  if (mouseIsPressed && leftArrowSquashTime <= 0) {
    if (mx > 716 && mx < 716 + 135 && my > 402 && my < 402 + 134) {
      leftArrowSquashTime = 0.001;  // 开始动画
    }
  }
  // 检测右箭头点击
  if (mouseIsPressed && rightArrowSquashTime <= 0) {
    if (mx > 1422 && mx < 1422 + 135 && my > 402 && my < 402 + 134) {
      rightArrowSquashTime = 0.001;
    }
  }
  // 更新左箭头动画时间
  if (leftArrowSquashTime > 0) {
    leftArrowSquashTime += deltaTime / 1000;
    if (leftArrowSquashTime >= ARROW_SQUASH_DURATION) leftArrowSquashTime = 0;
  }
  // 更新右箭头动画时间
  if (rightArrowSquashTime > 0) {
    rightArrowSquashTime += deltaTime / 1000;
    if (rightArrowSquashTime >= ARROW_SQUASH_DURATION) rightArrowSquashTime = 0;
  }

  const isModern = (selectedDifficulty === "HARD");

  const bgImg = isModern ? modernBgCharSelect : fantasyBgCharSelect;
  const assets = isModern ? csAssets_modern : csAssets_fantasy;
  const arrowLeft = isModern ? modernArrowLeft : fantasyArrowLeft;
  const arrowRight = isModern ? modernArrowRight : fantasyArrowRight;
  const platformGlow = isModern ? modernPlatformGlow : fantasyPlatformGlow;
  const frameDiamond = isModern ? modernFrameDiamond : fantasyFrameDiamond;
  const btnConfirm = isModern ? modernBtnConfirm : fantasyBtnConfirm;

  if (!assets || assets.length === 0) return;
  const cur = assets[charSelectIndex % assets.length];
  if (!cur) return;

  drawImageCover(bgImg, 0, 0, 1600, 900);

  // ── 双人模式显示 P1/P2 标识（右上角）────────────────────────────
  if (gameMode === "DUAL") {
    let pImg;
    let pX, pY, pW, pH;

    // 根据当前回合决定显示 P1 还是 P2
    const isP1Turn = (_charTurn === 0);

    if (isModern) {
      // Hard 模式 (modern) 使用 h_p1.jpg / h_p2.png
      pImg = isP1Turn ? modernP1Img : modernP2Img;
      pX = 1332; pY = 60; pW = 221; pH = 129;
    } else {
      // Easy/Medium 模式 (fantasy) 使用 p1.png / p2.png
      pImg = isP1Turn ? fantasyP1Img : fantasyP2Img;
      pX = 1327; pY = 58; pW = 236; pH = 146;
    }

    if (pImg) {
      push();
      imageMode(CORNER);
      // 应用下坠动画偏移
      let drawY = pY;
      if (pIconAnimActive) {
        const t = pIconAnimTime / pIconAnimDuration;
        // 弹性缓动下落效果：从上方 -200px 弹到目标位置
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

  // ── character弹跳动画：先压扁再拉长（基于正弦曲线）────────────────
  push();
  let scaleX = 1;
  let scaleY = 1;
  if (isSquashing) {
    let t = squashTime / squashDuration;   // 0 → 1
    // 正弦曲线：0 → 1 → 0，在 t=0.5 时达到最大变形
    let s = Math.sin(t * Math.PI);
    // 增强幅度：横向拉伸 0.15，纵向压缩 0.15
    scaleX = 1 + s * 0.15;
    scaleY = 1 - s * 0.15;
  }
  translate(portraitX + portraitW / 2, portraitY + portraitH / 2);
  scale(scaleX, scaleY);
  drawContain(cur.portrait, -portraitW / 2, -portraitH / 2, portraitW, portraitH);
  pop();

  // ── 更新 P1/P2 图标下坠动画时间 ─────────────────────────
  if (pIconAnimActive) {
    pIconAnimTime += deltaTime / 1000;
    if (pIconAnimTime >= pIconAnimDuration) {
      pIconAnimTime = pIconAnimDuration;
      pIconAnimActive = false;
    }
  }

  // 名字浮动效果：上下幅度 4 像素，周期约 1 秒（2*PI/1000 ≈ 0.00628）
  let floatOffset = sin(millis() * 0.006) * 4;
  image(cur.nameUI, 1039, 282 + floatOffset, 202, 147);
  image(cur.bioUI, 1016, 429, 251, 58);

  // ===== 绘制左箭头（带点击弹跳 + Y轴下沉） =====
  push();
  let sx = 1, sy = 1;
  let yOffset = 0;   // 声明并初始化为 0
  if (leftArrowSquashTime > 0) {
    let t = leftArrowSquashTime / ARROW_SQUASH_DURATION;
    let s = Math.sin(t * Math.PI);
    sx = 1 + s * 0.1;
    sy = 1 - s * 0.1;
    yOffset = -Math.sin(t * Math.PI) * -20;   // 下沉 20 像素再回来
  }
  translate(716 + 135 / 2, 402 + 134 / 2 + yOffset);
  scale(sx, sy);
  image(arrowLeft, -135 / 2, -134 / 2, 135, 134);
  pop();

  // ===== 绘制右箭头（带点击弹跳 + Y轴下沉） =====
  push();
  let rx = 1, ry = 1;
  let yOffsetR = 0;   // 声明并初始化为 0
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

  // 按钮文字
  push();
  textAlign(CENTER, CENTER);
  textFont(pixelFont);
  textStyle(BOLD);
  textSize(27);
  fill(255);
  stroke(0);
  strokeWeight(4);
  text(LANG.t("btnSelect"), btnX + btnW / 2, btnY + btnH / 2 + 5);
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

  // 鼠标悬浮显示 Bio 面板（保持不变）
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
      // 先绘制原始 bio_panel 底图
      image(panelImg, panelX, panelY, panelW, panelH);

      // ===== 叠加角色专属花纹底图 =====
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

      // ===== 根据模式选择不同文字参数 =====
      let leftMargin, topMargin, textAreaW, lineHeight, fontSize;

      if (isModern) {
        // Modern 面板 283x404
        fontSize = 14;              // 像素字体稍小
        leftMargin = 30;            // 左右留白
        topMargin = 250;            // 上边距（现代风格文字偏上）
        textAreaW = panelW - leftMargin * 2;  // 283 - 60 = 223px
        lineHeight = 22;
      } else {
        // Fantasy 面板 346x442
        fontSize = 16;
        leftMargin = 40;
        topMargin = 280;
        textAreaW = panelW - leftMargin * 2;  // 346 - 80 = 266px
        lineHeight = 20;
      }

      // 使用像素字体（如果已加载）
      if (pixelFont) {
        textFont(pixelFont);
      } else {
        textFont(isModern ? 'Courier New' : 'Georgia');
      }
      textStyle(NORMAL);
      textSize(fontSize);
      fill(40, 25, 10);
      noStroke();

      // 文本区域的实际左上角坐标
      const textAreaX = panelX + leftMargin;
      const textAreaY = panelY + topMargin;

      // 手动换行
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

      let startY = textAreaY;
      for (let i = 0; i < lines.length; i++) {
        text(lines[i], textAreaX + textAreaW / 2, startY + i * lineHeight);
      }
      pop();
    }
  }
}