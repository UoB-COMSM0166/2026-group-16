function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

const sign  = (v) => (v < 0 ? -1 : 1);
function vec2(x = 0, y = 0) { return { x, y }; }
function vecLen(a) { return Math.hypot(a.x, a.y); }
function vecNorm(a) { const l = vecLen(a) || 1; return { x: a.x / l, y: a.y / l }; }

// Center-based rectangle hit test
function hitRect(cx, cy, w, h) {
  return mouseX > cx - w/2 && mouseX < cx + w/2 && mouseY > cy - h/2 && mouseY < cy + h/2;
}

//