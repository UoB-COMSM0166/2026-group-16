//console.log("[AUTO] 9autoplayer.js LOADED");

//Virtual Keyboard + allow user input in single player mode
(function () {

    //Mapping the virtual keyboard
    //Physical keyboard: https://p5js.org/reference/p5/keyIsDown/
    window.VKEY = {
        enabled: false,
        down: new Set(),
        press(code) { this.down.add(code); },
        release(code) { this.down.delete(code); },
        //release all key at once
        clear() { this.down.clear(); },
        isDown(code) { return this.down.has(code); },
    };

    //Capture the *real* p5 keyIsDown exactly once, then wrap safely to avoid breaking the
    //player's real input
    let REAL_KEY_IS_DOWN = null;
    let wrapperInstalled = false;
    function captureRealOnce() {

        if (REAL_KEY_IS_DOWN) return true;
        const fn = window.keyIsDown;
        if (typeof fn !== "function") return false;
        if (fn.__vkeyWrapper === true) return false;

        //capture the real keyIsDown
        REAL_KEY_IS_DOWN = fn;
        //console.log("[VKEY] captured REAL keyIsDown ✓");
        return true;
    }

    function vkeyWrapper(code) {
        //Virtual override
        if (window.VKEY.enabled && window.VKEY.isDown(code)) return true;

        //Real keyboard fallback (will close this door after development completed)
        return typeof REAL_KEY_IS_DOWN === "function" ? REAL_KEY_IS_DOWN(code) : false;
    }
    vkeyWrapper.__vkeyWrapper = true;

    //Install after p5 defines keyIsDown. Try for ~2 seconds.
    let attempts = 0;
    const timer = setInterval(() => {
        attempts++;

        //First, capture the real function (once)
        captureRealOnce();

        //Then, wrap (once)
        if (!wrapperInstalled && REAL_KEY_IS_DOWN && typeof window.keyIsDown === "function") {
            window.keyIsDown = vkeyWrapper;
            wrapperInstalled = true;
            //console.log("[VKEY] keyIsDown wrapped ✓");
        }

        //Stop trying if this takes too long, 40 attempts would be enough
        if (wrapperInstalled || attempts > 40) {clearInterval(timer);}
    }, 50);
})();

// ---- AutoPlayer ----
class AutoPlayer {
    constructor() {
        this.enabled = false;

        //Timing / state
        this.nextFireTime = 0;
        this.fireHolding = false;
        this.fireHoldUntil = 0;
        this.forceReleaseFrame = false;

        //Failsafe to prevent deadlocks
        this.chargeStartTime = 0;
        //If held longer, force release/reset
        this.maxChargeSeconds = 1.5;

        //Tuning
        this.minFirePower = 50;
        this.maxFirePower = 145;

        //How tightly we require angle alignment before we start charging
        this.aimToleranceDeg = 3.0;
        this.aimOkDeg = 28;   // wider tolerance → shoots sooner

        //If POWER is super low, avoid micro-shots
        this.minShotPower = 15;

        //Hit/Miss mechanics
        this.hitChance = 0.65;
        this.shouldHitThisShot = false;

        //Creating noise for smooth movements
        this.noiseTime = 0;
        this.noiseScale = 0.5;
        //Creating noise for shooting confidence
        this.shootingNoiseTime = 0;
        this.shootingNoiseScale = 0.3;

        //Prevent jittering while aiming/ charging
        this.lockMoveUntil = 0;

        //Get away from middle barrier(imgWall)
        this.wallL = 750;
        this.wallR = 850;

        //Keeping AI on the right — lowered so AI roams more freely
        this.rightBiasX = 920;

        //Movement control
        this.nextMoveDecisionTime = 0;
        //left: -1 | idle: 0 | right: +1
        this.moveDir = 0;

        //Force shot much sooner so AI shoots frequently
        this.lastShotTime = 0;
        this.forceShotAfter = 1.8;

        //px around the wall we never want to land in
        this.wallKeepOut = 60;

        //Eliminate jitterings
        this.moveIntent = 0;
        this.moveIntentUntil = 0;

        // ── Target-based roaming ──────────────────────────────────
        // AI picks a random X target on the right half and walks to it,
        // then picks a new one. Completely independent of shooting state.
        this.roamTargetX   = 1100;   // current destination X (mid of dogBody)
        this.roamPickTime  = 0;      // when to pick next target
        this.roamInterval  = 1.2;    // seconds between target picks
        this.roamMinX      = 870;    // left edge AI can walk to (just past wall)
        this.roamMaxX      = 1490;   // right edge (1600 - body width 110)

        // ── Weapon auto-switching ─────────────────────────────────
        this.weaponSwitchTime = 0;   // next time to switch weapon

    }

    _setMoveIntent(dir, now, dur) {
        this.moveIntent = dir;
        this.moveIntentUntil = now + dur;
    }

    _applyMoveIntent(KEY_LEFT, KEY_RIGHT) {
        if (this.moveIntent < 0) { VKEY.press(KEY_LEFT);  VKEY.release(KEY_RIGHT); }
        else if (this.moveIntent > 0) { VKEY.press(KEY_RIGHT); VKEY.release(KEY_LEFT); }
        else { VKEY.release(KEY_LEFT); VKEY.release(KEY_RIGHT); }
    }

    setEnabled(on) {
        //Always make it a boolean
        this.enabled = !!on;

        if (window.VKEY) {
            VKEY.enabled = this.enabled;
            VKEY.clear();
        }

        this._hardResetFire();
        this.nextFireTime = 0;
        this.lastShotTime = millis() / 1000;
        this.lockMoveUntil = 0;

        //console.log("[AUTO] setEnabled =", this.enabled, "| VKEY ready =", !!window.VKEY);
    }

    _canRunAI(){
        //AI disabled
        if (!this.enabled) {return false;}

        //Virtual keyboard not ready
        if (!window.VKEY) {return false;}

        //Not gaming state, return
        if (gameState !== "PLAY") {
            VKEY.clear();
            this._hardResetFire();
            return false;
        }

        //One of the players died or time out state, return
        const timeUp = gameTimer <= 0 && catHP !== dogHP;
        const gameOver = catHP <= 0 || dogHP <= 0 || timeUp;
        if (gameOver) {
            VKEY.clear();
            this._hardResetFire();
            return false;
        }
        return true;
    }

    _applyDifficultyTweaks(){
        if (selectedDifficulty === "HARD") {
            this.maxFirePower = 145;
            this.hitChance = 0.80;
            this.aimOkDeg = 32;
            this.forceShotAfter = 0.8;
            this.minShotPower = 20;
            this.rightBiasX = 900;
        } else if (selectedDifficulty === "MEDIUM") {
            this.maxFirePower = 145;
            this.hitChance = 0.70;
            this.aimOkDeg = 28;
            this.forceShotAfter = 1.4;
            this.minShotPower = 18;
            this.rightBiasX = 920;
        } else {
            // EASY — shoots frequently, just less accurate
            this.maxFirePower = 145;
            this.hitChance = 0.55;
            this.aimOkDeg = 28;
            this.forceShotAfter = 1.8;
            this.minShotPower = 15;
            this.rightBiasX = 940;
        }
    }

    _getKeys(){
        //Read key codes to control
        //Reference: https://www.toptal.com/developers/keycode
        return{
            //UP_ARROW
            KEY_UP: ciyangAngleObj.upKey,
            //DOWN_ARROW
            KEY_DOWN: ciyangAngleObj.downKey,
            //SPACE
            KEY_FIRE: ciyangPowerObj.fireKey,
            //LEFT_ARROW
            KEY_LEFT: dogBody.leftKey,
            //RIGHT_ARROW
            KEY_RIGHT: dogBody.rightKey,
        };
    }

    _handleForceReleaseFrame(KEY_FIRE){
        if (!this.forceReleaseFrame) {return false;}
        VKEY.release(KEY_FIRE);
        this.forceReleaseFrame = false;
        return true;
    }

    _handleDeadlockFailsafe(KEY_FIRE, now){
        if (!this.fireHolding) {return false;}
        if ((now - this.chargeStartTime) <= this.maxChargeSeconds) {return false;}
        VKEY.release(KEY_FIRE);
        this.forceReleaseFrame = true;
        this._hardResetFire();
        this.nextFireTime = now + 0.25;
        return true;
    }

    _handleCooldown(KEY_FIRE, now){
        if (now >= this.nextFireTime) { return false;}
        VKEY.release(KEY_FIRE);
        this._softResetFire();
        return true;
    }

    _makeShotPlan(shot){
        const desiredAngle = clamp(shot.angleDeg, ciyangAngleObj.minDeg, ciyangAngleObj.maxDeg);
        const maxAllowed = Math.min(this.maxFirePower, ciyangPowerObj.max);
        const desiredPower = clamp(shot.power, this.minFirePower, maxAllowed);

        return {desiredAngle, desiredPower};
    }

    _updateAimKeys(KEY_UP, KEY_DOWN, angleErr){
        if (Math.abs(angleErr) <= this.aimToleranceDeg) { return;}
        if (angleErr > 0) VKEY.press(KEY_UP);
        else {VKEY.press(KEY_DOWN);}
    }

    _isAimOk(angleErr, overdue){
        const okDeg = overdue ? (this.aimOkDeg + 10) : this.aimOkDeg;
        //despite relaxing the angle tolerance when overdue, it will not be too off
        return Math.abs(angleErr) <= okDeg;
    }

    _computeConfidence(angleErr){
        //noise() gives better outcomes than Math.random()
        const rawNoise = noise(this.shootingNoiseTime);
        const aimQuality = clamp(1 - Math.abs(angleErr) / this.aimOkDeg, 0, 1);
        return rawNoise * 0.40 + aimQuality * 0.60;
    }

    _getShootThreshold(){
        if (selectedDifficulty === "HARD")   { return 0.12; }
        else if (selectedDifficulty === "MEDIUM") { return 0.18; }
        return 0.22; // EASY — still shoots often
    }

    _shouldStartCharge({aimOk, overdue, confidence, shootThreshold, startFactor}){
        if (this.fireHolding) {return false;}
        if (overdue) { return true;}
        if (aimOk) { return false;}

        //EASY: no extra hesitation once aimOk
        if (selectedDifficulty === "EASY") return true;

        return confidence > (shootThreshold * startFactor);
    }

    _startCharge(KEY_FIRE, now, powerErr){
        VKEY.press(KEY_FIRE);
        this.fireHolding = true;
        this.chargeStartTime = now;

        const rate = (selectedDifficulty==="HARD")? 170:90;

        //Hold time: ensure POWER has time to rise; adjust by power error
        const minHold = (selectedDifficulty === "HARD") ? 0.10 : ((selectedDifficulty === "MEDIUM")? 0.12: 0.14);

        const extraCap = (selectedDifficulty === "HARD") ? 0.85 : ((selectedDifficulty === "MEDIUM")? 1.05: 1.35);

        //Extra hold scaled to how far we are from target (cap it)
        const extra = (powerErr > 0) ? clamp((powerErr / rate)*1.15, 0, extraCap) : 0;

        this.fireHoldUntil = now + (minHold + extra);

        //Lock movement so aim doesn't jitter during initial charge
        this.lockMoveUntil = now + ((selectedDifficulty === "HARD") ? 0.15 : 0.20);
    }

    _contOrRealeaseCharge(KEY_FIRE, now){
        if (now < this.fireHoldUntil){
            VKEY.press(KEY_FIRE);
            return;
        }

        //If power is still tiny, extend a hold rather than firing blanks
        if (ciyangPowerObj.value < this.minShotPower) {
            this.fireHoldUntil = now + 0.06;
            VKEY.press(KEY_FIRE);
            return;
        }

        // Release to shoot
        VKEY.release(KEY_FIRE);
        this.forceReleaseFrame = true;
        this._hardResetFire();
        this.lastShotTime = now;

        // More frequent shots (especially EASY)
        let minCooldown, maxCooldown;
        if (selectedDifficulty === "HARD") { minCooldown = 0.10; maxCooldown = 0.22; }
        else if (selectedDifficulty === "MEDIUM") { minCooldown = 0.18; maxCooldown = 0.32; }
        else { minCooldown = 0.25; maxCooldown = 0.45; }

        this.nextFireTime = now + (minCooldown + Math.random() * (maxCooldown - minCooldown));
    }

    _noShootArea(KEY_FIRE, KEY_RIGHT, KEY_LEFT, now){
        const dogMid = dogBody.x + dogBody.w/2;
        // Only block shooting if AI is on the wrong side of the wall (left of it)
        const noShootX = this.wallR + 10;

        if (dogMid >= noShootX){ return false; }

        VKEY.release(KEY_FIRE);
        this._softResetFire();
        VKEY.press(KEY_RIGHT);
        VKEY.release(KEY_LEFT);
        this.nextFireTime = now + 0.2;
        return true;
    }

    update(dt) {
        //---------------------------------------
        //----------Each update set-up-----------
        //---------------------------------------
        if (!this._canRunAI()) {return;}

        const now = millis() / 1000;

        this.shootingNoiseTime += dt * this.shootingNoiseScale;

        //Difficulty tweaks
        this._applyDifficultyTweaks();

        // ── Auto weapon switching ─────────────────────────────────
        // Switch to a random weapon every few seconds
        if (now >= this.weaponSwitchTime && typeof dogWeapons !== "undefined") {
            const switchInterval = (selectedDifficulty === "HARD")   ? (3 + Math.random() * 3)
                                 : (selectedDifficulty === "MEDIUM")  ? (4 + Math.random() * 4)
                                 :                                       (5 + Math.random() * 4);
            dogWeapons.index = Math.floor(Math.random() * dogWeapons.count);
            this.weaponSwitchTime = now + switchInterval;
        }

        //If we haven't fired for too long, force a shot attempt
        const overdue = (now - this.lastShotTime) >= this.forceShotAfter;

        const keys = this._getKeys();


        //----------------------------------------
        //----------Left-right movement-----------
        //----------------------------------------
        //AI always on the right, faces left
        dogBody.facing = -1;
        ciyangAngleObj.setDirection(-1);

        // Movement always active — roaming is never locked by charging
        this._updateMovement(keys.KEY_LEFT, keys.KEY_RIGHT, dt, {});


        //--------------------------------------
        //----------Shoot control---------------
        //--------------------------------------
        //Aim keys: decide fresh each frame
        VKEY.release(keys.KEY_UP);
        VKEY.release(keys.KEY_DOWN);

        //Ensure at least one fire up frame after releasing
        if (this._handleForceReleaseFrame(keys.KEY_FIRE)){ return;}

        //DEADLOCK FAILSAFE: if held too long, force release + reset
        //prevents infinite holding
        if (this._handleDeadlockFailsafe(keys.KEY_FIRE, now)){ return;}

        //Cooldown
        if (this._handleCooldown(keys.KEY_FIRE, now)){ return;}

        //Decide hit/miss per shot (not per frame) -> level dependent
        if (!this.fireHolding) {
            this.shouldHitThisShot = (Math.random() < this.hitChance);
        }

        const shot = this._computeShot({
            shooter: dogBody,
            target: player,
            powerScale: 8,
            maxPower: ciyangPowerObj.max,
            shouldHit: this.shouldHitThisShot,
        });

        if (!shot) {
            VKEY.release(keys.KEY_FIRE);
            this._softResetFire();
            this.nextFireTime = now + 0.2;
            return;
        }

        const shotPlan = this._makeShotPlan(shot);

        //If fall into area too close to middle barrier, stop shooting
        if (this._noShootArea(keys.KEY_FIRE, keys.KEY_RIGHT, keys.KEY_LEFT, now)) {return;}

        const angleErr = shotPlan.desiredAngle - ciyangAngleObj.angleDeg;
        const powerErr = shotPlan.desiredPower - ciyangPowerObj.value;

        //Resolving jittering issue in EASY level
        if (selectedDifficulty === "EASY" && !this.fireHolding && Math.abs(angleErr) <= (this.aimOkDeg + 2)) {
            VKEY.release(keys.KEY_LEFT);
            VKEY.release(keys.KEY_RIGHT);
        }

        //Aim correction
        this._updateAimKeys (keys.KEY_UP, keys.KEY_DOWN, angleErr);

        //Decide if aim is "good enough" -> 1. overdue too long, shot 2. good angle, shot
        const aimOk = this._isAimOk(angleErr, overdue);
        //Confidence calculation of the attack
        const confidence = this._computeConfidence(angleErr);

        //Difficulty-based shooting thresholds
        const shootThreshold = this._getShootThreshold();
        //Start charging aggressively once aim is roughly OK
        const startFactor = (selectedDifficulty === "HARD") ? 0.18 : 0.26;

        if(this._shouldStartCharge({aimOk, overdue, confidence, shootThreshold, startFactor})){
            this._startCharge(keys.KEY_FIRE, now, powerErr);
            return;
        }

        //Continue holding until it is time to fire
        if (this.fireHolding) {
            this._contOrRealeaseCharge(keys.KEY_FIRE, now);
            return;
        }
        //If not charging, make sure FIRE isn't stuck down
        VKEY.release(keys.KEY_FIRE);
    }

    _escapeProjectiles(KEY_LEFT, KEY_RIGHT){
        //Threat detection -> attack from human player
        let threatDetected = false;
        let escapeDir = 0;

        for(const p of cd.projectiles){
            //Only player's shot
            if(!p.alive || p.owner !== "player"){ continue;}

            //Only fresh projectiles
            if(p.bounces>0){ continue;}

            const dx = dogBody.x - p.x;
            const dy = dogBody.y - p.y;
            const distToProjectile = Math.sqrt(dx*dx + dy*dy);

            const dotProduct = dx*p.vx + dy*p.vy;
            //Further check on the projectile speed
            const projectileSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

            //Relaxing threatdetection around barrier to reduce jittering
            const nearBarrier = dogBody.x < 980;
            const triggerDist = nearBarrier ? 320 : 500;

            if (distToProjectile < triggerDist && dotProduct > 0 && projectileSpeed>50){
                threatDetected = true;
                escapeDir = p.vx > 0? -1:1;
                break;
            }
        }

        if (!threatDetected) { return false;}

        const now = millis() / 1000;
        // Commit a short escape so it won't flip-flop next frame
        this._setMoveIntent(escapeDir, now, 0.22);
        this._applyMoveIntent(KEY_LEFT, KEY_RIGHT);

        /*if (escapeDir < 0) {
            //Escape LEFT
            VKEY.press(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
        } else {
            //Escape RIGHT
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);
        }*/
        return true;
    }

    // ── Target-based roaming ─────────────────────────────────────
    // Picks random X targets across the full right half and walks to them.
    // Runs every frame regardless of shooting state — AI never freezes.
    _roam(KEY_LEFT, KEY_RIGHT, now) {
        if (!dogBody) return;
        const dogMid = dogBody.x + dogBody.w / 2;

        // Pick a new roam target periodically
        if (now >= this.roamPickTime) {
            this.roamTargetX = this.roamMinX + Math.random() * (this.roamMaxX - this.roamMinX);
            let interval;
            if      (selectedDifficulty === "HARD")   interval = 0.5 + Math.random() * 0.5;
            else if (selectedDifficulty === "MEDIUM")  interval = 0.7 + Math.random() * 0.6;
            else                                       interval = 0.9 + Math.random() * 0.8;
            this.roamPickTime = now + interval;
        }

        // Walk toward target — stop when within 15px
        const err = this.roamTargetX - dogMid;
        if (Math.abs(err) > 15) {
            if (err < 0) { VKEY.press(KEY_LEFT);  VKEY.release(KEY_RIGHT); }
            else         { VKEY.press(KEY_RIGHT); VKEY.release(KEY_LEFT);  }
        } else {
            VKEY.release(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
        }
    }

    // Stubs kept so nothing breaks if called elsewhere
    _enforceSafeWallDistance() { return false; }
    _enforceRightBias()        { return false; }
    _noiseWalk()               {}

    // Movement entry point — movement is ALWAYS active, never locked
    _updateMovement(KEY_LEFT, KEY_RIGHT, dt, _opts) {
        const now = millis() / 1000;
        if (!dogBody || !player) return;
        // Escape incoming projectiles first, then roam
        if (!this._escapeProjectiles(KEY_LEFT, KEY_RIGHT)) {
            this._roam(KEY_LEFT, KEY_RIGHT, now);
        }
    }


    //--------------------------------------
    //----------Fire Reset------------------
    //--------------------------------------
    _softResetFire() {
        //Stop charging, but don't clear cooldown
        this.fireHolding = false;
        this.fireHoldUntil = 0;
        this.chargeStartTime = 0;
    }

    _hardResetFire() {
        this.fireHolding = false;
        this.fireHoldUntil = 0;
        this.chargeStartTime = 0;
        this.shouldHitThisShot = false;
    }

    //--------------------------------------
    //----------Shot Calculation------------
    //--------------------------------------

    _computeShot({ shooter, target, powerScale, maxPower, shouldHit }) {
        const fromX = shooter.x + shooter.w * 0.1;
        const fromY = shooter.y + shooter.h * 0.35;

        let toX, toY;

        //Target selection
        if(shouldHit){
            //for direct hit
            toX = target.x + target.w*0.5;
            toY = target.y + target.h*0.35;

        }else{
            //Intended to miss — always miss LEFT of target so projectile never curves back toward AI
            const missOffset = 150 + Math.random()*100;
            toX = target.x - missOffset;
            toY = target.y + (Math.random()*100 - 50);
        }

        //Ensure landing well past the wall
        const wallSafetyLeft = this.wallL - this.wallKeepOut;

        // If target is too close to the wall, shift it left so the arc clears the wall and doesn't bounce back
        if (toX > wallSafetyLeft) {toX = wallSafetyLeft;}

        // Guard: toX must always be clearly LEFT of fromX (AI always fires left toward player)
        if (toX >= fromX - 80) { toX = fromX - 80; }

        const dist = Math.abs(toX - fromX);

        //Angle Selection: angle bucket based on distance
        let angleDeg;
        if (dist < 250) {angleDeg = 60;}       // was 80 — high angle at short dist caused self-hits
        else if (dist < 500) {angleDeg = 65;}
        else if (dist < 800) {angleDeg = 50;}
        else if (dist < 1100) {angleDeg = 38;}
        else {angleDeg = 28;}

        const base = (angleDeg * Math.PI) / 180;
        //Facing left
        const a = Math.PI - base;

        //Binary search for the right power
        let minPower = this.minFirePower;
        let maxPower_search = maxPower;
        let bestPower = (minPower + maxPower_search) / 2;
        let bestDistance = Infinity;

        //Use correct wind direction in simulation
        const windDir = -1;

        for (let iteration = 0; iteration < 6; iteration++) {
            const testPower = (minPower + maxPower_search) / 2;

            //Simulate where this power lands
            const landing = cd.simulateProjectileLanding(fromX, fromY, a, testPower, powerScale, windDir);

            //Penalize shots that land near or behind the wall (likely to bounce back)
            const wallR = this.wallR;
            const keepOut = this.wallKeepOut;

            // nearWall means landing on the right of the wall region
            const nearWall =landing.x < (wallR + keepOut);

            // Distance from target
            const dx_error = landing.x - toX;
            const dy_error = landing.y - toY;

            // Apply penalty to distance error so solver prefers safer landings
            const penalty = nearWall ? 99999 : 0;
            const distError = Math.sqrt(dx_error * dx_error + dy_error * dy_error) + penalty;

            if (distError < bestDistance) {
                bestDistance = distError;
                bestPower = testPower;
            }

            // Adjust search range
            if (landing.x > toX) {
                // Need more power
                minPower = testPower;
            } else {
                maxPower_search = testPower;
            }
        }
        //Clamp to valid range
        bestPower = clamp(bestPower, this.minFirePower, maxPower);

        return{angleDeg, power: bestPower};
    }
}

//For AutoPlayer
window.GAME_AUTO = new AutoPlayer();
console.log("[AUTO] GAME_AUTO ready", window.GAME_AUTO);

/*
    _antiNearWall(KEY_LEFT, KEY_RIGHT, dt){
        const wallR = this.wallR;
        const padArea = this.wallPad;

        const dogMid = dogBody.x + dogBody.w/2;
        const dogNearWall = dogMid < (wallR + padArea);

        //When ai player fall in the near wall area
        if (dogNearWall) {
            this.nearWallSeconds += dt;
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);

            // If it keeps sticking near wall, kick it harder to the right for a moment
            if (this.nearWallSeconds > this.nearWallKickAfter) {
                VKEY.press(KEY_RIGHT);
                VKEY.release(KEY_LEFT);
                return true;
            }
            return true;
        }

        this.nearWallSeconds = 0;

        return false;
    }
 */