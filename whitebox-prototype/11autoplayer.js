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
        this.fireHolding = false;
        this.fireHoldUntil = 0;

        // tuning
        this.minFirePower = 50;
        this.maxFirePower = 170;
        this.aimToleranceDeg = 1.5;
        this.powerTolerance = 2;


        //Hit/Miss mechanic to showcase randomness of the game, making it more realistic
        this.hitChance = 0.5; //will later import different hitChance for different level of difficulty of the game
        this.shouldHitThisShot = false; //will be determined by the random variable imported
        this.lastShotTime = 0;

        //creating noise for smooth movements
        this.noiseTime = 0;
        this.noiseScale = 0.5;

        //Distance-based movement -> trying to maintain a certain distance from player
        //this.preferredDistance = 600;
        //this.distanceTolerance = 100;

        this.shootingNoiseTime = 0;
        this.shootingNoiseScale = 0.3;
        this.fireCommitThreshold = 0.6;
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

        this.shootingNoiseTime += dt * this.shootingNoiseScale;

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

        if (!shot) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        const desiredAngle = clamp(shot.angleDeg, ciyangAngleObj.minDeg, ciyangAngleObj.maxDeg);
        const maxAllowed = Math.min(this.maxFirePower, ciyangPowerObj.max);
        const desiredPower = clamp(shot.power, this.minFirePower, maxAllowed);

        const angleErr = desiredAngle - ciyangAngleObj.angleDeg;

        if (Math.abs(angleErr) > this.aimToleranceDeg) {
            if (angleErr > 0) VKEY.press(KEY_UP);
            else VKEY.press(KEY_DOWN);
        }else{
            VKEY.release(KEY_UP);
            VKEY.release(KEY_DOWN);
        }

        // cooldown
        if (now < this.nextFireTime) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        // Fire logic with minimum hold time
        const powerErr = desiredPower - ciyangPowerObj.value;

        /*
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
        */

        //release if aim is way off
        if (Math.abs(angleErr) > 8) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        const rawNoise = noise(this.shootingNoiseTime);  // 0-1
        const aimQuality = 1 - Math.abs(angleErr) / 8;  // 0-1 (1 = perfect aim)
        const powerQuality = Math.max(0, 1 - Math.abs(powerErr) / (this.powerTolerance * 2));  // 0-1

        // Combine noise with aim quality for realistic hesitation
        const confidence = (rawNoise * 0.6 + aimQuality * 0.4) * powerQuality;

        // Difficulty-based shooting thresholds
        let shootThreshold;
        if (selectedDifficulty === "HARD") {
            shootThreshold = 0.45;  // Trigger-happy: fires when confidence is moderate
        } else if (selectedDifficulty === "MEDIUM") {
            shootThreshold = 0.55;  // Balanced: needs decent confidence
        } else {
            shootThreshold = 0.70;  // Hesitant: only shoots when very confident
        }


        // If confidence too low, don't even try
        if (confidence < shootThreshold * 0.5) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        // Charging: gradually build power
        if (powerErr > this.powerTolerance && confidence > shootThreshold * 0.7) {
            VKEY.press(KEY_FIRE);
            if (!this.fireHolding) {
                this.fireHolding = true;

                // Hold time scales with confidence
                // High confidence = quick fire, low confidence = longer charge
                const holdTime = 0.08 + (1 - confidence) * 0.25;  // 80-330ms
                this.fireHoldUntil = now + holdTime;

                console.log(
                    "[AUTO-CHARGE] Starting charge | confidence=" + confidence.toFixed(2) +
                    " | holdTime=" + holdTime.toFixed(3) + "s"
                );
            }
            return;
        }

        // Check if held long enough
        if (this.fireHolding && now < this.fireHoldUntil) {
            VKEY.press(KEY_FIRE);
            return;
        }

        //lost confidence
        if (this.fireHolding && confidence < shootThreshold * 0.6) {
            console.log("[AUTO-ABORT] Lost confidence mid-charge (confidence=" + confidence.toFixed(2) + ")");
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        // Release and shoot (only if confident enough)
        if (this.fireHolding && confidence > shootThreshold) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            this.lastShotTime = now;

            // ✅ Variable cooldown based on difficulty
            let minCooldown, maxCooldown;
            if (selectedDifficulty === "HARD") {
                minCooldown = 0.7;   // Aggressive: fires every 0.7-1.3s
                maxCooldown = 1.3;
            } else if (selectedDifficulty === "MEDIUM") {
                minCooldown = 1.1;   // Moderate: fires every 1.1-2.1s
                maxCooldown = 2.1;
            } else {
                minCooldown = 1.8;   // Easy: fires every 1.8-3.2s
                maxCooldown = 3.2;
            }

            const cooldown = minCooldown + Math.random() * (maxCooldown - minCooldown);
            this.nextFireTime = now + cooldown;

            console.log(
                "[AUTO-FIRE] Shot released! | confidence=" + confidence.toFixed(2) +
                " | cooldown=" + cooldown.toFixed(2) + "s | next fire at " + this.nextFireTime.toFixed(2)
            );
        }

    }

    _updateMovement(keyLeft, keyRight, dt){
        if (!dogBody || !player){return;}

        const KEY_LEFT = dogBody.leftKey;
        const KEY_RIGHT = dogBody.rightKey;

        //removing fixed distance logic
        /*
        const currentDistance = Math.abs(dx);
        */

        //threat detection -> attack from human player
        let threatDetected = false;
        let escapeDir = 0;

        for(const p of cd.projectiles){
            if(!p.alive || p.owner !== "player"){continue;}

            const dx = dogBody.x - p.x;
            const dy = dogBody.y - p.y;
            const distToProjectile = Math.sqrt(dx*dx + dy*dy);

            const dotProduct = dx*p.vx + dy*p.vy;

            if (distToProjectile < 600 && dotProduct > 0){
                threatDetected = true;
                escapeDir = p.vx > 0? -1:1;

                console.log(
                    "[AUTO-EVADE] Threat detected! Projectile at (" + p.x.toFixed(0) + ", " + p.y.toFixed(0) + "), dist=" + distToProjectile.toFixed(0) + ", escapeDir=" + escapeDir);
                    break;
            }
        }

        //threat detection logic and escape
        if (threatDetected) {
            if (escapeDir < 0) {
                // Escape LEFT
                VKEY.press(KEY_LEFT);
                VKEY.release(KEY_RIGHT);
                console.log("[AUTO-EVADE] Pressing LEFT to escape");
            } else {
                // Escape RIGHT
                VKEY.press(KEY_RIGHT);
                VKEY.release(KEY_LEFT);
                console.log("[AUTO-EVADE] Pressing RIGHT to escape");
            }
            return; // prioritize evasion — don't do organic movement while dodging
        }

        //update noise time
        this.noiseTime += dt*this.noiseScale;

        //getting smooth noise value (-1 to 1)
        const noiseValue = noise(this.noiseTime)*2 -1;

        const deadzone = 0.4;

        if (noiseValue < -deadzone) {
            // Idle: move LEFT gently
            VKEY.press(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
            console.log("[AUTO-IDLE] Moving left (noiseValue=" + noiseValue.toFixed(2) + ")");
        } else if (noiseValue > deadzone) {
            // Idle: move RIGHT gently
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);
            console.log("[AUTO-IDLE] Moving right (noiseValue=" + noiseValue.toFixed(2) + ")");
        } else {
            // Idle: stand still in deadzone
            VKEY.release(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
            console.log("[AUTO-IDLE] Standing still (noiseValue=" + noiseValue.toFixed(2) + ")");
        }

        /*
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
            console.log("[AUTO] Moving away (dist=" + currentDistance.toFixed(0) + ")");

        }else{
            //within comfort zone: use smooth noise for organic movement
            //noiseValue ranges from -1 to 1
            //deadzone: not moving ig noise is small (prevents constant jittering)

            const deadzone = 0.3;

            if (noiseValue < -deadzone){
                VKEY.release(keyLeft);
                VKEY.release(keyRight);
            }else if (noiseValue > deadzone){
                VKEY.release(keyRight);
                VKEY.release(keyLeft);
            }else{
                VKEY.release(keyLeft);
                VKEY.release(keyRight);
            }

        }
        */
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
