// 背景=bg.jpg（希腊沉船湾） // 玩家=player.png（猫） 目标=target.png（狗） 弹体=pan.png（平底锅）
// 操作：A/D 或 ←/→ 移动；↑↓调角度；按住空格蓄力，松开发射

// LABELS — now driven by selected character names, not hardcoded
// Updated in resetGame() from charSelectIndex / dogCharSelectIndex
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

const CHARACTERS_FANTASY = [
  {
    name: "John", portrait: "portrait_John_fantasy.png", nameUI: "name_John.png", bioUI: "bio_John.png",
    bioText: { EN: "An elven knight wielding a greatsword, a mysterious tome never leaves his hand.", ZH: "精灵骑士，手持巨剑，一本神秘的古书从不离身。" }
  },
  {
    name: "Kira", portrait: "portrait_Kira_fantasy.png", nameUI: "name_Kira.png", bioUI: "bio_Kira.png",
    bioText: { EN: "A winged angel, successor to Cupid. Armed with bow and arrow.", ZH: "拥有白色羽翼的天使，丘比特的后继者。手持弓箭与命运之书。" }
  },
  {
    name: "Mat", portrait: "portrait_Mat_fantasy.png", nameUI: "name_Mat.png", bioUI: "bio_Mat.png",
    bioText: { EN: "A high-ranking priest draped in crimson and black.", ZH: "身披红披风与黑袍的高阶传教士。" }
  },
  {
    name: "Jo", portrait: "portrait_Jo_fantasy.png", nameUI: "name_Jo.png", bioUI: "bio_Jo.png",
    bioText: { EN: "A wandering bard with a lamb in his arms, shrouded in mystery.", ZH: "流浪吟游诗人，一手抱羊，一手执琴。受神祝福，却身世成谜。" }
  }
];

const CHARACTERS_MODERN = [
  {
    name: "John", portrait: "portrait_John_modern.png", nameUI: "name_John.png", bioUI: "bio_John.png",
    bioText: { EN: "A master of quizzes, known for exams.", ZH: "测验达人，考试难度令人望而生畏。" }
  },
  {
    name: "Kira", portrait: "portrait_Kira_modern.png", nameUI: "name_Kira.png", bioUI: "bio_Kira.png",
    bioText: { EN: "Every detail matters under her watch, she won't let you slip.", ZH: "耐心而严谨，对细节一丝不苟。" }
  },
  {
    name: "Mat", portrait: "portrait_Mat_modern.png", nameUI: "name_Mat.png", bioUI: "bio_Mat.png",
    bioText: { EN: "No one can guess what he's thinking, especially during exams.", ZH: "平静的面孔让人猜不透当下的心情——尤其是考试时。" }
  },
  {
    name: "Jo", portrait: "portrait_Jo_modern.png", nameUI: "name_Jo.png", bioUI: "bio_Jo.png",
    bioText: { EN: "You'll love his class and fear his final.", ZH: "课堂生动有趣，但考试依旧极具挑战。" }
  }
];

// IMAGES — fantasy
let imgBgFantasy, imgCharSelectFantasy;
let imgPlayerFantasy, imgTargetFantasy;

// IMAGES — modern
let imgBgModern, imgCharSelectModern;
let imgPlayerModern, imgTargetModern;

// IMAGES — active (set when difficulty is chosen)
let imgBg, imgPlayScreen, imgPlayer, imgTarget;

// IMAGES — shared
let imgPan, imgWall, imgRobotAI;
let keyA, keyD, keyUp, keyDown, keyLeft, keyRight, keySpace;
let difficultyUI;

// ── WEAPON IMAGES ─────────────────────────────────────────────────
// Loaded in preload(), referenced by WEAPON_DEFS[i].imgKey
const weaponImages = {};

// SOUNDS
let sndHit = null;
let soundUnlocked = false; // browsers block audio until first user click

//  GLOBALS
let catHP = 100, dogHP = 100;
let ciyangAngleObj, ciyangPowerObj;
let gameState = "START", selectedDifficulty = "";
const btnX = 800, btnY = 450, btnW = 260, btnH = 80;
const GROUND_Y = 850;

let nav; // Navigator instance

// TIMER
let gameTimer = 60;
let timerRunning = false;
let overtimeActive = false;

// BLACKOUT
// Tracks elapsed play time (counts up) and active blackout state
let blackoutElapsed = 0;      // seconds since match start
let blackoutActive = false;   // whether blackout is currently on
let blackoutTimer = 0;        // countdown for current blackout (seconds)
let blackout1Done = false;    // first blackout trigger used
let blackout2Done = false;    // second blackout trigger used (HARD only)

// Character Select Screen
let fantasyArrowLeft, fantasyArrowRight, fantasyPlatformGlow, fantasyFrameDiamond, fantasyBtnConfirm, fantasyBgCharSelect;
let modernArrowLeft, modernArrowRight, modernPlatformGlow, modernFrameDiamond, modernBtnConfirm, modernBgCharSelect;
let fantasyBioPanel, modernBioPanel;
let csAssets_fantasy = [];
let csAssets_modern = [];

let bioF_John, bioF_Kira, bioF_Mat, bioF_Jo;
let bioM_John, bioM_Kira, bioM_Mat, bioM_Jo;
// ── GAME MODE ─────────────────────────────────────────────────────
// "SINGLE" = human vs AI  |  "DUAL" = human vs human
let gameMode = "DUAL";

// ── WEAPON OBJECTS ────────────────────────────────────────────────
// Created in setup(), one per fighter
let playerWeapons;   // WEAPONS instance for player1
let dogWeapons;      // WEAPONS instance for player2 / AI

// ── CHARACTER SELECT — P2 (dog) index ─────────────────────────────
// P1 uses the existing charSelectIndex; P2 in DUAL uses dogCharSelectIndex
let dogCharSelectIndex = 0;

// ── sound helper ───────────────────────────────────────────
function tryPlaySound(snd) {
  if (!snd || !soundUnlocked) return;
  try {
    if (snd.isPlaying()) snd.stop();
    snd.play();
  } catch (e) { }
}
// ──────────────────────────────────────────────────────────

// Call this after difficulty is selected to point imgBg/imgPlayer/imgTarget
// at the right asset set
function applyDifficultyAssets() {
  if (selectedDifficulty === "HARD") {
    imgBg = imgBgModern;
    imgPlayScreen = imgCharSelectModern;
    imgPlayer = imgPlayerModern;
    imgTarget = imgTargetModern;
  } else {
    imgBg = imgBgFantasy;
    imgPlayScreen = imgCharSelectFantasy;
    imgPlayer = imgPlayerFantasy;
    imgTarget = imgTargetFantasy;
  }
}

// ── Update LABELS from selected character names ───────────────────
function applyCharacterLabels() {
  const isModern = (selectedDifficulty === "HARD");
  const assets = isModern ? csAssets_modern : csAssets_fantasy;
  if (assets && assets.length) {
    LABELS.player = assets[charSelectIndex % assets.length].name;
    imgPlayer = assets[charSelectIndex % assets.length].portrait;

    if (gameMode === "SINGLE") {
      // AI opponent: fixed name and robot image
      LABELS.target = "AI";
      imgTarget = imgRobotAI;
    } else {
      LABELS.target = assets[dogCharSelectIndex % assets.length].name;
      imgTarget = assets[dogCharSelectIndex % assets.length].portrait;
    }
  }
}

function resetGame() {
  catHP = 100; dogHP = 100;
  gameTimer = 60;
  timerRunning = false;
  overtimeActive = false;

  blackoutElapsed = 0;
  blackoutActive = false;
  blackoutTimer = 0;
  blackout1Done = false;
  blackout2Done = false;

  applyDifficultyAssets();
  applyCharacterLabels();

  player.x = 380; player.y = GROUND_Y - 160; player.facing = 1;
  dogBody.x = 1100; dogBody.y = GROUND_Y - 160; dogBody.facing = -1;

  // In SINGLE mode use dummy keys so real arrow keys never move the AI;
  // VKEY will press these dummy codes. In DUAL mode use real arrow keys.
  if (gameMode === "SINGLE") {
    dogBody.leftKey = 201;
    dogBody.rightKey = 202;
    dogBody.controllable = true;
  } else {
    dogBody.leftKey = LEFT_ARROW;
    dogBody.rightKey = RIGHT_ARROW;
    dogBody.controllable = true;
  }

  cd.projectiles = [];
  cd.floatTexts = [];

  // Enable AI once here — not every frame — so VKEY.clear() doesn't wipe keys each frame
  if (window.GAME_AUTO) {
    if (gameMode === "SINGLE") {
      window.GAME_AUTO.setEnabled(true);
    } else {
      window.GAME_AUTO.setEnabled(false);
    }
  }

  powerObj.value = 0; powerObj._wasCharging = false;
  ciyangPowerObj.value = 0; ciyangPowerObj._wasCharging = false;

  // NOTE: weapon indexes are NOT reset here — players keep their weapon select choice
}

// p5.js LIFECYCLE
function preload() {
  // Fantasy assets
  imgBgFantasy = loadImage("assets/images/bg/bg_battle_fantasy_1.png");
  imgCharSelectFantasy = loadImage("assets/images/bg/bg_charselect_fantasy.png");
  imgPlayerFantasy = loadImage("assets/images/Sprites/sprite_John_fantasy.png");
  imgTargetFantasy = loadImage("assets/images/Sprites/sprite_Mattew_fantasy.png");

  // Modern assets
  imgBgModern = loadImage("assets/images/bg/bg_battle_modern_1.png");
  imgCharSelectModern = loadImage("assets/images/bg/bg_charselect_modern.png");
  imgPlayerModern = loadImage("assets/images/Sprites/sprite_John_modern.png");
  imgTargetModern = loadImage("assets/images/Sprites/sprite_Mattew_modern.png");

  // Defaults (fantasy) — will be overwritten by applyDifficultyAssets()
  imgBg = imgBgFantasy;
  imgPlayScreen = imgCharSelectFantasy;
  imgPlayer = imgPlayerFantasy;
  imgTarget = imgTargetFantasy;

  // AI robot image (used in SINGLE player mode for the opponent)
  imgRobotAI = loadImage("assets/AI/ai_robot.png");

  // Shared
  imgPan = loadImage("pan.png");
  imgWall = loadImage("assets/images/bg/wall_fantasy.png");
  keyA = loadImage("assets/ui/key_a.png");
  keyD = loadImage("assets/ui/key_d.png");
  keyUp = loadImage("assets/ui/key_up.png");
  keyDown = loadImage("assets/ui/key_down.png");
  keyLeft = loadImage("assets/ui/key_left.png");
  keyRight = loadImage("assets/ui/key_right.png");
  keySpace = loadImage("assets/ui/key_space.png");
  difficultyUI = loadImage("assets/ui/difficult-select-01.png");

  pixelFont = loadFont('assets/font/Press_Start_2P/PressStart2P-Regular.ttf');
  // 在 preload() 中添加，位于加载 fantasy/modern UI 之后

  const BIO_F_BASE = "assets/images/CharacterSelect/fantasy/";
  bioF_John = loadImage(BIO_F_BASE + "bioo_John_fantasy.png");
  bioF_Kira = loadImage(BIO_F_BASE + "bioo_Kira_fantasy.png");
  bioF_Mat = loadImage(BIO_F_BASE + "bioo_Mat_fantasy.png");
  bioF_Jo = loadImage(BIO_F_BASE + "bioo_Jo_fantasy.png");

  const BIO_M_BASE = "assets/images/CharacterSelect/modern/";
  bioM_John = loadImage(BIO_M_BASE + "bioo_John_modern.png");
  bioM_Kira = loadImage(BIO_M_BASE + "bioo_Kira_modern.png");
  bioM_Mat = loadImage(BIO_M_BASE + "bioo_Mat_modern.png");
  bioM_Jo = loadImage(BIO_M_BASE + "bioo_Jo_modern.png");
  // NOTE: sound is loaded in setup() so a bad path never blocks preload

  // ── Weapon images ──────────────────────────────────────────────
  const WPATH = "assets/weapons/";
  const wNames = [
    "weapon_bomb", "weapon_boomerang", "weapon_cannon", "weapon_dagger",
    "weapon_doubletap", "weapon_ghost", "weapon_ice", "weapon_pan",
    "weapon_poison", "weapon_triple"
  ];
  for (const n of wNames) {
    weaponImages[n] = loadImage(WPATH + n + ".png");
  }

  // Grace3.31__Character Select Screen Assets — fantasy
  const BASE_F = "assets/images/CharacterSelect/fantasy/";
  for (const c of CHARACTERS_FANTASY) {
    csAssets_fantasy.push({
      portrait: loadImage(BASE_F + c.portrait),
      nameUI: loadImage(BASE_F + c.nameUI),
      bioUI: loadImage(BASE_F + c.bioUI),
      bioText: c.bioText,
      name: c.name
    });
  }
  // Fantasy UI
  fantasyArrowLeft = loadImage(BASE_F + "arrow_left.png");
  fantasyArrowRight = loadImage(BASE_F + "arrow_right.png");
  fantasyPlatformGlow = loadImage(BASE_F + "platform_glow.png");
  fantasyFrameDiamond = loadImage(BASE_F + "frame_diamond.png");
  fantasyBtnConfirm = loadImage(BASE_F + "btn_confirm.png");
  fantasyBgCharSelect = loadImage(BASE_F + "bg_charselect_fantasy.png");
  fantasyBioPanel = loadImage(BASE_F + "bio_panel_fantasy.png");

  // Modern UI
  const BASE_M = "assets/images/CharacterSelect/modern/";

  csAssets_modern = [];
  for (const c of CHARACTERS_MODERN) {
    csAssets_modern.push({
      portrait: loadImage(BASE_M + c.portrait),
      nameUI: loadImage(BASE_M + c.nameUI),
      bioUI: loadImage(BASE_M + c.bioUI),
      bioText: c.bioText,
      name: c.name
    });
  }

  modernArrowLeft = loadImage(BASE_M + "arrow_left.png");
  modernArrowRight = loadImage(BASE_M + "arrow_right.png");
  modernPlatformGlow = loadImage(BASE_M + "platform_glow.png");
  modernFrameDiamond = loadImage(BASE_M + "frame_diamond.png");
  modernBtnConfirm = loadImage(BASE_M + "btn_confirm.png");
  modernBgCharSelect = loadImage(BASE_M + "bg_charselect_modern.png");
  modernBioPanel = loadImage(BASE_M + "bio_panel_modern.png");
}

function setup() {
  createCanvas(1600, 900);
  textAlign(CENTER, CENTER);

  angleObj = new ANGLE({ direction: 1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1, upKey: 87, downKey: 83 });
  powerObj = new POWER({ min: 0, max: 145, chargeRatePerSec: 90, fireKey: 70 });

  ciyangAngleObj = new ANGLE({ direction: -1, angleDeg: 45, minDeg: 0, maxDeg: 80, stepDeg: 1, upKey: UP_ARROW, downKey: DOWN_ARROW });
  ciyangPowerObj = new POWER({ min: 0, max: 145, chargeRatePerSec: 90, fireKey: 32 });

  cd = new CollisionDetection({ worldWidth: 1600, worldHeight: 900, cellSize: 128, gravity: 900, windAccel: 50 });
  cd.addStaticRect({ x: 0, y: GROUND_Y, w: 1600, h: 10, tag: "ground" });
  // Fix Bug 1: add the wall/pedestal as a real collision body so projectiles can't pass through it
  cd.addStaticRect({ x: 750, y: GROUND_Y - 200, w: 100, h: 200, tag: "wall" });

  dogBody = cd.addCharacter({
    x: 1100, y: GROUND_Y - 160, w: 110, h: 160, speed: 280, tag: "dog",
    // Use dummy key codes (201/202) — real arrow keys won't match these.
    // In SINGLE mode the AI presses these via VKEY; in DUAL mode we reassign them in resetGame.
    leftKey: 201, rightKey: 202
  });
  dogBody.facing = -1;
  player = cd.addCharacter({ x: 380, y: GROUND_Y - 160, w: 110, h: 160, speed: 280, tag: "player", leftKey: 65, rightKey: 68 });

  // Create weapon instances — one per fighter
  playerWeapons = new WEAPONS();
  dogWeapons = new WEAPONS();

  nav = new Navigator();

  // Load hit sound with callbacks — a wrong path warns but never hangs the game
  loadSound(
    "assets/sound/bamboo-hit-sound-effect.mp3",
    function (s) { sndHit = s; console.log("Hit sound loaded OK"); },
    function () { sndHit = null; console.warn("Hit sound not found — continuing without it"); }
  );

  LANG_PATCHER.apply(); // apply language patches after p5 is ready
}

function draw() {
  resetMatrix();
  textAlign(CENTER, CENTER);
  imageMode(CORNER);
  rectMode(CORNER);

  // Show language selector only on START screen
  const _lw = document.getElementById("lang-wrapper");
  if (_lw) {
    if (gameState === "START") _lw.classList.remove("hidden");
    else _lw.classList.add("hidden");
  }

  if (gameState === "START") drawStartScreen();
  else if (gameState === "CHOOSE") drawLevelScreen();
  else if (gameState === "MODE") drawModeScreen();
  else if (gameState === "CHARACTER") drawCharacterScreen();
  else if (gameState === "WEAPON_SELECT") drawWeaponSelectScreen();
  else {
    if (selectedDifficulty === "HARD") {
      powerObj.difficultyAdjustment(200, 170);
      ciyangPowerObj.difficultyAdjustment(200, 170);
      cd.updateSpeed(player, 480);
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

// Prevent browser from scrolling on spacebar / arrow keys
function keyPressed() {
  if ([32, 37, 38, 39, 40].includes(keyCode)) {
    return false;
  }

  // ── Weapon cycling during PLAY ──────────────────────────────────
  if (gameState === "PLAY") {
    playerWeapons.handleKey(keyCode, "player");
    // In DUAL mode P2 also cycles; in SINGLE mode AI doesn't need keys
    if (gameMode === "DUAL") {
      dogWeapons.handleKey(keyCode, "dog");
    }
  }

  // ── Weapon selection grid click-cycling in WEAPON_SELECT ─────────
  // (arrow keys optionally cycle through grid too)
  if (gameState === "WEAPON_SELECT") {
    if (keyCode === 81) playerWeapons.prev(); // Q
    if (keyCode === 69) playerWeapons.next(); // E
    if (gameMode === "DUAL") {
      if (keyCode === 73) dogWeapons.prev();  // I
      if (keyCode === 80) dogWeapons.next();  // P
    }
  }
}