// 背景=bg.jpg（希腊沉船湾） // 玩家=player.png（猫） 目标=target.png（狗） 弹体=pan.png（平底锅）
// 操作：A/D 或 ←/→ 移动；↑↓调角度；按住空格蓄力，松开发射
const LABELS = { player: "Rish", target: "Ciyang" };
// ── 反弹配置（你可以自己调整这个数字）────────────────
const MAX_BOUNCES = 3;   // 最大反弹次数，设为 0 则不反弹
const LABEL_STYLE = {
  fontSize: 22, paddingX: 10, paddingY: 6, offsetY: 14, radius: 10,
  textColor: [255, 255, 255],
  boxFill: [0, 120, 255, 210],
  boxStroke: [255, 255, 255, 230],
  boxStrokeWeight: 2,
};

// IMAGES — fantasy
let imgBgFantasy, imgCharSelectFantasy;
let imgPlayerFantasy, imgTargetFantasy;

// IMAGES — modern
let imgBgModern, imgCharSelectModern;
let imgPlayerModern, imgTargetModern;

// IMAGES — active (set when difficulty is chosen)
let imgBg, imgPlayScreen, imgPlayer, imgTarget;

// IMAGES — shared
let imgPan, imgWall;
let keyA, keyD, keyUp, keyDown, keyLeft, keyRight, keySpace;
let difficultyUI;

// SOUNDS
let sndHit = null;
let soundUnlocked = false; // browsers block audio until first user click

//  GLOBALS
let catHP = 100, dogHP = 100;
let ciyangAngleObj, ciyangPowerObj;
let gameState = "START", selectedDifficulty = "";
const btnX = 800, btnY = 490, btnW = 260, btnH = 80;
const GROUND_Y = 850;

let nav; // Navigator instance

// TIMER
let gameTimer = 60;
let timerRunning = false;
let overtimeActive = false;


// ── sound helper ───────────────────────────────────────────
function tryPlaySound(snd) {
  if (!snd || !soundUnlocked) return;
  try {
    if (snd.isPlaying()) snd.stop();
    snd.play();
  } catch(e) {}
}
// ──────────────────────────────────────────────────────────

// Call this after difficulty is selected to point imgBg/imgPlayer/imgTarget
// at the right asset set
function applyDifficultyAssets() {
  if (selectedDifficulty === "HARD") {
    imgBg         = imgBgModern;
    imgPlayScreen = imgCharSelectModern;
    imgPlayer     = imgPlayerModern;
    imgTarget     = imgTargetModern;
  } else {
    imgBg         = imgBgFantasy;
    imgPlayScreen = imgCharSelectFantasy;
    imgPlayer     = imgPlayerFantasy;
    imgTarget     = imgTargetFantasy;
  }
}

function resetGame() {
  catHP = 100; dogHP = 100;
  gameTimer = 60;
  timerRunning = false;
  overtimeActive = false;

  applyDifficultyAssets();

  player.x = 380;  player.y = GROUND_Y - 160; player.facing = 1;
  dogBody.x = 1100; dogBody.y = GROUND_Y - 160; dogBody.facing = -1;

  cd.projectiles = [];
  cd.floatTexts  = [];

  powerObj.value = 0; powerObj._wasCharging = false;
  ciyangPowerObj.value = 0; ciyangPowerObj._wasCharging = false;
}

// p5.js LIFECYCLE
function preload() {
  // Fantasy assets
  imgBgFantasy        = loadImage("assets/images/bg/bg_battle_fantasy_1.png");
  imgCharSelectFantasy = loadImage("assets/images/bg/bg_charselect_fantasy.png");
  imgPlayerFantasy    = loadImage("assets/images/Sprites/sprite_John_fantasy.png");
  imgTargetFantasy    = loadImage("assets/images/Sprites/sprite_Mattew_fantasy.png");

  // Modern assets
  imgBgModern         = loadImage("assets/images/bg/bg_battle_modern_1.png");
  imgCharSelectModern = loadImage("assets/images/bg/bg_charselect_modern.png");
  imgPlayerModern     = loadImage("assets/images/Sprites/sprite_John_modern.png");
  imgTargetModern     = loadImage("assets/images/Sprites/sprite_Mattew_modern.png");

  // Defaults (fantasy) — will be overwritten by applyDifficultyAssets()
  imgBg         = imgBgFantasy;
  imgPlayScreen = imgCharSelectFantasy;
  imgPlayer     = imgPlayerFantasy;
  imgTarget     = imgTargetFantasy;

  // Shared
  imgPan        = loadImage("pan.png");
  imgWall       = loadImage("assets/images/bg/wall_fantasy.png");
  keyA          = loadImage("assets/ui/key_a.png");
  keyD          = loadImage("assets/ui/key_d.png");
  keyUp         = loadImage("assets/ui/key_up.png");
  keyDown       = loadImage("assets/ui/key_down.png");
  keyLeft       = loadImage("assets/ui/key_left.png");
  keyRight      = loadImage("assets/ui/key_right.png");
  keySpace      = loadImage("assets/ui/key_space.png");
  difficultyUI  = loadImage("assets/ui/difficult-select-01.png");
  // NOTE: sound is loaded in setup() so a bad path never blocks preload
}

function setup() {
  createCanvas(1600, 900);
  textAlign(CENTER, CENTER);

  angleObj = new ANGLE({ direction: 1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1, upKey: 87, downKey: 83 });
  powerObj = new POWER({ min: 0, max: 130, chargeRatePerSec: 90, fireKey: 70 });

  ciyangAngleObj = new ANGLE({ direction: -1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1, upKey: UP_ARROW, downKey: DOWN_ARROW });
  ciyangPowerObj = new POWER({ min: 0, max: 145, chargeRatePerSec: 90, fireKey: 32 });

  cd = new CollisionDetection({ worldWidth: 1600, worldHeight: 900, cellSize: 128, gravity: 900, windAccel: 50 });
  cd.addStaticRect({ x: 0, y: GROUND_Y, w: 1600, h: 10, tag: "ground" });

  dogBody = cd.addCharacter({ x: 1100, y: GROUND_Y - 160, w: 110, h: 160, speed: 280, tag: "dog",    leftKey: LEFT_ARROW, rightKey: RIGHT_ARROW });
  dogBody.facing = -1;
  player  = cd.addCharacter({ x: 380,  y: GROUND_Y - 160, w: 110, h: 160, speed: 280, tag: "player", leftKey: 65, rightKey: 68 });

  nav = new Navigator();

  // Load hit sound with callbacks — a wrong path warns but never hangs the game
  loadSound(
    "assets/sound/bamboo-hit-sound-effect.mp3",
    function(s) { sndHit = s; console.log("Hit sound loaded OK"); },
    function()  { sndHit = null; console.warn("Hit sound not found — continuing without it"); }
  );

  LANG_PATCHER.apply(); // apply language patches after p5 is ready
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

function mousePressed() {
  // Unlock audio context on first click (browser requirement)
  if (!soundUnlocked) {
    userStartAudio();
    soundUnlocked = true;
  }
  nav.handleClick(mouseX, mouseY);
}


function keyPressed() {
  // Toggle autoplayer with T
  if (key === "t" || key === "T") {
    if (window.GAME_AUTO) {
      GAME_AUTO.setEnabled(!GAME_AUTO.enabled);
      console.log("[AUTO] enabled =", GAME_AUTO.enabled);
    } else {
      console.warn("[AUTO] AUTO is undefined (not created yet)");
    }
    return false;
  }

  // Prevent browser from scrolling on spacebar / arrow keys
  if ([32, 37, 38, 39, 40].includes(keyCode)) {
    return false;
  }
}