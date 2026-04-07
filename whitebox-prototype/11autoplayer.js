console.log("[AUTO] 9autoplayer.js LOADED");

//Virtual Keyboard + allow user input in single player mode
(function () {

    //mapping the virtual keyboard
    //https://p5js.org/reference/#Keyboard
    window.VKEY = {
        enabled: false,
        down: new Set(),
        press(code) { this.down.add(code); },
        release(code) { this.down.delete(code); },
        //release all key at once
        clear() { this.down.clear(); },
        isDown(code) { return this.down.has(code); },
    };

    // Capture the *real* p5 keyIsDown exactly once, then wrap safely.
    // This avoids breaking the player's real input.
    let REAL_KEY_IS_DOWN = null;
    let installed = false;

    function captureRealOnce() {
        if (REAL_KEY_IS_DOWN) return true;
        const fn = window.keyIsDown;
        if (typeof fn !== "function") return false;
        if (fn.__vkeyWrapper === true) return false; // don't capture our own wrapper
        REAL_KEY_IS_DOWN = fn;
        console.log("[VKEY] captured REAL keyIsDown ✓");
        return true;
    }

    function vkeyWrapper(code) {
        // Virtual override
        if (window.VKEY.enabled && window.VKEY.isDown(code)) return true;

        // Real keyboard fallback (will close this door after development completed)
        return typeof REAL_KEY_IS_DOWN === "function" ? REAL_KEY_IS_DOWN(code) : false;
    }
    vkeyWrapper.__vkeyWrapper = true;

    // Install after p5 defines keyIsDown. Try for ~2 seconds.
    let attempts = 0;
    const timer = setInterval(() => {
        attempts++;

        // First, capture the real function (once)
        captureRealOnce();

        // Then, wrap (once)
        if (!installed && REAL_KEY_IS_DOWN && typeof window.keyIsDown === "function") {
            window.keyIsDown = vkeyWrapper;
            installed = true;
            console.log("[VKEY] keyIsDown wrapped ✓");
        }

        if (installed || attempts > 40) clearInterval(timer);
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
        // if held longer, force release/reset
        this.maxChargeSeconds = 2.2;

        // tuning
        this.minFirePower = 50;
        this.maxFirePower = 170;

        //How tightly we require angle alignment before we start charging
        this.aimToleranceDeg = 2.0;
        this.aimOkDeg = 16;
        this.powerTolerance = 6;

        //If POWER is super low, avoid micro-shots
        this.minShotPower = 20;

        //Hit/Miss mechanic to showcase randomness of the game, making it more realistic
        this.hitChance = 0.5; //will later import different hitChance for different level of difficulty of the game
        this.shouldHitThisShot = false; //will be determined by the noise imported

        //creating noise for smooth movements
        this.noiseTime = 0;
        this.noiseScale = 0.5;
        //creating noise for shooting confidence
        this.shootingNoiseTime = 0;
        this.shootingNoiseScale = 0.3;

        //prevent jittering while aiming/ charging
        this.lockMoveUntil = 0;

        // anti-camp / wall
        this.wallL = 750;
        this.wallR = 850;
        this.wallPad = 160;

        //Keeping AI on the right
        this.rightBiasX = 1050;

        //If AI is near wall too long, move it away
        this.nearWallSeconds = 0;
        this.nearWallKickAfter = 0.9;

    }

    setEnabled(on) {
        this.enabled = !!on;

        if (window.VKEY) {
            VKEY.enabled = this.enabled;
            VKEY.clear();
        }

        this._hardResetFire();
        this.nextFireTime = 0;
        this.lockMoveUntil = 0;
        this.nearWallSeconds = 0;

        console.log("[AUTO] setEnabled =", this.enabled, "| VKEY ready =", !!window.VKEY);
    }

    update(dt) {
        //AI disabled
        if (!this.enabled) {return;}

        //Virtual keyboard not ready
        if (!window.VKEY) {return;}

        //Not gaming state
        if (gameState !== "PLAY") {
            VKEY.clear();
            this._hardResetFire();
            return;
        }

        //One of the players died or time out state
        const timeUp = gameTimer <= 0 && catHP !== dogHP;
        const gameOver = catHP <= 0 || dogHP <= 0 || timeUp;
        if (gameOver) {
            VKEY.clear();
            this._hardResetFire();
            return;
        }

        const now = millis() / 1000;

        this.shootingNoiseTime += dt * this.shootingNoiseScale;

        // Difficulty tweaks
        if (selectedDifficulty === "HARD") {
            this.maxFirePower = 190;
            this.hitChance = 0.65;
            //keep firing in hard mode
            this.aimOkDeg = 18;
        } else if (selectedDifficulty === "MEDIUM") {
            this.maxFirePower = 170;
            this.hitChance = 0.5;
            this.aimOkDeg = 16;
        } else {
            this.maxFirePower = 150;
            this.hitChance = 0.35;
            this.aimOkDeg = 16;
        }

        //AI always on the right, faces left
        dogBody.facing = -1;
        ciyangAngleObj.setDirection(-1);

        const KEY_UP   = ciyangAngleObj.upKey;
        const KEY_DOWN = ciyangAngleObj.downKey;
        const KEY_FIRE = ciyangPowerObj.fireKey; // 32
        const KEY_LEFT = dogBody.leftKey; // LEFT_ARROW
        const KEY_RIGHT = dogBody.rightKey;//RIGHT_ARROW

        //Movement lock while charging / shortly after starting charge
        const lockMovement = this.fireHolding || (now < this.lockMoveUntil);

        //Adjusting left-right movement
        this._updateMovement(KEY_LEFT, KEY_RIGHT, dt, { lockMovement });

        //Aim keys: decide fresh each frame
        VKEY.release(KEY_UP);
        VKEY.release(KEY_DOWN);

        //Ensure at least one fire up frame after releasing
        if (this.forceReleaseFrame) {
            VKEY.release(KEY_FIRE);
            this.forceReleaseFrame = false;
        }

        // DEADLOCK FAILSAFE: if held too long, force release + reset
        if (this.fireHolding && (now - this.chargeStartTime) > this.maxChargeSeconds) {
            VKEY.release(KEY_FIRE);
            this.forceReleaseFrame = true;
            this._hardResetFire();
            this.nextFireTime = now + 0.25;
            return;
        }

        // Cooldown
        if (now < this.nextFireTime) {
            VKEY.release(KEY_FIRE);
            this._softResetFire();
            return;
        }

        // Decide hit/miss per shot (not per frame)
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
            VKEY.release(KEY_FIRE);
            this._softResetFire();
            this.nextFireTime = now + 0.2;
            return;
        }

        const desiredAngle = clamp(shot.angleDeg, ciyangAngleObj.minDeg, ciyangAngleObj.maxDeg);
        const maxAllowed = Math.min(this.maxFirePower, ciyangPowerObj.max);
        const desiredPower = clamp(shot.power, this.minFirePower, maxAllowed);

        const angleErr = desiredAngle - ciyangAngleObj.angleDeg;
        const powerErr = desiredPower - ciyangPowerObj.value;

        //Aim correction
        if (Math.abs(angleErr) > this.aimToleranceDeg) {
            if (angleErr > 0) VKEY.press(KEY_UP);
            else VKEY.press(KEY_DOWN);
        }

        //Aim is "good enough"
        const aimOk = Math.abs(angleErr) <= this.aimOkDeg;

        //Confidence calculation of the attack
        const rawNoise = noise(this.shootingNoiseTime);
        const aimQuality = clamp(1 - Math.abs(angleErr) / this.aimOkDeg, 0, 1);
        const confidence = rawNoise * 0.40 + aimQuality * 0.60;

        // Difficulty-based shooting thresholds
        let shootThreshold;
        if (selectedDifficulty === "HARD") {
            //Trigger-happy: fires when confidence is moderate
            shootThreshold = 0.26;
        } else if (selectedDifficulty === "MEDIUM") {
            //Balanced: needs decent confidence
            shootThreshold = 0.34;
        } else {
            //EASY level -> Hesitant: only shoots when very confident
            shootThreshold = 0.38;
        }

        // Start charging aggressively once aim is roughly OK
        const startFactor = (selectedDifficulty === "HARD") ? 0.18 : 0.26;

        if (!this.fireHolding && aimOk && confidence > shootThreshold * startFactor) {
            VKEY.press(KEY_FIRE);
            this.fireHolding = true;
            this.chargeStartTime = now;

            //Hold time: ensure POWER has time to rise; adjust by power error
            const minHold = (selectedDifficulty === "HARD") ? 0.28 : 0.26;

            //PowerErr is "desiredPower - currentPower"
            //Extra hold scaled to how far we are from target (cap it)
            const extra = (powerErr > 0) ? clamp(powerErr / 140, 0, 1.15) : 0;

            this.fireHoldUntil = now + (minHold + extra);

            //Lock movement so aim doesn't jitter during initial charge
            this.lockMoveUntil = now + ((selectedDifficulty === "HARD") ? 0.45 : 0.35);
            return;
        }

        //Continue holding until it is time to fire
        if (this.fireHolding) {
            if (now < this.fireHoldUntil) {
                VKEY.press(KEY_FIRE);
                return;
            }

            // If power is still tiny, extend a hair rather than firing blanks
            if (ciyangPowerObj.value < this.minShotPower) {
                this.fireHoldUntil = now + 0.06;
                VKEY.press(KEY_FIRE);
                return;
            }

            // Release to shoot
            VKEY.release(KEY_FIRE);
            this.forceReleaseFrame = true;
            this._hardResetFire();

            // More frequent shots (especially EASY)
            let minCooldown, maxCooldown;
            if (selectedDifficulty === "HARD") { minCooldown = 0.45; maxCooldown = 0.95; }
            else if (selectedDifficulty === "MEDIUM") { minCooldown = 0.60; maxCooldown = 1.15; }
            else { minCooldown = 0.65; maxCooldown = 1.25; }

            this.nextFireTime = now + (minCooldown + Math.random() * (maxCooldown - minCooldown));
            return;
        }

        // If not charging, make sure FIRE isn't stuck down
        VKEY.release(KEY_FIRE);
    }

    //Movement Logic
    _updateMovement(keyLeft, keyRight, dt, { lockMovement = false } = {}){
        if (!dogBody || !player){ return;}

        const KEY_LEFT = dogBody.leftKey;
        const KEY_RIGHT = dogBody.rightKey;

        //threat detection -> attack from human player
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
            //further check on the projectile speed
            const projectileSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

            if (distToProjectile < 600 && dotProduct > 0 && projectileSpeed>50){
                threatDetected = true;
                escapeDir = p.vx > 0? -1:1;
                break;
            }
        }

        //Threat detection logic and escape
        if (threatDetected) {
            if (escapeDir < 0) {
                //Escape LEFT
                VKEY.press(KEY_LEFT);
                VKEY.release(KEY_RIGHT);
                //console.log("[AUTO-EVADE] Pressing LEFT to escape");
            } else {
                //Escape RIGHT
                VKEY.press(KEY_RIGHT);
                VKEY.release(KEY_LEFT);
                //console.log("[AUTO-EVADE] Pressing RIGHT to escape");
            }
            // prioritize evasion — don't do organic movement while dodging
            return;
        }

        //Movement lock to reduce jittering while aiming/charging
        if (lockMovement) {
            VKEY.release(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
            return;
        }

        //Avoid "blind spot" behind the center wall
        const wallL = this.wallL, wallR = this.wallR;
        const pad = this.wallPad;

        const dogMid = dogBody.x + dogBody.w / 2;
        const playerMid = player.x + player.w / 2;

        const dogNearWall = (dogMid > (wallL - pad) && dogMid < (wallR + pad));
        const playerLeftOfWall = playerMid < wallL;
        const dogRightOfWall = dogMid > wallR;

        //Normal situation (player left, dog right) and dog is near wall,
        //push dog RIGHT to avoid "hiding behind the wall"
        if (playerLeftOfWall && dogRightOfWall && dogNearWall) {
            this.nearWallSeconds += dt;
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);

            // If it keeps sticking near wall, kick it harder to the right for a moment
            if (this.nearWallSeconds > this.nearWallKickAfter) {
                VKEY.press(KEY_RIGHT);
                VKEY.release(KEY_LEFT);
                return;
            }
            return;
        } else {
            this.nearWallSeconds = 0;
        }

        // If dog drifts left of wall, push it back to the right half quickly
        const dogLeftOfWall = dogMid < wallL;
        if (dogLeftOfWall) {
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);
            return;
        }

        //Keep AI player generally on the right side
        if (dogMid < this.rightBiasX) {
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);
            return;
        }

        //update noise time
        this.noiseTime += dt*this.noiseScale;
        //getting smooth noise value (-1 to 1)
        const noiseValue = noise(this.noiseTime)*2 -1;

        const deadzone = 0.45;
        if (noiseValue < -deadzone) {
            //Idle: move LEFT gently
            VKEY.press(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
            //console.log("[AUTO-IDLE] Moving left (noiseValue=" + noiseValue.toFixed(2) + ")");
        } else if (noiseValue > deadzone) {
            //Idle: move RIGHT gently
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);
            //console.log("[AUTO-IDLE] Moving right (noiseValue=" + noiseValue.toFixed(2) + ")");
        } else {
            //Idle: stand still in deadzone
            VKEY.release(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
            //console.log("[AUTO-IDLE] Standing still (noiseValue=" + noiseValue.toFixed(2) + ")");
        }
    }

    _softResetFire() {
        // stop charging, but don't clear cooldown
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

    //Shot Calculation
    _computeShot({ shooter, target, powerScale, maxPower, shouldHit }) {
        const fromX = shooter.x + shooter.w * 0.1;
        const fromY = shooter.y + shooter.h * 0.35;

        let toX, toY;

        //Target selection
        if(shouldHit){
            //for direct hit
            toX = target.x + target.w*0.5;
            toY = target.y + target.h*0.35;
            //console.log("[AUTO] AIMING TO HIT");

        }else{
            //intended to miss the target
            //miss by 150-250px
            const missOffset = 150 + Math.random()*100;
            // miss left or right randomly
            const missDir = Math.random()<0.5? -1:1;
            toX = target.x + missDir * missOffset;
            toY = target.y + (Math.random()*100 - 50);
            //console.log("[AUTO] AIMING TO MISS (offset=" + missOffset.toFixed(0) + ")");
        }

        const dist = Math.abs(toX - fromX);

        //Angle Selection: angle bucket based on distance
        let angleDeg;
        //Short distance -> steep angle
        if (dist < 250) {angleDeg = 65;}
        //Medium distance
        else if (dist < 500) {angleDeg = 55;}
        //Long distance
        else if (dist < 800) {angleDeg = 45;}
        //Very long distance
        else {angleDeg = 35;}

        const base = (angleDeg * Math.PI) / 180;
        //Facing left
        const a = Math.PI - base;

        //Binary search for the right power
        let minPower = this.minFirePower;
        let maxPower_search = maxPower;
        let bestPower = (minPower + maxPower_search) / 2;
        let bestDistance = Infinity;

        // Use correct wind direction in simulation (fix in CollisionDetection.simulateProjectileLanding)
        const windDir = -1;

        for (let iteration = 0; iteration < 6; iteration++) {
            const testPower = (minPower + maxPower_search) / 2;

            //Simulate where this power lands
            const landing = cd.simulateProjectileLanding(fromX, fromY, a, testPower, powerScale, windDir);

            // Distance from target
            const dx_error = landing.x - toX;
            const dy_error = landing.y - toY;
            const distError = Math.sqrt(dx_error * dx_error + dy_error * dy_error);

            if (distError < bestDistance) {
                bestDistance = distError;
                bestPower = testPower;
            }

            // Adjust search range
            if (landing.x < toX) {
                minPower = testPower;  // Need more power
            } else {
                maxPower_search = testPower;  // Too much power
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
