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

        this.nextFireTime = 0;
        this.fireHolding = false;
        this.fireHoldUntil = 0;


        this.forceReleaseFrame = false;

        // tuning
        this.minFirePower = 50;
        this.maxFirePower = 170;
        this.aimToleranceDeg = 1.5;
        this.powerTolerance = 2;

        //Hit/Miss mechanic to showcase randomness of the game, making it more realistic
        this.hitChance = 0.5; //will later import different hitChance for different level of difficulty of the game
        this.shouldHitThisShot = false; //will be determined by the noise imported

        //creating noise for smooth movements
        this.noiseTime = 0;
        this.noiseScale = 0.5;

        //creating noise for shooting confidence
        this.shootingNoiseTime = 0;
        this.shootingNoiseScale = 0.3;
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
        this.forceReleaseFrame = false;
        this.shouldHitThisShot = false;
        this.nextFireTime = 0;

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
            this._resetFire();
            this.forceReleaseFrame = false;
            return;
        }

        //One of the players died or time out state
        const timeUp = gameTimer <= 0 && catHP !== dogHP;
        const gameOver = catHP <= 0 || dogHP <= 0 || timeUp;
        if (gameOver) {
            VKEY.clear();
            this._resetFire();
            this.forceReleaseFrame = false;
            return;
        }

        /*
        //AI player always on the left
        dogBody.facing = -1;
        ciyangAngleObj.setDirection(-1);
        //console.log("[AUTO] AI facing: " + dogBody.facing);
        */

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

        //Face toward the player
        const dogMid = dogBody.x + dogBody.w * 0.5;
        const playerMid = player.x + player.w * 0.5;
        const faceDir = (playerMid < dogMid) ? -1 : 1;

        dogBody.facing = faceDir;
        ciyangAngleObj.setDirection(faceDir);

        const KEY_UP   = ciyangAngleObj.upKey;
        const KEY_DOWN = ciyangAngleObj.downKey;
        const KEY_FIRE = ciyangPowerObj.fireKey; // 32
        const KEY_LEFT = dogBody.leftKey; // LEFT_ARROW
        const KEY_RIGHT = dogBody.rightKey;//RIGHT_ARROW

        //Adjusting left-right movement
        this._updateMovement(KEY_LEFT, KEY_RIGHT, dt);

        //Aim keys: decide fresh each frame
        VKEY.release(KEY_UP);
        VKEY.release(KEY_DOWN);

        //Force one clean "released" frame so POWER.update() can set justReleased=true
        if (this.forceReleaseFrame) {
            VKEY.release(KEY_FIRE);
            this.forceReleaseFrame = false;
        }

        //Not entering the charge mode if it's still in cooldown
        if (now < this.nextFireTime) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        // Decide hit/miss per shot (not per frame)
        if (!this.fireHolding) {
            this.shouldHitThisShot = (Math.random() < this.hitChance);
        }

        const shot = this._computeShot({
            shooter: dogBody,
            target: player,
            gravity: cd.gravity,
            powerScale: 8,
            maxPower: ciyangPowerObj.max,
            shouldHit: this.shouldHitThisShot,
        });

        console.log("[AUTO] shot=", shot, "shouldHit=", this.shouldHitThisShot);

        if (!shot) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        const desiredAngle = clamp(shot.angleDeg, ciyangAngleObj.minDeg, ciyangAngleObj.maxDeg);
        const maxAllowed = Math.min(this.maxFirePower, ciyangPowerObj.max);
        const desiredPower = clamp(shot.power, this.minFirePower, maxAllowed);

        const angleErr = desiredAngle - ciyangAngleObj.angleDeg;
        const powerErr = desiredPower - ciyangPowerObj.value;

        if (Math.abs(angleErr) > this.aimToleranceDeg) {
            if (angleErr > 0) {VKEY.press(KEY_UP);}
            else {VKEY.press(KEY_DOWN);}
        }else{
            VKEY.release(KEY_UP);
            VKEY.release(KEY_DOWN);
        }

        // If aim is terrible, don't fire
        if (Math.abs(angleErr) > 8) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        //Confidence calculation of the attack
        const rawNoise = noise(this.shootingNoiseTime);  // 0-1
        const aimQuality = 1 - Math.abs(angleErr) / 8;  // 0-1 (1 = perfect aim)
        const powerQuality = Math.max(0, 1 - Math.abs(powerErr) / (this.powerTolerance * 2));  // 0-1

        // Don't let imperfect power estimation completely kill firing.
    // Treat powerQuality as a mild factor, not a hard multiplier.
        const confidenceBase = rawNoise * 0.55 + aimQuality * 0.45;   // 0..1
        const confidence = clamp(confidenceBase * 0.85 + powerQuality * 0.15, 0, 1);

        // Difficulty-based shooting thresholds
        let shootThreshold;
        if (selectedDifficulty === "HARD") {
            //Trigger-happy: fires when confidence is moderate
            shootThreshold = 0.35;
        } else if (selectedDifficulty === "MEDIUM") {
            //Balanced: needs decent confidence
            shootThreshold = 0.45;
        } else {
            //EASY level -> Hesitant: only shoots when very confident
            shootThreshold = 0.55;
        }

        //If confidence too low, don't even try
        if (confidence < 0.1) {
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        //Charging logic
        //Release and shoot (only if confident enough)
        if (!this.fireHolding && confidence > shootThreshold * 0.25) {
            VKEY.press(KEY_FIRE);
            this.fireHolding = true;

            // Ensure it holds long enough for POWER.value to ramp up
            const minHold = 0.18;
            //Start charging if power is below target
            if (powerErr > this.powerTolerance) {
                //Low power -> charging
                const holdTime = 0.1 + (1 - confidence) * 0.22;
                this.fireHoldUntil = now +  Math.max(minHold, holdTime);

            } else {
                this.fireHoldUntil = now + minHold;

            }
            return;
        }

        //Holding firekey logic
        //Continue holding if not ready
        if (this.fireHolding && now < this.fireHoldUntil) {
            VKEY.press(KEY_FIRE);
            return;
        }

        //Abort if lost confidence mid-charge
        if (this.fireHolding && confidence < shootThreshold * 0.6) {
            //lost confidence during charge, abort the shot
            VKEY.release(KEY_FIRE);
            this._resetFire();
            return;
        }

        //Release and shoot
        if (this.fireHolding && now >= this.fireHoldUntil) {
            VKEY.release(KEY_FIRE);

            // Create a one-frame gap where FIRE is definitely up
            this.forceReleaseFrame = true;

            this._resetFire();
            this.lastShotTime = now;

            //Set cooldown based on difficulty
            let minCooldown, maxCooldown;
            if (selectedDifficulty === "HARD") {
                minCooldown = 0.9;
                maxCooldown = 1.6;
            } else if (selectedDifficulty === "MEDIUM") {
                minCooldown = 1.2;
                maxCooldown = 2.0;
            } else {
                minCooldown = 1.5;
                maxCooldown = 2.5;
            }

            const cooldown = minCooldown + Math.random() * (maxCooldown - minCooldown);
            this.nextFireTime = now + cooldown + 0.05;

        }
    }

    //Movement Logic
    _updateMovement(keyLeft, keyRight, dt){
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

        //Avoid "blind spot" behind the center wall (x=750..850)
        const wallL = 750, wallR = 850;
        const dogMid = dogBody.x + dogBody.w / 2;
        const playerMid = player.x + player.w / 2;

        const dogRightOfWall = dogMid > wallR;
        const dogLeftOfWall = dogMid < wallL;
        const playerRightOfWall = playerMid > wallR;
        const playerLeftOfWall = playerMid < wallL;

        // If on opposite sides of wall, move toward wall to re-engage
        if (playerLeftOfWall && dogRightOfWall) {
            VKEY.press(KEY_LEFT);
            VKEY.release(KEY_RIGHT);
            return;
        }
        if (playerRightOfWall && dogLeftOfWall) {
            VKEY.press(KEY_RIGHT);
            VKEY.release(KEY_LEFT);
            return;
        }

        //update noise time
        this.noiseTime += dt*this.noiseScale;
        //getting smooth noise value (-1 to 1)
        const noiseValue = noise(this.noiseTime)*2 -1;
        const deadzone = 0.4;

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

    _resetFire() {
        this.fireHolding = false;
        this.fireHoldUntil = 0;
    }

    //Shot Calculation
    _computeShot({ shooter, target, gravity, powerScale, maxPower, shouldHit }) {
        const fromX = shooter.x + shooter.w * (shooter.facing === 1 ? 0.9 : 0.1);
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
            toX = target.x + missDir*missOffset;
            //random vertical offset
            toY = target.y + (Math.random()*100 - 50);
            //console.log("[AUTO] AIMING TO MISS (offset=" + missOffset.toFixed(0) + ")");
        }

        const dx = toX - fromX;
        const dist = Math.abs(dx);

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

        //Physics on projectile motion
        const base = (angleDeg * Math.PI) / 180;
        const a = shooter.facing === -1 ? Math.PI - base : base;

        //Binary search for the right power
        let minPower = this.minFirePower;
        let maxPower_search = maxPower;
        let bestPower = (minPower + maxPower_search) / 2;
        let bestDistance = Infinity;

        // Use correct wind direction in simulation (fix in CollisionDetection.simulateProjectileLanding)
        const windDir = shooter.facing;

        //Try 5 iterations of binary search
        for (let iteration = 0; iteration < 5; iteration++) {
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
