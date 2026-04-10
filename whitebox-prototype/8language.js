class Language {
  constructor() {
    this._current = "EN";
    this._strings = {
      gameTitle:        { EN: "MERCHANT FIGHTER",                          ZH: "商人格斗家" },
      gameSubtitle:     { EN: "Rish vs Ciyang",                            ZH: "Rish 对 Ciyang" },
      btnStart:         { EN: "START",                                     ZH: "开始游戏" },
      ctrlMove:         { EN: "MOVE",                                      ZH: "移动" },
      ctrlAngle:        { EN: "ADJUST ANGLE",                              ZH: "调整角度" },
      ctrlCharge:       { EN: "HOLD SPACE TO CHARGE • RELEASE TO FIRE",    ZH: "长按空格蓄力 • 松开发射" },
      hudMoveAim:       { EN: "A/D move  W/S aim  F fire",                 ZH: "A/D 移动  W/S 瞄准  F 发射" },
      hudCharge:        { EN: "Hold F to charge, release to fire",         ZH: "长按 F 蓄力，松开发射" },
      hudMoveAimR:      { EN: "←/→ move  ↑/↓ aim  Space fire",            ZH: "←/→ 移动  ↑/↓ 瞄准  空格 发射" },
      hudChargeR:       { EN: "Hold Space to charge, release",             ZH: "长按空格蓄力，松开发射" },
      hudAngle:         { EN: "Angle",                                     ZH: "角度" },
      hudPower:         { EN: "Power",                                     ZH: "威力" },
      selectDifficulty: { EN: "Select Difficulty",                         ZH: "选择难度" },
      diffEasy:         { EN: "EASY",                                      ZH: "简单" },
      diffMedium:       { EN: "MEDIUM",                                    ZH: "普通" },
      diffHard:         { EN: "HARD",                                      ZH: "困难" },
      selectChar:       { EN: "Choose Your Character",                     ZH: "选择你的角色" },
      charDesc1Cat:     { EN: "The agile cat warrior",                     ZH: "敏捷的猫战士" },
      charDesc2Cat:     { EN: "Balanced fighter",                          ZH: "均衡型战士" },
      charDesc1Dog:     { EN: "The powerful dog warrior",                  ZH: "强悍的狗战士" },
      charDesc2Dog:     { EN: "Heavy hitter",                              ZH: "重击型战士" },
      btnBack:          { EN: "← BACK",                                    ZH: "← 返回" },
      overtime:         { EN: "OVERTIME",                                  ZH: "加时赛" },
      vs:               { EN: "VS",                                        ZH: "对战" },
      hitDamage:        { EN: "-15 HP!",                                   ZH: "-15 HP！" },
      defeatDog:        { EN: "Ciyang defeated! 💀",                       ZH: "Ciyang 被击败！💀" },
      defeatPlayer:     { EN: "Rish defeated! 💀",                         ZH: "Rish 被击败！💀" },
      wins:             { EN: "🏆 {name} Wins!",                           ZH: "🏆 {name} 胜利！" },
      remainHP:         { EN: "Remaining HP: {hp}",                        ZH: "剩余 HP：{hp}" },
      btnPlayAgain:     { EN: "🔄 Play Again",                             ZH: "🔄 再来一局" },
      btnMenu:          { EN: "← Back to Menu",                            ZH: "← 返回主菜单" },
    };
  }

  set(code) {
    if (["EN", "ZH"].includes(code)) this._current = code;
  }

  get current() { return this._current; }

  t(key, replacements = {}) {
    const entry = this._strings[key];
    if (!entry) { console.warn(`[LANG] Missing key: "${key}"`); return key; }
    let str = entry[this._current] ?? entry["EN"] ?? key;
    for (const [k, v] of Object.entries(replacements))
      str = str.replaceAll(`{${k}}`, v);
    return str;
  }
}

const LANG = new Language();

// Wire the HTML dropdown
document.addEventListener("DOMContentLoaded", () => {
  const sel = document.getElementById("lang-select");
  if (!sel) return;
  sel.value = LANG.current;
  sel.addEventListener("change", () => {
    LANG.set(sel.value);
    document.documentElement.lang = sel.value === "ZH" ? "zh" : "en";
  });
});


// ── LANGUAGE PATCHER ─────────────────────────────────────────
// Wraps p5's text() during each draw call to swap English strings.
// Your original files are completely untouched.
class LanguagePatcher {

  // Wraps a draw function so text() auto-translates known strings
  _wrap(fn, map) {
    return function(...args) {
      const origText = window.text;
      window.text = function(str, ...a) {
        if (typeof str === "string") {
          // exact match
          if (map[str]) str = map[str]();
          // template literal patterns (Angle/Power stat lines, win overlay)
          else str = str
            .replace(/\bAngle\b/, LANG.t("hudAngle"))
            .replace(/\bPower\b/, LANG.t("hudPower"))
            .replace(/🏆 (.+) Wins!/,      (_, n) => LANG.t("wins",     { name: n }))
            .replace(/Remaining HP: (\d+)/, (_, h) => LANG.t("remainHP", { hp: h   }));
        }
        return origText.call(this, str, ...a);
      };
      fn.apply(this, args);
      window.text = origText;
    };
  }

  apply() {
    window.drawStartScreen     = this._wrap(drawStartScreen, {
      "MERCHANT FIGHTER":                       () => LANG.t("gameTitle"),
      "Rish vs Ciyang":                         () => LANG.t("gameSubtitle"),
      "START":                                  () => LANG.t("btnStart"),
      "MOVE":                                   () => LANG.t("ctrlMove"),
      "ADJUST ANGLE":                           () => LANG.t("ctrlAngle"),
      "HOLD SPACE TO CHARGE • RELEASE TO FIRE": () => LANG.t("ctrlCharge"),
    });

    window.drawLevelScreen     = this._wrap(drawLevelScreen, {
      "Select Difficulty": () => LANG.t("selectDifficulty"),
      "EASY":              () => LANG.t("diffEasy"),
      "MEDIUM":            () => LANG.t("diffMedium"),
      "HARD":              () => LANG.t("diffHard"),
      "← BACK":            () => LANG.t("btnBack"),
    });

    window.drawCharacterScreen = this._wrap(drawCharacterScreen, {
      "Choose Your Character":    () => LANG.t("selectChar"),
      "The agile cat warrior":    () => LANG.t("charDesc1Cat"),
      "Balanced fighter":         () => LANG.t("charDesc2Cat"),
      "The powerful dog warrior": () => LANG.t("charDesc1Dog"),
      "Heavy hitter":             () => LANG.t("charDesc2Dog"),
      "← BACK":                   () => LANG.t("btnBack"),
    });

    window.drawPlayScreen      = this._wrap(drawPlayScreen, {
      "A/D move  W/S aim  F fire":        () => LANG.t("hudMoveAim"),
      "Hold F to charge, release to fire":() => LANG.t("hudCharge"),
      "←/→ move  ↑/↓ aim  Space fire":   () => LANG.t("hudMoveAimR"),
      "Hold Space to charge, release":    () => LANG.t("hudChargeR"),
      "OVERTIME":                         () => LANG.t("overtime"),
      "VS":                               () => LANG.t("vs"),
      "← BACK":                           () => LANG.t("btnBack"),
      "🔄 Play Again":                    () => LANG.t("btnPlayAgain"),
      "← Back to Menu":                   () => LANG.t("btnMenu"),
    });

    window.drawBackBtn = this._wrap(drawBackBtn, {
      "← BACK": () => LANG.t("btnBack"),
    });

    window.drawHealthBars = this._wrap(drawHealthBars, {
      "VS": () => LANG.t("vs"),
    });

    // Translate float damage texts in collision detection
    // Translate float damage texts in collision detection (with bounce)
    CollisionDetection.prototype._updateProjectile = function(p, dt) {
      const windDir = p.windDir !== undefined ? p.windDir : 1;
      const gravScale = p.gravityScale !== undefined ? p.gravityScale : 1;
      p.vx += this.windAccel * windDir * dt;
      p.vy += this.gravity * gravScale * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;

      // ── 边界反弹 ──
      let bounced = false;
      if (p.x - p.r < 0) {
        p.x = p.r;
        p.vx = Math.abs(p.vx) * 0.8;
        bounced = true;
      }
      if (p.x + p.r > this.worldWidth) {
        p.x = this.worldWidth - p.r;
        p.vx = -Math.abs(p.vx) * 0.8;
        bounced = true;
      }
      if (p.y - p.r < 0) {
        p.y = p.r;
        p.vy = Math.abs(p.vy) * 0.8;
        bounced = true;
      }
      // 底部掉出 → 直接消亡
      if (p.y > this.worldHeight + 200) {
        p.alive = false; return;
      }
      if (bounced) {
        p.bounces++;
        if (p.bounces > p.maxBounces) { p.alive = false; return; }
      }

      // ── 角色碰撞（反弹后可伤害所有人）──
      for (const ch of this.characters) {
        if (p.bounces === 0 && ch.tag === p.owner) continue;
        const hit = CollisionDetection.circleAABBHit(p, { x:ch.x, y:ch.y, w:ch.w, h:ch.h });
        if (hit) {
          if (ch.tag === "dog") {
            dogHP = Math.max(0, dogHP - 15);
            this.floatTexts.push({ x:ch.x+ch.w/2, y:ch.y-20, vy:-50, life:1.2,
              text: dogHP <= 0 ? `${LABELS.target} defeated! 💀` : LANG.t("hitDamage") });
            tryPlaySound(sndHit);
          } else if (ch.tag === "player") {
            catHP = Math.max(0, catHP - 15);
            this.floatTexts.push({ x:ch.x+ch.w/2, y:ch.y-20, vy:-50, life:1.2,
              text: catHP <= 0 ? `${LABELS.player} defeated! 💀` : LANG.t("hitDamage") });
            tryPlaySound(sndHit);
          }
          p.alive = false; return;
        }
      }

      // ── 障碍物反弹 ──
      const box = { x:p.x-p.r, y:p.y-p.r, w:p.r*2, h:p.r*2 };
      for (const id of this._queryNearbyAABB(box)) {
        const stat = this.staticBodies.find(b => b.id === id);
        if (!stat) continue;
        const hit = CollisionDetection.circleAABBHit(p, stat);
        if (hit) {
          p.bounces++;
          if (p.bounces > p.maxBounces) { p.alive = false; return; }
          const n = hit.normal;
          const dot = p.vx * n.x + p.vy * n.y;
          p.vx = (p.vx - 2 * dot * n.x) * 0.8;
          p.vy = (p.vy - 2 * dot * n.y) * 0.8;
          p.x = hit.point.x + n.x * (p.r + 1);
          p.y = hit.point.y + n.y * (p.r + 1);
          break;
        }
      }
    };

    console.log("[LANG] Patcher applied ✓");
  }
}

const LANG_PATCHER = new LanguagePatcher();