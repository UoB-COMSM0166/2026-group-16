// 背景=bg.jpg（希腊沉船湾） // 玩家=player.png（猫） 目标=target.png（狗） 弹体=pan.png（平底锅）
// 操作：A/D 或 ←/→ 移动；↑↓调角度；按住空格蓄力，松开发射
const LABELS = { player: "Rish", target: "Ciyang" };
const LABEL_STYLE = {
  fontSize: 22, paddingX: 10, paddingY: 6, offsetY: 14, radius: 10,
  textColor: [255, 255, 255],
  boxFill: [0, 120, 255, 210],
  boxStroke: [255, 255, 255, 230],
  boxStrokeWeight: 2,
};

// IMAGES
let imgBg, imgPlayScreen, imgPlayer, imgTarget, imgPan;
let keyA, keyD, keyUp, keyDown, keyLeft, keyRight, keySpace;
let difficultyUI;

//  GLOBALS
let catHP = 100, dogHP = 100;
let ciyangAngleObj, ciyangPowerObj;
let gameState = "START", selectedDifficulty = "";
const btnX = 800, btnY = 490, btnW = 260, btnH = 80;
const GROUND_Y = 850;

let nav; // Navigator instance

// p5.js LIFECYCLE 
function preload() {
  imgBg         = loadImage("bg.jpg");
  imgPlayScreen = loadImage("assets/images/battle_scene-0.png");
  imgPlayer     = loadImage("player.png");
  imgTarget     = loadImage("target.png");
  imgPan        = loadImage("pan.png");
  keyA     = loadImage("assets/ui/key_a.png");
  keyD     = loadImage("assets/ui/key_d.png");
  keyUp    = loadImage("assets/ui/key_up.png");
  keyDown  = loadImage("assets/ui/key_down.png");
  keyLeft  = loadImage("assets/ui/key_left.png");
  keyRight = loadImage("assets/ui/key_right.png");
  keySpace = loadImage("assets/ui/key_space.png");
  difficultyUI = loadImage("assets/ui/difficult-select-01.png");
}

function setup() {
  createCanvas(1600, 900);
  textAlign(CENTER, CENTER);

  angleObj = new ANGLE({ direction: 1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1, upKey: 87, downKey: 83 });
  powerObj = new POWER({ min: 0, max: 130, chargeRatePerSec: 90, fireKey: 70 });

  ciyangAngleObj = new ANGLE({ direction: -1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1, upKey: UP_ARROW, downKey: DOWN_ARROW });
  ciyangPowerObj = new POWER({ min: 0, max: 145, chargeRatePerSec: 90, fireKey: 32 });

  cd = new CollisionDetection({ worldWidth: 1600, worldHeight: 900, cellSize: 128, gravity: 900, windAccel: 50 });
  cd.addStaticRect({ x: 0,   y: GROUND_Y, w: 1600, h: 50,  tag: "ground" });
  cd.addStaticRect({ x: 770, y: 650,      w: 60,   h: 200, tag: "wall"   });

  dogBody = cd.addCharacter({ x: 1100, y: GROUND_Y - 110, w: 120, h: 110, speed: 280, tag: "dog",    leftKey: LEFT_ARROW, rightKey: RIGHT_ARROW });
  dogBody.facing = -1;
  player  = cd.addCharacter({ x: 380,  y: GROUND_Y - 120, w: 120, h: 120, speed: 280, tag: "player", leftKey: 65, rightKey: 68 });

  nav = new Navigator();
}

function draw() {
  resetMatrix();
  textAlign(CENTER, CENTER);
  imageMode(CORNER);
  rectMode(CORNER);
  if      (gameState === "START")     drawStartScreen();
  else if (gameState === "CHOOSE")    drawLevelScreen();
  else if (gameState === "CHARACTER") drawCharacterScreen();
  else {
    if (selectedDifficulty === "HARD") {
      powerObj.difficultyAdjustment(200, 170);
      ciyangPowerObj.difficultyAdjustment(200, 170);
      cd.updateSpeed(player,  480);
      cd.updateSpeed(dogBody, 480);
    }
    drawPlayScreen();
  }
}

function mousePressed() { nav.handleClick(mouseX, mouseY); }