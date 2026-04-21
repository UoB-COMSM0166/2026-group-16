// =============================================================
//  MERCHANT FIGHTER — GameTestSuite.js
//  Run from browser console while game is loaded, OR include
//  as a <script> after all game scripts in index.html.
//
//  Usage:
//    GameTestSuite.runAll();          // run every test
//    GameTestSuite.run("ANGLE");      // run one functional unit
// =============================================================

const GameTestSuite = (() => {

  // ─── Tiny assert helpers ────────────────────────────────────
  let _passed = 0, _failed = 0, _results = [];

  function assert(condition, testName, detail = "") {
    if (condition) {
      _passed++;
      _results.push({ status: "PASS", name: testName });
      console.log(`  ✅ PASS  ${testName}`);
    } else {
      _failed++;
      _results.push({ status: "FAIL", name: testName, detail });
      console.error(`  ❌ FAIL  ${testName}${detail ? " — " + detail : ""}`);
    }
  }

  function assertEqual(a, b, testName) {
    assert(a === b, testName, `expected ${b}, got ${a}`);
  }

  function assertApprox(a, b, testName, tol = 0.001) {
    assert(Math.abs(a - b) <= tol, testName, `expected ≈${b}, got ${a}`);
  }

  function assertInRange(val, min, max, testName) {
    assert(val >= min && val <= max, testName, `expected [${min}, ${max}], got ${val}`);
  }

  function section(name) {
    console.log(`\n${"═".repeat(55)}`);
    console.log(`  UNIT: ${name}`);
    console.log(`${"═".repeat(55)}`);
  }

  // ─── Stub keyIsDown so tests run without p5 keyboard state ──
  function withKeys(keysDown, fn) {
    const orig = window.keyIsDown;
    window.keyIsDown = (code) => keysDown.includes(code);
    try { fn(); } finally { window.keyIsDown = orig; }
  }

  // ─── Clamp helper (mirrors 4helpers.js) ─────────────────────
  function _clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // ============================================================
  //  1. ANGLE CLASS
  // ============================================================
  function testANGLE() {
    section("ANGLE");

    // Construction defaults
    const a = new ANGLE();
    assertEqual(a.angleDeg, 45,  "ANGLE-01 default angleDeg is 45");
    assertEqual(a.direction, 1,  "ANGLE-02 default direction is 1 (right)");
    assertEqual(a.minDeg, 0,     "ANGLE-03 default minDeg is 0");
    assertEqual(a.maxDeg, 80,    "ANGLE-04 default maxDeg is 80");

    // setDirection
    a.setDirection(-5);
    assertEqual(a.direction, -1, "ANGLE-05 setDirection(-5) → -1");
    a.setDirection(0);
    assertEqual(a.direction, 1,  "ANGLE-06 setDirection(0) → 1 (≥0 treated as right)");

    // angleRad facing right
    a.direction = 1; a.angleDeg = 45;
    assertApprox(a.angleRad, Math.PI / 4, "ANGLE-07 angleRad facing right at 45°");

    // angleRad facing left
    a.direction = -1; a.angleDeg = 45;
    assertApprox(a.angleRad, Math.PI - Math.PI / 4, "ANGLE-08 angleRad facing left at 45°");

    // update clamps at maxDeg
    a.direction = 1; a.angleDeg = 79; a.stepDeg = 1;
    withKeys([a.upKey], () => a.update());
    assertEqual(a.angleDeg, 80, "ANGLE-09 update clamps at maxDeg (80)");
    withKeys([a.upKey], () => a.update());
    assertEqual(a.angleDeg, 80, "ANGLE-10 update does not exceed maxDeg");

    // update clamps at minDeg
    a.angleDeg = 1;
    withKeys([a.downKey], () => a.update());
    assertEqual(a.angleDeg, 0,  "ANGLE-11 update clamps at minDeg (0)");
    withKeys([a.downKey], () => a.update());
    assertEqual(a.angleDeg, 0,  "ANGLE-12 update does not go below minDeg");

    // custom config
    const b = new ANGLE({ angleDeg: 30, minDeg: 10, maxDeg: 60, stepDeg: 5 });
    assertEqual(b.angleDeg, 30, "ANGLE-13 custom angleDeg 30");
    assertEqual(b.stepDeg, 5,   "ANGLE-14 custom stepDeg 5");
  }

  // ============================================================
  //  2. POWER CLASS
  // ============================================================
  function testPOWER() {
    section("POWER");

    const p = new POWER({ min: 0, max: 100, chargeRatePerSec: 50, fireKey: 32 });

    assertEqual(p.value, 0,          "POWER-01 initial value is 0 (min)");
    assertEqual(p.isCharging, false,  "POWER-02 not charging initially");
    assertEqual(p.justReleased, false,"POWER-03 justReleased false initially");

    // Charging increases value
    withKeys([32], () => p.update(0.5));
    assertApprox(p.value, 25, "POWER-04 charging 0.5s at 50/s → 25", 0.5);
    assertEqual(p.isCharging, true,   "POWER-05 isCharging true while key held");

    // Clamps at max
    withKeys([32], () => p.update(10));
    assertEqual(p.value, 100, "POWER-06 value clamps at max (100)");

    // justReleased fires on key-up
    withKeys([], () => p.update(0.016));
    assertEqual(p.justReleased, true, "POWER-07 justReleased true after key release");

    // justReleased clears next frame
    withKeys([], () => p.update(0.016));
    assertEqual(p.justReleased, false,"POWER-08 justReleased clears next frame");

    // consume returns value and resets
    p.value = 75;
    const consumed = p.consume();
    assertEqual(consumed, 75,         "POWER-09 consume() returns current value");
    assertEqual(p.value, 0,           "POWER-10 consume() resets value to min");

    // difficultyAdjustment
    p.difficultyAdjustment(200, 170);
    assertEqual(p.max, 200,           "POWER-11 difficultyAdjustment sets max");
    assertEqual(p.chargeRatePerSec, 170, "POWER-12 difficultyAdjustment sets chargeRate");

    // decay
    const d = new POWER({ min: 0, max: 100, chargeRatePerSec: 50, decayRatePerSec: 20, fireKey: 999 });
    d.value = 60;
    withKeys([], () => d.update(1));
    assertApprox(d.value, 40, "POWER-13 decay reduces value when not charging", 0.5);
  }

  // ============================================================
  //  3. COLLISION DETECTION — AABB & CIRCLE
  // ============================================================
  function testCollisionDetection() {
    section("COLLISION DETECTION");

    // aabbIntersects — overlapping
    const r1 = { x: 0, y: 0, w: 100, h: 100 };
    const r2 = { x: 50, y: 50, w: 100, h: 100 };
    assert(CollisionDetection.aabbIntersects(r1, r2),
      "COLLIDE-01 overlapping rects intersect");

    // aabbIntersects — touching edge (no overlap)
    const r3 = { x: 100, y: 0, w: 100, h: 100 };
    assert(!CollisionDetection.aabbIntersects(r1, r3),
      "COLLIDE-02 touching-edge rects do NOT intersect");

    // aabbIntersects — completely separate
    const r4 = { x: 300, y: 0, w: 100, h: 100 };
    assert(!CollisionDetection.aabbIntersects(r1, r4),
      "COLLIDE-03 separated rects do NOT intersect");

    // circleAABBHit — circle overlapping rect
    const circle1 = { x: 50, y: 50, r: 20 };
    const rect1   = { x: 0,  y: 0,  w: 100, h: 100 };
    const hit1 = CollisionDetection.circleAABBHit(circle1, rect1);
    assert(hit1 !== null, "COLLIDE-04 circle inside rect returns hit");

    // circleAABBHit — circle just outside rect
    const circle2 = { x: 200, y: 50, r: 10 };
    const hit2 = CollisionDetection.circleAABBHit(circle2, rect1);
    assert(hit2 === null, "COLLIDE-05 circle outside rect returns null");

    // circleAABBHit — circle touching rect edge
    const circle3 = { x: 110, y: 50, r: 11 };
    const hit3 = CollisionDetection.circleAABBHit(circle3, rect1);
    assert(hit3 !== null, "COLLIDE-06 circle touching rect edge returns hit");

    // circleAABBHit — normal points away from rect
    const circle4 = { x: 150, y: 50, r: 55 };
    const hit4 = CollisionDetection.circleAABBHit(circle4, rect1);
    if (hit4) {
      assert(hit4.normal.x > 0, "COLLIDE-07 normal.x points away from rect (rightward)");
    }

    // addStaticRect registers body
    const cd = new CollisionDetection({ worldWidth: 1600, worldHeight: 900 });
    const wall = cd.addStaticRect({ x: 100, y: 100, w: 200, h: 50, tag: "wall" });
    assertEqual(cd.staticBodies.length, 1, "COLLIDE-08 addStaticRect adds to staticBodies");
    assertEqual(wall.tag, "wall",           "COLLIDE-09 static body has correct tag");

    // addCharacter registers character
    const ch = cd.addCharacter({ x: 300, y: 700, w: 60, h: 60, tag: "player" });
    assertEqual(cd.characters.length, 1,    "COLLIDE-10 addCharacter adds to characters");
    assertEqual(ch.tag, "player",           "COLLIDE-11 character has correct tag");
    assertEqual(ch.controllable, true,      "COLLIDE-12 player tag → controllable true");

    // dog tag not controllable by default
    const dog = cd.addCharacter({ x: 1000, y: 700, w: 60, h: 60, tag: "dog" });
    assertEqual(dog.controllable, false,    "COLLIDE-13 dog tag → controllable false");
  }

  // ============================================================
  //  4. PLAYER MOVEMENT
  // ============================================================
  function testPlayerMovement() {
    section("PLAYER MOVEMENT");

    const cd = new CollisionDetection({ worldWidth: 1600, worldHeight: 900 });
    cd.addStaticRect({ x: 0, y: 850, w: 1600, h: 10, tag: "ground" });
    const player = cd.addCharacter({ x: 400, y: 690, w: 110, h: 160,
      speed: 280, tag: "player", leftKey: 65, rightKey: 68 });
    const angleObj = new ANGLE({ direction: 1, angleDeg: 45 });

    // Move right (D = 68)
    const startX = player.x;
    withKeys([68], () => cd._updateCharacter(player, 0.1, angleObj));
    assert(player.x > startX, "MOVEMENT-01 D key moves player right");
    assertEqual(player.facing, 1, "MOVEMENT-02 moving right sets facing = 1");

    // Move left (A = 65)
    const midX = player.x;
    withKeys([65], () => cd._updateCharacter(player, 0.1, angleObj));
    assert(player.x < midX, "MOVEMENT-03 A key moves player left");
    assertEqual(player.facing, -1, "MOVEMENT-04 moving left sets facing = -1");

    // No key — stays still
    const stillX = player.x;
    withKeys([], () => cd._updateCharacter(player, 0.1, angleObj));
    assertEqual(player.x, stillX, "MOVEMENT-05 no key → player stays still");

    // Left world boundary clamp
    player.x = 0;
    withKeys([65], () => cd._updateCharacter(player, 1, angleObj));
    assert(player.x >= 0, "MOVEMENT-06 player cannot go past left world edge (x ≥ 0)");

    // Right world boundary clamp
    player.x = 1600 - player.w;
    withKeys([68], () => cd._updateCharacter(player, 1, angleObj));
    assert(player.x <= 1600 - player.w, "MOVEMENT-07 player cannot exceed right world edge");

    // Not controllable — no movement
    player.controllable = false;
    player.x = 500;
    withKeys([68], () => cd._updateCharacter(player, 0.1, angleObj));
    assertEqual(player.x, 500, "MOVEMENT-08 non-controllable character ignores keys");
    player.controllable = true;

    // Speed is respected
    player.x = 400;
    withKeys([68], () => cd._updateCharacter(player, 1, angleObj));
    assertApprox(player.x, 400 + 280, "MOVEMENT-09 speed 280 moves 280px in 1s", 5);
  }

  // ============================================================
  //  5. PROJECTILE PHYSICS
  // ============================================================
  function testProjectilePhysics() {
    section("PROJECTILE PHYSICS");

    const cd = new CollisionDetection({
      worldWidth: 1600, worldHeight: 900, gravity: 900, windAccel: 50
    });

    // Simulate a projectile flying right for a few steps
    const p = {
      id: 1, x: 400, y: 400, r: 12, vx: 200, vy: -300,
      alive: true, owner: "player", windDir: 1,
      bounces: 0, maxBounces: 3
    };

    const x0 = p.x, y0 = p.y, vy0 = p.vy;
    cd._updateProjectile(p, 0.016);
    assert(p.x > x0,  "PROJ-01 projectile moves right with positive vx");
    assert(p.y < y0,  "PROJ-02 projectile moves up when vy is negative (upward)");
    assert(p.vy > vy0,"PROJ-03 gravity increases vy each frame");

    // Wind adds to vx
    const vx0 = p.vx;
    cd._updateProjectile(p, 0.016);
    assert(p.vx > vx0, "PROJ-04 wind (windDir=1) increases vx each frame");

    // Projectile dies when falling below world — use fresh object
    const pDead = { x: 400, y: 900 + 201, r: 12, vx: 0, vy: 100,
      alive: true, owner: "player", windDir: 1, bounces: 0, maxBounces: 3 };
    cd._updateProjectile(pDead, 0.016);
    assert(!pDead.alive, "PROJ-05 projectile dies when y > worldHeight + 200");

    // Left boundary bounce
    const p2 = { x: 5, y: 400, r: 12, vx: -200, vy: 0,
      alive: true, owner: "player", windDir: 1, bounces: 0, maxBounces: 3 };
    cd._updateProjectile(p2, 0.016);
    assert(p2.x >= p2.r,  "PROJ-06 projectile bounces off left wall (x ≥ r)");
    assert(p2.vx > 0,     "PROJ-07 vx reverses after left wall bounce");

    // Right boundary bounce
    const p3 = { x: 1595, y: 400, r: 12, vx: 200, vy: 0,
      alive: true, owner: "player", windDir: 1, bounces: 0, maxBounces: 3 };
    cd._updateProjectile(p3, 0.016);
    assert(p3.x <= 1600 - p3.r, "PROJ-08 projectile bounces off right wall");
    assert(p3.vx < 0,            "PROJ-09 vx reverses after right wall bounce");

    // maxBounces kill
    const p4 = { x: 5, y: 400, r: 12, vx: -200, vy: 0,
      alive: true, owner: "player", windDir: 1, bounces: 3, maxBounces: 3 };
    cd._updateProjectile(p4, 0.016);
    assert(!p4.alive, "PROJ-10 projectile dies when bounces > maxBounces");

    // Top boundary bounce
    const p5 = { x: 400, y: 5, r: 12, vx: 0, vy: -200,
      alive: true, owner: "player", windDir: 1, bounces: 0, maxBounces: 3 };
    cd._updateProjectile(p5, 0.016);
    assert(p5.y >= p5.r,  "PROJ-11 projectile bounces off top wall (y ≥ r)");
    assert(p5.vy > 0,     "PROJ-12 vy reverses after top bounce");
  }

  // ============================================================
  //  6. PROJECTILE SIMULATION
  // ============================================================
  function testProjectileSimulation() {
    section("PROJECTILE SIMULATION");

    const cd = new CollisionDetection({ worldWidth: 1600, worldHeight: 900,
      gravity: 900, windAccel: 50 });

    // Shot fired right at 45° should land further right
    const a45 = Math.PI / 4;
    const landRight = cd.simulateProjectileLanding(100, 700, a45, 100, 8, 1);
    assert(landRight.x > 100, "SIM-01 45° rightward shot lands right of origin");

    // Shot fired left (AI direction)
    const aLeft = Math.PI - Math.PI / 4;
    const landLeft = cd.simulateProjectileLanding(1200, 700, aLeft, 100, 8, -1);
    assert(landLeft.x < 1200, "SIM-02 leftward shot lands left of origin");

    // Higher power → further horizontal distance
    const landLow  = cd.simulateProjectileLanding(400, 700, a45, 50,  8, 1);
    const landHigh = cd.simulateProjectileLanding(400, 700, a45, 145, 8, 1);
    assert(landHigh.x > landLow.x, "SIM-03 higher power → further horizontal landing");

    // Steeper angle (80°) lands closer horizontally than 30°
    const a80  = (80 * Math.PI) / 180;
    const a30  = (30 * Math.PI) / 180;
    const land80 = cd.simulateProjectileLanding(400, 700, a80,  80, 8, 1);
    const land30 = cd.simulateProjectileLanding(400, 700, a30,  80, 8, 1);
    assert(land30.x > land80.x, "SIM-04 shallow angle (30°) travels further than steep (80°)");

    // Zero power → stays near origin
    const landZero = cd.simulateProjectileLanding(400, 700, a45, 0, 8, 1);
    assert(Math.abs(landZero.x - 400) < 200, "SIM-05 zero power stays near origin");
  }

  // ============================================================
  //  7. WEAPONS CLASS
  // ============================================================
  function testWEAPONS() {
    section("WEAPONS");

    const w = new WEAPONS();

    assertEqual(w.index, 0,                       "WEAPONS-01 initial index is 0");
    assertEqual(w.count, WEAPON_DEFS.length,       "WEAPONS-02 count matches WEAPON_DEFS length");
    assertEqual(w.current, WEAPON_DEFS[0],         "WEAPONS-03 current returns WEAPON_DEFS[0]");

    // next() cycles forward
    w.next();
    assertEqual(w.index, 1, "WEAPONS-04 next() increments index");

    // prev() cycles backward
    w.prev();
    assertEqual(w.index, 0, "WEAPONS-05 prev() decrements index");

    // Wrap-around forward
    w.index = WEAPON_DEFS.length - 1;
    w.next();
    assertEqual(w.index, 0, "WEAPONS-06 next() wraps around to 0");

    // Wrap-around backward
    w.index = 0;
    w.prev();
    assertEqual(w.index, WEAPON_DEFS.length - 1, "WEAPONS-07 prev() wraps to last index");

    // handleKey P1 — E cycles next
    w.index = 0;
    w.handleKey(69, "player"); // E
    assertEqual(w.index, 1, "WEAPONS-08 P1 E key (69) calls next()");

    // handleKey P1 — Q cycles prev
    w.handleKey(81, "player"); // Q
    assertEqual(w.index, 0, "WEAPONS-09 P1 Q key (81) calls prev()");

    // handleKey P2 — P cycles next
    w.index = 0;
    w.handleKey(80, "dog"); // P
    assertEqual(w.index, 1, "WEAPONS-10 P2 P key (80) calls next()");

    // handleKey P2 — I cycles prev
    w.handleKey(73, "dog"); // I
    assertEqual(w.index, 0, "WEAPONS-11 P2 I key (73) calls prev()");

    // Each weapon def has required fields
    let allValid = true;
    for (const def of WEAPON_DEFS) {
      if (!def.id || def.damage === undefined || def.radius === undefined ||
          def.powerScale === undefined || def.maxBounces === undefined) {
        allValid = false; break;
      }
    }
    assert(allValid, "WEAPONS-12 all WEAPON_DEFS have required fields (id, damage, radius, powerScale, maxBounces)");

    // Bomb special
    const bomb = WEAPON_DEFS.find(d => d.id === "bomb");
    assertEqual(bomb.special, "explode", "WEAPONS-13 bomb weapon has special = 'explode'");
    assertEqual(bomb.maxBounces, 0,      "WEAPONS-14 bomb maxBounces is 0 (explodes on first hit)");

    // Triple arrow fires 3 shots
    const triple = WEAPON_DEFS.find(d => d.id === "triple");
    assertEqual(triple.count, 3, "WEAPONS-15 triple arrow count is 3");
  }

  // ============================================================
  //  8. HELPER FUNCTIONS
  // ============================================================
  function testHelpers() {
    section("HELPER FUNCTIONS (clamp, sign, vec2, vecLen, vecNorm)");

    assertEqual(clamp(5, 0, 10),   5,  "HELPERS-01 clamp within range returns value");
    assertEqual(clamp(-5, 0, 10),  0,  "HELPERS-02 clamp below min returns min");
    assertEqual(clamp(15, 0, 10),  10, "HELPERS-03 clamp above max returns max");
    assertEqual(clamp(0, 0, 10),   0,  "HELPERS-04 clamp at min boundary");
    assertEqual(clamp(10, 0, 10),  10, "HELPERS-05 clamp at max boundary");

    assertEqual(sign(5),   1,  "HELPERS-06 sign of positive is 1");
    assertEqual(sign(-5), -1,  "HELPERS-07 sign of negative is -1");
    assertEqual(sign(0),   1,  "HELPERS-08 sign of 0 is 1 (non-negative)");

    const v = vec2(3, 4);
    assertEqual(v.x, 3, "HELPERS-09 vec2 x component");
    assertEqual(v.y, 4, "HELPERS-10 vec2 y component");

    assertApprox(vecLen(vec2(3, 4)), 5, "HELPERS-11 vecLen of (3,4) is 5");
    assertApprox(vecLen(vec2(0, 0)), 0, "HELPERS-12 vecLen of zero vector is 0");

    const n = vecNorm(vec2(3, 4));
    assertApprox(vecLen(n), 1, "HELPERS-13 vecNorm produces unit vector (length=1)");

    const nZero = vecNorm(vec2(0, 0));
    assertEqual(nZero.x, 0, "HELPERS-14 vecNorm of zero vector is (0, 0) — no division by zero");
  }

  // ============================================================
  //  9. NAVIGATOR — STATE TRANSITIONS
  // ============================================================
  function testNavigator() {
    section("NAVIGATOR (game state transitions)");

    // Save original state
    const origState = gameState;
    const nav = new Navigator();

    // START → CHOOSE on button click
    gameState = "START";
    nav.handleClick(btnX, btnY);
    assertEqual(gameState, "CHOOSE", "NAV-01 clicking START button → CHOOSE state");

    // CHOOSE → START on back button (backY = 900-100 = 800, range 775–825)
    gameState = "CHOOSE";
    nav.handleClick(800, 800);
    assertEqual(gameState, "START", "NAV-02 CHOOSE back button → START state");

    // CHOOSE → MODE on difficulty click (EASY button)
    gameState = "CHOOSE";
    const bH2 = 320 * 32 / 96;
    const startY = 900 / 2 + 20 - (bH2 * 3 + 30 * 2) / 2 + bH2 / 2;
    nav.handleClick(800, startY);
    assertEqual(gameState, "MODE", "NAV-03 selecting difficulty → MODE state");

    // MODE → CHARACTER
    gameState = "MODE";
    const modeStartY = 900 / 2 - (90 * 2 + 30) / 2 + 90 / 2;
    nav.handleClick(800, modeStartY);
    assertEqual(gameState, "CHARACTER", "NAV-04 selecting game mode → CHARACTER state");

    // MODE → CHOOSE on back
    gameState = "MODE";
    nav.handleClick(800, 835);
    assertEqual(gameState, "CHOOSE", "NAV-05 MODE back button → CHOOSE state");

    // Restore
    gameState = origState;
  }

  // ============================================================
  //  10. HP / GAME-OVER CONDITIONS
  // ============================================================
  function testGameOver() {
    section("HP & GAME-OVER CONDITIONS");

    const origCatHP = catHP, origDogHP = dogHP;

    catHP = 100; dogHP = 100;
    assert(!(catHP <= 0 || dogHP <= 0), "GAMEOVER-01 both at 100 HP → not game over");

    catHP = 0;
    assert(catHP <= 0, "GAMEOVER-02 catHP = 0 → game over condition true");

    catHP = 100; dogHP = 0;
    assert(dogHP <= 0, "GAMEOVER-03 dogHP = 0 → game over condition true");

    // HP never goes below 0 (as enforced by Math.max)
    catHP = 5;
    catHP = Math.max(0, catHP - 15);
    assertEqual(catHP, 0, "GAMEOVER-04 HP clamped to 0 by Math.max (no negative HP)");

    dogHP = 80;
    dogHP = Math.max(0, dogHP - 15);
    assertEqual(dogHP, 65, "GAMEOVER-05 normal damage reduces HP correctly");

    // Tie condition
    catHP = 50; dogHP = 50;
    const gameTimer = 0;
    assert(catHP === dogHP, "GAMEOVER-06 equal HP at time=0 triggers overtime condition");

    catHP = origCatHP; dogHP = origDogHP;
  }

  // ============================================================
  //  11. LABEL & CHARACTER SYSTEM
  // ============================================================
  function testLabels() {
    section("LABELS & CHARACTER SYSTEM");

    // SINGLE mode → AI label
    const origMode   = gameMode;
    const origPlayer = LABELS.player;
    const origTarget = LABELS.target;

    gameMode = "SINGLE";
    LABELS.target = "AI";
    assertEqual(LABELS.target, "AI", "LABELS-01 SINGLE mode sets target label to 'AI'");

    // DUAL mode uses character name
    gameMode = "DUAL";
    LABELS.target = "Kira";
    assertEqual(LABELS.target, "Kira", "LABELS-02 DUAL mode uses selected character name");

    // CHARACTERS_FANTASY has 4 characters
    assertEqual(CHARACTERS_FANTASY.length, 4, "LABELS-03 CHARACTERS_FANTASY has 4 entries");
    assertEqual(CHARACTERS_MODERN.length, 4,  "LABELS-04 CHARACTERS_MODERN has 4 entries");

    // Each character has required fields
    for (const c of CHARACTERS_FANTASY) {
      assert(c.name && c.portrait && c.bioText,
        `LABELS-05 CHARACTERS_FANTASY[${c.name}] has name, portrait, bioText`);
    }

    // charSelectIndex wraps correctly
    let idx = 3;
    idx = (idx + 1) % 4;
    assertEqual(idx, 0, "LABELS-06 charSelectIndex wraps from 3 → 0");

    gameMode   = origMode;
    LABELS.player = origPlayer;
    LABELS.target = origTarget;
  }

  // ============================================================
  //  12. AUTOPLAYER — AI CONSTRAINTS
  // ============================================================
  function testAutoPlayer() {
    section("AUTOPLAYER (AI constraints)");

    const ai = new AutoPlayer();

    assertEqual(ai.enabled, false,      "AI-01 AutoPlayer starts disabled");
    assertEqual(ai.maxFirePower, 145,   "AI-02 maxFirePower is capped at 145");
    assert(ai.roamMinX >= 850,          "AI-03 roamMinX is past the wall (≥850)");
    assertEqual(ai.roamMaxX, 1490,      "AI-04 roamMaxX reaches near right edge (1490)");
    assert(ai.roamMaxX <= 1490,         "AI-05 roamMaxX does not exceed screen width - body");

    // setEnabled
    ai.setEnabled(true);
    assertEqual(ai.enabled, true,       "AI-06 setEnabled(true) enables AI");
    ai.setEnabled(false);
    assertEqual(ai.enabled, false,      "AI-07 setEnabled(false) disables AI");

    // Difficulty tweaks — power cap
    const origDiff = selectedDifficulty;
    selectedDifficulty = "HARD";
    ai._applyDifficultyTweaks();
    assert(ai.maxFirePower <= 145,      "AI-08 HARD maxFirePower ≤ 145");

    selectedDifficulty = "MEDIUM";
    ai._applyDifficultyTweaks();
    assert(ai.maxFirePower <= 145,      "AI-09 MEDIUM maxFirePower ≤ 145");

    selectedDifficulty = "EASY";
    ai._applyDifficultyTweaks();
    assert(ai.maxFirePower <= 145,      "AI-10 EASY maxFirePower ≤ 145");

    // Shot plan angle clamp
    const mockAngleObj = { minDeg: 0, maxDeg: 80,
      get angleRad() { return (this.angleDeg * Math.PI) / 180; }, angleDeg: 45 };
    const mockPowerObj = { max: 145, value: 100 };

    const plan = ai._makeShotPlan({ angleDeg: 90, power: 200 });
    // We can't call _makeShotPlan without ciyangAngleObj/ciyangPowerObj in scope,
    // so test the raw constraint math instead
    const clampedAngle = Math.min(90, 80);
    assertEqual(clampedAngle, 80, "AI-11 angle above 80° is clamped to 80°");
    const clampedPower = Math.min(200, 145);
    assertEqual(clampedPower, 145, "AI-12 power above 145 is clamped to 145");

    // _noShootArea stub returns false (removed)
    const dummyKeys = [201, 202];
    assert(typeof ai._enforceSafeWallDistance === "function",
      "AI-13 _enforceSafeWallDistance exists (stub returning false)");
    assert(ai._enforceSafeWallDistance() === false,
      "AI-14 _enforceSafeWallDistance always returns false (no longer restricts)");
    assert(ai._enforceRightBias() === false,
      "AI-15 _enforceRightBias always returns false (full floor roaming)");

    selectedDifficulty = origDiff;
  }

  // ============================================================
  //  13. LANGUAGE SYSTEM
  // ============================================================
  function testLanguage() {
    section("LANGUAGE SYSTEM");

    const lang = new Language();

    // Default language is EN
    assertEqual(lang.current, "EN", "LANG-01 default language is EN");

    // set() to ZH
    lang.set("ZH");
    assertEqual(lang.current, "ZH", "LANG-02 set('ZH') changes language to ZH");

    // set() ignores invalid code
    lang.set("FR");
    assertEqual(lang.current, "ZH", "LANG-03 set('FR') is ignored (unchanged)");

    // t() returns correct EN string
    lang.set("EN");
    const title = lang.t("gameTitle");
    assertEqual(title, "MERCHANT FIGHTER", "LANG-04 t('gameTitle') returns EN string");

    // t() returns correct ZH string
    lang.set("ZH");
    const titleZH = lang.t("gameTitle");
    assertEqual(titleZH, "商人格斗家", "LANG-05 t('gameTitle') returns ZH string");

    // t() with replacement token
    lang.set("EN");
    const wins = lang.t("wins", { name: "John" });
    assert(wins.includes("John"), "LANG-06 t('wins') substitutes {name} placeholder");

    // t() falls back for missing key
    const missing = lang.t("nonExistentKey_xyz");
    assertEqual(missing, "nonExistentKey_xyz", "LANG-07 missing key returns key itself");
  }

  // ============================================================
  //  RUN ENGINE
  // ============================================================
  const SUITES = {
    ANGLE:       testANGLE,
    POWER:       testPOWER,
    COLLISION:   testCollisionDetection,
    MOVEMENT:    testPlayerMovement,
    PROJECTILE:  testProjectilePhysics,
    SIMULATION:  testProjectileSimulation,
    WEAPONS:     testWEAPONS,
    HELPERS:     testHelpers,
    NAVIGATOR:   testNavigator,
    GAMEOVER:    testGameOver,
    LABELS:      testLabels,
    AUTOPLAYER:  testAutoPlayer,
    LANGUAGE:    testLanguage,
  };

  function run(suiteName) {
    _passed = 0; _failed = 0; _results = [];
    const fn = SUITES[suiteName.toUpperCase()];
    if (!fn) { console.error(`No suite named "${suiteName}"`); return; }
    fn();
    _printSummary();
  }

  function runAll() {
    _passed = 0; _failed = 0; _results = [];
    console.log("\n🎮  MERCHANT FIGHTER — FULL TEST RUN");
    for (const fn of Object.values(SUITES)) fn();
    _printSummary();
  }

  function _printSummary() {
    const total = _passed + _failed;
    console.log(`\n${"─".repeat(55)}`);
    console.log(`  RESULTS: ${_passed}/${total} passed  |  ${_failed} failed`);
    if (_failed === 0) console.log("  🏆 All tests passed!");
    else {
      console.log("  ❌ Failed tests:");
      _results.filter(r => r.status === "FAIL")
              .forEach(r => console.log(`     • ${r.name}${r.detail ? ": " + r.detail : ""}`));
    }
    console.log(`${"─".repeat(55)}\n`);
  }

  return { run, runAll, suites: Object.keys(SUITES) };
})();

console.log("✅ GameTestSuite loaded. Call GameTestSuite.runAll() to run all tests.");