const CHARACTERS_FANTASY = [
  { name: "John", portrait: "portrait_John_fantasy.png", nameUI: "name_John.png", bioUI: "bio_John.png" },
  { name: "Kira", portrait: "portrait_Kira_fantasy.png", nameUI: "name_Kira.png", bioUI: "bio_Kira.png" },
  { name: "Mat", portrait: "portrait_Mat_fantasy.png", nameUI: "name_Mat.png", bioUI: "bio_Mat.png" },
  { name: "Jo", portrait: "portrait_Jo_fantasy.png", nameUI: "name_Jo.png", bioUI: "bio_Jo.png" },
];

const CHARACTERS_MODERN = [
  { name: "John", portrait: "portrait_John_modern.png", nameUI: "name_John.png", bioUI: "bio_John.png" },
  { name: "Kira", portrait: "portrait_Kira_modern.png", nameUI: "name_Kira.png", bioUI: "bio_Kira.png" },
  { name: "Mat", portrait: "portrait_Mat_modern.png", nameUI: "name_Mat.png", bioUI: "bio_Mat.png" },
  { name: "Jo", portrait: "portrait_Jo_modern.png", nameUI: "name_Jo.png", bioUI: "bio_Jo.png" },
];

let charSelectIndex = 0;

function drawCharacterScreen() {
  resetMatrix();

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

  const platformY = isModern ? 365 : 395; // 向下移动20像素
  image(platformGlow, 211, platformY, 404, 393);

  image(frameDiamond, 867, 152, 546, 643);

  const portraitX = 211, portraitY = 149, portraitW = 479, portraitH = 647;
  drawContain(cur.portrait, portraitX, portraitY, portraitW, portraitH);

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
  textFont('Courier New');     // 使用等宽像素字体，也可换用 'Press Start 2P' 需先加载
  textStyle(BOLD);
  textSize(41);
  stroke(0);                   // 黑色描边
  strokeWeight(4);             // 描边粗细
  fill(255);                   // 白色填充
  text(LANG.t("btnStart"), btnX + btnW / 2, btnY + btnH / 2);
  pop();

  // 自定义返回按钮
  {
    const btnW = 150, btnH = 50;
    const btnX = 1600 / 2 - btnW / 2;
    const btnY = 820;
    fill(0, 0, 0, 120); rect(btnX + 3, btnY + 3, btnW, btnH, 20);
    fill(150, 150, 150); rect(btnX, btnY, btnW, btnH, 20);
    fill(255); textSize(24); textAlign(CENTER, CENTER);
    text("← BACK", 1600 / 2, btnY + btnH / 2);
  }
}