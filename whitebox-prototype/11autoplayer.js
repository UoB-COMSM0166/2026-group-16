console.log("[AUTO] 9autoplayer.js LOADED");

(function () {
    // ---- Virtual Keyboard ----
    window.VKEY = {
        enabled: false,
        down: new Set(),
        press(code) { this.down.add(code); },
        release(code) { this.down.delete(code); },
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

        // Real keyboard fallback
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

        this.nextFireTime = 0;

        // deterministic fire timing so justReleased happens reliably
        this.fireHolding = false;
        this.fireHoldUntil = 0;

        // tuning
        this.minFirePower = 50;
        this.maxFirePower = 170;
        this.aimToleranceDeg = 1.5;
        this.powerTolerance = 2;

        //Distance-based movement -> trying to maintain a certain distance from player
        this.preferredDistance = 600;
        this.movementSpeed = 280;
        this.distanceTolerance =100;

        //Hit/Miss mechanic to showcase randomness of the game, making it more realistic
        this.hitChance = 0.5; //will later import different hitChance for different level of difficulty of the game
        this.shouldHitThisShot = false; //will be determined by the random variable imported
        this.lastShotTime = 0;

        //random movement properties
        this.movementTimer = 0;
        this.randomMovementDuration = 0;
        this.randomMovementDirection = 0;
        this.isMovingRandomly = false;

    }

    setEnabled(on) {
        this.enabled = !!on;

        if (window.VKEY) {
            VKEY.enabled = this.enabled;
            VKEY.clear();
        }

        // reset internal firing state
        this.fireHolding = false;
        this.fireHoldUntil = 0;
        this.shouldHitThisShot = false;

        console.log("[AUTO] setEnabled =", this.enabled, "| VKEY ready =", !!window.VKEY);
    }

    update(dt) {
        if (!this.enabled) return;
        if (!window.VKEY) return;
        if (gameState !== "PLAY") { VKEY.clear(); this._resetFire(); return; }

        //autoplayer always on left
        dogBody.facing = -1;
        ciyangAngleObj.setDirection(-1);
        console.log("[AUTO] AI facing: " + dogBody.facing);

        const timeUp = gameTimer <= 0 && catHP !== dogHP;
        const gameOver = catHP <= 0 || dogHP <= 0 || timeUp;
        if (gameOver) { VKEY.clear(); this._resetFire(); return; }

        const now = millis() / 1000;

        // Difficulty tweaks
        if (selectedDifficulty === "HARD") {
            this.maxFirePower = 190;
            this.powerTolerance = 5;
            this.hitChance = 0.65; //Harder level, higher hit chance
        }else if (selectedDifficulty === "MEDIUM"){
            this.maxFirePower = 170;
            this.powerTolerance = 2;
            this.hitChance = 0.5; //Medium difficulty, 50% -> proportional
        }else {//Easy level
            this.maxFirePower = 150;
            this.powerTolerance = 1;
            this.hitChance = 0.35; //least chance of hitting the player
        }

        const KEY_UP   = ciyangAngleObj.upKey;
        const KEY_DOWN = ciyangAngleObj.downKey;
        const KEY_FIRE = ciyangPowerObj.fireKey; // 32
        const KEY_LEFT = dogBody.leftKey; // LEFT_ARROW
        const KEY_RIGHT = dogBody.rightKey;//RIGHT_ARROW

        //Adjusting left-right movement
        this._updateMovement(KEY_LEFT, KEY_RIGHT, dt);

        // Aim keys: decide fresh each frame
        VKEY.release(KEY_UP);
        VKEY.release(KEY_DOWN);

        //import random variable to determine whether the shot should hit or miss
        //frequency is based on per shot not per frame!!!
        if(!this.fireHolding && Math.random() < this.hitChance){
            this.shouldHitThisShot = true;
        }else if (!this.fireHolding){
            this.shouldHitThisShot = false;
        }

        const shot = this._computeShot({
            shooter: dogBody,
            target: player,
            gravity: cd.gravity,
            powerScale: 8,
            maxPower: ciyangPowerObj.max,
            shouldHit: this.shouldHitThisShot,
        });

        console.log("[AUTO] shot=", shot, "shouldHit=", this.shouldHitThisShot,"angleErr later will be=", (shot ? clamp(shot.angleDeg, ciyangAngleObj.minDeg, ciyangAngleObj.maxDeg) - ciyangAngleObj.angleDeg : "N/A"));

        if (!shot) { VKEY.release(KEY_FIRE); this._resetFire(); return; }

        const desiredAngle = clamp(shot.angleDeg, ciyangAngleObj.minDeg, ciyangAngleObj.maxDeg);
        const maxAllowed = Math.min(this.maxFirePower, ciyangPowerObj.max);
        const desiredPower = clamp(shot.power, this.minFirePower, maxAllowed);

        const angleErr = desiredAngle - ciyangAngleObj.angleDeg;

        if (Math.abs(angleErr) > this.aimToleranceDeg) {
            if (angleErr > 0) VKEY.press(KEY_UP);
            else VKEY.press(KEY_DOWN);
        }

        // cooldown
        if (now < this.nextFireTime) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        // Don't fire if aim is way off
        if (Math.abs(angleErr) > 6) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        // Fire logic with minimum hold time
        const powerErr = desiredPower - ciyangPowerObj.value;

        if (powerErr > this.powerTolerance) {
            // start/continue charging
            VKEY.press(KEY_FIRE);
            if (!this.fireHolding) {
                this.fireHolding = true;
                this.fireHoldUntil = now + 0.20; // hold at least 200ms
            }
            return;
        }

        // close enough to target power, but ensure we held long enough
        if (this.fireHolding && now < this.fireHoldUntil) {
            VKEY.press(KEY_FIRE);
            return;
        }

        // release to shoot
        VKEY.release(KEY_FIRE);
        this._resetFire();
        this.nextFireTime = now + 0.6 + Math.random() * 0.4;
    }

    _updateMovement(keyLeft, keyRight, dt){
        if (!dogBody || !player){return;}

        const dx = player.x - dogBody.x;
        const currentDistance = Math.abs(dx);

        //random timer
        if (!this.movementTimer) {
            this.movementTimer = 0;
            this.randomMovementDuration = 0;
            this.randomMovementDirection = 0;
            this.isMovingRandomly = false;
        }

        this.movementTimer += dt;

        //weather to import random movement
        if (currentDistance >= this.preferredDistance - this.distanceTolerance &&
            currentDistance <= this.preferredDistance + this.distanceTolerance) {

            // Generate new random movement/pause every 4-8 seconds
            if (this.movementTimer > this.randomMovementDuration) {
                // 60% chance to move, 40% chance to pause
                this.isMovingRandomly = Math.random() < 0.6;

                if (this.isMovingRandomly) {
                    this.randomMovementDirection = Math.random() < 0.5 ? -1 : 1;
                    this.randomMovementDuration = 13 + Math.random() * 2; // 3-6 seconds moving
                    console.log("[AUTO] Random movement: direction=" + this.randomMovementDirection + ", duration=" + this.randomMovementDuration.toFixed(1) + "s");
                } else {
                    this.randomMovementDuration = 2 + Math.random() * 3; // 2-5 seconds pause
                    console.log("[AUTO] Random pause: duration=" + this.randomMovementDuration.toFixed(1) + "s");
                }

                this.movementTimer = 0;
            }

            // Apply random movement or stay still
            if (this.isMovingRandomly) {
                if (this.randomMovementDirection > 0) {
                    VKEY.press(keyRight);
                    VKEY.release(keyLeft);
                } else {
                    VKEY.press(keyLeft);
                    VKEY.release(keyRight);
                }
            } else {
                // Pause phase - don't move
                VKEY.release(keyLeft);
                VKEY.release(keyRight);
            }
            return;
        }

        //will further shorten the code here by eliminating unecessary conditions but will keep below code to make sure
        //program runs smoothly first
        //logic: move closer if too far, move away if too close
        if (currentDistance > this.preferredDistance + this.distanceTolerance){
            //too far
            if(dx > 0){
                //Player is to the right
                VKEY.press(keyRight);
                VKEY.release(keyLeft);
            }else{
                //Player is to the left
                VKEY.press(keyLeft);
                VKEY.release(keyRight);
            }
            this.movementTimer = 0; // Reset random timer
            console.log("[AUTO] Moving closer (dist=" + currentDistance.toFixed(0) + ")");

        }else if(currentDistance < this.preferredDistance -this.distanceTolerance){
            //too close
            if(dx>0){
                //Player is to the right
                VKEY.press(keyLeft);
                VKEY.release(keyRight);
            }else{
                //Player is to the left
                VKEY.press(keyRight);
                VKEY.release(keyLeft);
            }

            this.movementTimer = 0; // Reset random timer
            console.log("[AUTO] Moving away (dist=" + currentDistance.toFixed(0) + ")");
        }else{
            //perfect case, no further movement needed
            //to be abolished-> testing with randomness
            VKEY.release(keyLeft);
            VKEY.release(keyRight);
        }
    }

    _resetFire() {
        this.fireHolding = false;
        this.fireHoldUntil = 0;
    }

    _computeShot({ shooter, target, gravity, powerScale, maxPower, shouldHit }) {
        const fromX = shooter.x + shooter.w * (shooter.facing === 1 ? 0.9 : 0.1);
        const fromY = shooter.y + shooter.h * 0.35;

        let toX, toY;

        if(shouldHit){
            //for direct hit
            toX = target.x + target.w*0.5;
            toY = target.y + target.h*0.35;
            console.log("[AUTO] AIMING TO HIT");
        }else{
            //intended to miss the target
            const missOffset = 150 + Math.random()*100; //miss by 150-250px
            const missDir = Math.random()<0.5? -1:1; // miss left or right randomly
            toX = target.x + missDir*missOffset;
            toY = target.y + (Math.random()*100 - 50); //random vertical offset
            console.log("[AUTO] AIMING TO MISS (offset=" + missOffset.toFixed(0) + ")");
        }

        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.abs(dx);

        // angle bucket based on distance
        let angleDeg;
        if (dist < 250) angleDeg = 65;
        else if (dist < 500) angleDeg = 55;
        else if (dist < 800) angleDeg = 45;
        else angleDeg = 35;

        // dog direction is -1 => angleRad = PI - base
        const base = (angleDeg * Math.PI) / 180;
        const a = shooter.facing === -1 ? Math.PI - base : base;

        const x = Math.abs(dx);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const tan = sin / (cos || 1e-6);

        // v^2 = g*x^2/(2*cos^2(a)*(x*tan(a)-y))
        const denom = 2 * cos * cos * (x * tan - dy);

        // If math fails, use a fallback power based on distance
        if (denom <= 1e-6) {
            const fallbackPower = 30 + (dist / 100) * 2; // simple distance-based guess
            return { angleDeg, power: clamp(fallbackPower, this.minFirePower, maxPower) };
        }

        const v2 = gravity * x * x / denom;
        if (!isFinite(v2) || v2 <= 0) {
            // also use fallback if v2 is invalid
            const fallbackPower = 30 + (dist / 100) * 2;
            return { angleDeg, power: clamp(fallbackPower, this.minFirePower, maxPower) };
        }

        const speed = Math.sqrt(v2);
        let power = speed / powerScale;

        // mild distance compensation
        power *= 1 + 0.0006 * x;

        power = clamp(power, 0, maxPower);
        return { angleDeg, power };
    }
}

//For AutoPlayer
window.GAME_AUTO = new AutoPlayer();
console.log("[AUTO] GAME_AUTO ready", window.GAME_AUTO);
