function drawIntroScreen() {
  resetMatrix();
  if (typeof introAnim !== 'undefined') {
    introAnim.update();
    const hoverStart = (mouseX > 634 && mouseX < 634 + 312 && mouseY > 664 && mouseY < 664 + 105);
    introAnim.setHovered(hoverStart);
  }

  // bg
  if (LANG.current==="ZH"){
    if (imgIntroZhBg) {
      drawImageCover(imgIntroZhBg, 0, 0, 1600, 900);
    } else {
      background(0);
    }
  }else{
    if (imgIntroBg) {
      drawImageCover(imgIntroBg, 0, 0, 1600, 900);
    } else {
      background(0);
    }
  }


  // Start button
  const btnX = 634, btnY = 664, btnW = 305, btnH = 90;
  const hoverStart = (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH);
  const floatOffset = (introAnim && introAnim.getFloatOffset) ? introAnim.getFloatOffset() : 0;

  push();
  if (hoverStart) tint(200, 200, 255);
  else noTint();



  if (LANG.current==="ZH"){
    if (imgIntroZhStartBtn) {
      image(imgIntroZhStartBtn, btnX, btnY + floatOffset, btnW, 204);
    } else {
      fill(0, 150, 200);
      rect(btnX, btnY + floatOffset, btnW, btnH);
    }
  }else{
    if (imgIntroStartBtn) {
      image(imgIntroStartBtn, btnX, btnY + floatOffset, btnW, btnH);
    } else {
      fill(0, 150, 200);
      rect(btnX, btnY + floatOffset, btnW, btnH);
    }
  }

  noTint();
  pop();

  // Back button
  const backW = 150, backH = 44;
  const backX = 1600 / 2 - backW / 2, backY = 820;
  const hoverBack = (mouseX > backX && mouseX < backX + backW && mouseY > backY && mouseY < backY + backH);

  push();
  fill(0, 0, 0, 120); noStroke(); rect(backX + 3, backY + 3, backW, backH, 12);
  fill(hoverBack ? color(100, 100, 160) : color(70, 70, 110));
  rect(backX, backY, backW, backH, 12);
  fill(255); textSize(18); textAlign(CENTER, CENTER);
  text("← BACK", backX + backW / 2, backY + backH / 2);
  pop();
}