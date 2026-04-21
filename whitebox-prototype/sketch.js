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
let bgMusic = null;
let isMuted = false;

// ── JUMP KEY STATE ───────────────────────────────────────────────
// p5's keyIsDown(16) can't distinguish Left vs Right Shift, so we
// track them separately via keyPressed/keyReleased using event.location
// 1 = left key, 2 = right key

//  GLOBALS
let catHP = 100, dogHP = 100;
let ciyangAngleObj, ciyangPowerObj;
let gameState = "START", selectedDifficulty = "";
const GROUND_Y = 850;

let nav; // Navigator instance

// TIMER
let gameTimer = 60;
let timerRunning = false;
let overtimeActive = false;

// ── ROUND SYSTEM ─────────────────────────────────────────────────
// Best-of-3: first player to win 2 rounds wins the match
let roundNumber = 1;          // current round (1, 2, 3)
let p1RoundWins = 0;          // rounds won by player 1
let p2RoundWins = 0;          // rounds won by player 2
let roundOverState = null;    // null | { winner: "player"|"dog", name, hp } — shown between rounds
let roundOverTimer = 0;       // counts down before auto-advancing to next round
const ROUND_OVER_DELAY = 3.0; // seconds to show round-over screen before next round
const ROUNDS_TO_WIN = 2;      // first to this many round wins takes the match

// ── MAP SYSTEM ───────────────────────────────────────────────────
// 3 map layouts chosen randomly each round
// 0 = Classic (centre wall), 1 = Platform (raised centre platform), 2 = Twin Pillars
let currentMap = 0;

// Builds static bodies for the chosen map layout into CollisionDetection instance
function applyMap(mapIndex) {
  // Remove old static bodies except the ground (id === 1 is always the ground)
  cd.staticBodies = cd.staticBodies.filter(b => b.tag === "ground");
  cd._grid = new Map();
  // Re-insert ground into grid
  for (const b of cd.staticBodies) cd._insertToGrid(b);

  if (mapIndex === 0) {
    // ── MAP 0: Classic — single centre wall ──────────────────────
    cd.addStaticRect({ x: 750, y: GROUND_Y - 200, w: 100, h: 200, tag: "wall" });
  } else if (mapIndex === 1) {
    // ── MAP 1: Platform — raised centre platform + two short side pillars
    cd.addStaticRect({ x: 650, y: GROUND_Y - 130, w: 300, h: 20, tag: "wall" }); // wide platform
    cd.addStaticRect({ x: 250, y: GROUND_Y - 80, w: 80, h: 80, tag: "wall" }); // left pillar
    cd.addStaticRect({ x: 1270, y: GROUND_Y - 80, w: 80, h: 80, tag: "wall" }); // right pillar
  } else {
    // ── MAP 2: Twin Pillars — two tall pillars, gap in the middle ──
    cd.addStaticRect({ x: 560, y: GROUND_Y - 260, w: 90, h: 260, tag: "wall" }); // left pillar
    cd.addStaticRect({ x: 950, y: GROUND_Y - 260, w: 90, h: 260, tag: "wall" }); // right pillar
  }
}

// ── BLACKOUT
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

//start screen animation
let imgStartBg, imgTitle, imgBtnStart, imgBtnIntro;
let startAnim;
let levelAnim;
let imgDifficultyBg;
let imgDiffEasy, imgDiffMedium, imgDiffHard;

// ── GAME MODE ─────────────────────────────────────────────────────
// "SINGLE" = human vs AI  |  "DUAL" = human vs human
let gameMode = "DUAL";
let modeAnim;

// ── WEAPON OBJECTS ────────────────────────────────────────────────
// Created in setup(), one per fighter
let playerWeapons;   // WEAPONS instance for player1
let dogWeapons;      // WEAPONS instance for player2 / AI

// ── CHARACTER SELECT — P2 (dog) index ─────────────────────────────
// P1 uses the existing charSelectIndex; P2 in DUAL uses dogCharSelectIndex
let dogCharSelectIndex = 0;
let imgModeBg, imgSingleCard, imgDoubleCard, imgSButton, imgDButton;

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

  // Pick a random map for this round and apply it
  currentMap = Math.floor(Math.random() * 3);
  applyMap(currentMap);

  // Reset round-over state
  roundOverState = null;
  roundOverTimer = 0;

  applyDifficultyAssets();
  applyCharacterLabels();

  player.x = 380; player.y = GROUND_Y - 160; player.facing = 1;
  player.vy = 0; player.onGround = true;
  dogBody.x = 1100; dogBody.y = GROUND_Y - 160; dogBody.facing = -1;
  dogBody.vy = 0; dogBody.onGround = true;

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

// Reset the entire match (round wins, round number) — called when starting a new match
function resetMatch() {
  roundNumber = 1;
  p1RoundWins = 0;
  p2RoundWins = 0;
  roundOverState = null;
  roundOverTimer = 0;
  resetGame();
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
  difficultyUI = loadImage("assets/ui/difficult-select-01.png");
  imgDifficultyBg = loadImage("assets/images/DifficultySelect/difficult_bg.png");
  imgDiffEasy = loadImage("assets/images/DifficultySelect/easy_button.png");
  imgDiffMedium = loadImage("assets/images/DifficultySelect/medium_button.png");
  imgDiffHard = loadImage("assets/images/DifficultySelect/hard_button.png");

  pixelFont = loadFont('assets/font/Press_Start_2P/PressStart2P-Regular.ttf');
  pixelFont_intro = loadFont('assets/font/ZLabsBitmap_12px_CN.ttf');

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

    // Start screen animation assets
    imgStartBg = loadImage("assets/images/StartScreen/start_bg.png");
    imgTitle = loadImage("assets/images/StartScreen/title.png");
    imgBtnStart = loadImage("assets/images/StartScreen/start_button.png");
    imgBtnIntro = loadImage("assets/images/StartScreen/intro_text.png");
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

  fantasyP1Img = loadImage("assets/images/CharacterSelect/fantasy/p1.png");
  fantasyP2Img = loadImage("assets/images/CharacterSelect/fantasy/p2.png");
  modernP1Img = loadImage("assets/images/CharacterSelect/modern/h_p1.png");
  modernP2Img = loadImage("assets/images/CharacterSelect/modern/h_p2.png");

  imgModeBg = loadImage("assets/images/SingleDouble/sd_bg.png");
  imgSingleCard = loadImage("assets/images/SingleDouble/single.png");
  imgDoubleCard = loadImage("assets/images/SingleDouble/double.png");
  imgSButton = loadImage("assets/images/SingleDouble/s_button.png");
  imgDButton = loadImage("assets/images/SingleDouble/d_button.png");
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
  // Default map applied here; resetGame()/applyMap() will re-configure each round
  cd.addStaticRect({ x: 750, y: GROUND_Y - 200, w: 100, h: 200, tag: "wall" });

  dogBody = cd.addCharacter({
    x: 1100, y: GROUND_Y - 160, w: 110, h: 160, speed: 280, tag: "dog",
    // Use dummy key codes (201/202) — real arrow keys won't match these.
    // In SINGLE mode the AI presses these via VKEY; in DUAL mode we reassign them in resetGame.
    leftKey: 201, rightKey: 202
  });
  dogBody.facing = -1;
  // Right Shift
  dogBody.vy = 0;
  dogBody.onGround = true;
  player = cd.addCharacter({ x: 380, y: GROUND_Y - 160, w: 110, h: 160, speed: 280, tag: "player", leftKey: 65, rightKey: 68 });
  // Left Shift
  player.vy = 0;
  player.onGround = true;

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

  loadSound(
    "assets/sound/bg_music.mp3",
    function (s) { bgMusic = s; bgMusic.setLoop(true); bgMusic.setVolume(0.4); console.log("BG music loaded OK"); },
    function () { bgMusic = null; console.warn("BG music not found — continuing without it"); }
  );

  LANG_PATCHER.apply(); // apply language patches after p5 is ready

  startAnim = new StartScreenAnimator();
  startAnim.setImages(imgStartBg, imgTitle, imgBtnStart, imgBtnIntro);

  // levelselect screen animation
  levelAnim = new LevelScreenAnimator();
  modeAnim = new ModeScreenAnimator();
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
  else if (gameState === "CHOOSE") {
    levelAnim.update();
    drawLevelScreen();
  }
  else if (gameState === "MODE") {
    modeAnim.update();
    drawModeScreen();
  }
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

  // Draw mute/unmute button — always on top, top-left corner
  drawMuteButton();
}

function drawMuteButton() {
  push();
  resetMatrix();
  const bw = 48, bh = 36;
  const bx = 1600 - bw - 10, by = 900 - bh - 10;
  const hovered = (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh);
  fill(0, 0, 0, 160); noStroke(); rect(bx + 2, by + 2, bw, bh, 8);
  fill(hovered ? color(80, 80, 110) : color(30, 30, 55, 200)); stroke(140, 140, 200, 180); strokeWeight(1);
  rect(bx, by, bw, bh, 8);
  noStroke(); fill(255); textSize(20); textAlign(CENTER, CENTER); textFont('sans-serif');
  text(isMuted ? "🔇" : "🔊", bx + bw / 2, by + bh / 2);
  pop();
}

function mousePressed() {
  if (!nav) return;
  // Unlock audio context on first click (browser requirement)
  if (!soundUnlocked) {
    userStartAudio();
    soundUnlocked = true;
    // Start background music on first user interaction
    if (bgMusic && !bgMusic.isPlaying()) {
      bgMusic.play();
    }
  }

  // Mute/Unmute button click (bottom-right corner)
  const _mbx = 1600 - 48 - 10, _mby = 900 - 36 - 10;
  if (mouseX > _mbx && mouseX < _mbx + 48 && mouseY > _mby && mouseY < _mby + 36) {
    isMuted = !isMuted;
    if (bgMusic) {
      if (isMuted) bgMusic.setVolume(0);
      else bgMusic.setVolume(0.4);
    }
    return;
  }

  nav.handleClick(mouseX, mouseY);
}

// Prevent browser from scrolling on spacebar / arrow keys
function keyPressed() {
  // Track Left Shift (location 1) and Right Shift (location 2) separately

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


function keyReleased() {
  // Track Left Shift (location 1) and Right Shift (location 2) separately
}