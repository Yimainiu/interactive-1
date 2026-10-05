// Collective Alphabet
// Every glyph is drawn on a unit grid: y = 0 is the cap line, y = 3 the
// x-height, y = 8 the baseline and y = 10 the descender. Each part is a pair
// [lowercase, uppercase]; CSS transitions between the two on hover.

// ---- shape helpers ----

// Rectangle; radius is "pill", a number, or [tl, tr, br, bl] where each
// corner is a number or [rx, ry].
function R(x, y, w, h, radius = "pill") {
  return { cx: x + w / 2, cy: y + h / 2, w, h, rot: 0, radius };
}

// Circle with diameter d.
function C(x, y, d) {
  return R(x, y, d, d, d / 2);
}

// Quarter disc of radius r with its round corner at "tl", "tr", "br" or "bl".
function Q(x, y, r, corner) {
  const corners = ["tl", "tr", "br", "bl"].map((c) => (c === corner ? r : 0));
  return R(x, y, r, r, corners);
}

// Pill of thickness 1 between two cap centres (for diagonals).
function S(x1, y1, x2, y2) {
  if (x2 < x1) [x1, y1, x2, y2] = [x2, y2, x1, y1];
  const length = Math.hypot(x2 - x1, y2 - y1);
  return {
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
    w: length + 1,
    h: 1,
    rot: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
    radius: "pill",
  };
}

// Right triangle whose right angle sits bottom-right ("l") or bottom-left ("r").
function T(x, y, w, h, side) {
  const clip =
    side === "l"
      ? "polygon(100% 0, 100% 100%, 0 100%)"
      : "polygon(0 0, 100% 100%, 0 100%)";
  return { ...R(x, y, w, h, 0), clip };
}

const hide = (shape) => ({ ...shape, hidden: true });
const turn = (shape, rot) => ({ ...shape, rot });

// ---- glyphs ----

const GLYPHS = {
  A: [
    [T(3, 3, 1, 1, "l"), T(3, 0, 1, 1.5, "l")],
    [T(7, 3, 1, 1, "r"), T(7, 0, 1, 1.5, "r")],
    [R(4, 4.25, 3, 1), R(4, 2, 3, 1)],
    [R(3, 5.5, 1, 2.5), R(3, 3.5, 1, 4.5)],
    [R(7, 5.5, 1, 2.5), R(7, 3.5, 1, 4.5)],
  ],
  B: [
    [R(3, 0, 1, 8), R(3, 0, 1, 8)],
    [C(4, 4, 4), C(4, 0, 4)],
    [C(4, 4, 4), C(4, 4, 4)],
  ],
  C: [
    [R(3, 3, 1, 5, [1, 0, 0, 1]), R(3, 0, 1, 8, [1, 0, 0, 1])],
    [R(4, 3, 4, 1), R(4, 0, 4, 1)],
    [R(4, 7, 4, 1), R(4, 7, 4, 1)],
  ],
  D: [
    [R(3, 3.5, 1, 4, [1, 0, 0, 1]), R(3, 0, 1, 8)],
    [R(4, 3, 3, 1), R(4, 0, 3, 1)],
    [R(4, 7, 3, 1), R(4, 7, 3, 1)],
    [R(7, 0, 1, 8), R(7, 0.5, 1, 7, [0, 1, 1, 0])],
  ],
  E: [
    [R(3, 3, 1, 5), R(3, 0, 1, 8)],
    [R(4, 3, 4, 1), R(4, 0, 4, 1)],
    [C(7, 4, 1), C(7, 3.5, 1)],
    [R(4, 5, 4, 1), R(4, 3.5, 4, 1)],
    [R(4, 7, 4, 1), R(4, 7, 4, 1)],
  ],
  F: [
    [R(3, 3, 4, 1), R(3, 0, 5, 1)],
    [C(7, 3, 1), C(7, 0, 1)],
    [R(3, 4, 1, 4), R(3, 1, 1, 7)],
    [R(4, 5, 4, 1), R(4, 3, 4, 1)],
  ],
  G: [
    [R(3, 3, 1, 3), R(3, 1, 1, 7)],
    [R(4, 3, 4, 1), R(3, 0, 5, 1)],
    [R(7, 3.5, 1, 2, 0), R(7, 4, 1, 3.5, 0)],
    [R(4, 5, 4, 1), R(4, 3.5, 4, 1)],
    [R(7, 6, 1, 2), R(7, 4, 1, 4)],
    [R(3, 7, 4, 1), R(4, 7, 4, 1)],
  ],
  H: [
    [R(3, 3, 1, 5), R(3, 4.5, 1, 3.5)],
    [R(3, 3, 1, 3.5), R(3, 0, 1, 3.5)],
    [R(4, 5, 3, 1), R(4, 3.5, 3, 1)],
    [R(7, 5, 1, 3), R(7, 4.5, 1, 3.5)],
    [R(7, 5, 1, 3), R(7, 0, 1, 3.5)],
  ],
  I: [
    [R(3, 3, 2, 1), R(3, 0, 1, 1)],
    [R(3.5, 5, 1, 3), R(3, 0, 1, 8)],
  ],
  J: [
    [C(5, 3, 1), C(3, 6.5, 1)],
    [R(5, 4.5, 1, 3.5), R(7, 0, 1, 8)],
    [R(3, 7, 3, 1), R(4, 7, 4, 1)],
  ],
  K: [
    [R(3, 0, 1, 8), R(3, 0, 1, 8)],
    [S(4.5, 4.5, 7.4, 7.4), S(4.5, 4.5, 7.4, 7.4)],
    [turn(C(6.5, 3, 1.5), -45), S(4.4, 3.5, 7.05, 0.85)],
  ],
  L: [
    [R(3, 3, 1, 5), R(3, 0, 1, 8)],
    [R(3, 7, 1, 1), R(4, 7, 4, 1)],
  ],
  M: [
    [R(3, 3, 1, 5), R(3, 0, 1, 8)],
    [R(5, 3, 1, 2), R(5, 1, 1, 3)],
    [R(7, 3, 1, 5), R(7, 0, 1, 8)],
  ],
  N: [
    [R(3, 3, 1, 5), R(3, 0, 1, 8)],
    [R(7, 3, 1, 5), R(7, 0, 1, 8)],
    [S(4.8, 4.8, 6.2, 6.2), S(4.8, 3.25, 6.2, 4.65)],
  ],
  O: [
    [Q(3, 3, 2.5, "tl"), Q(3, 0, 2, "tl")],
    [Q(5.5, 3, 2.5, "tr"), Q(6, 0, 2, "tr")],
    [Q(3, 5.5, 2.5, "bl"), Q(3, 6, 2, "bl")],
    [Q(5.5, 5.5, 2.5, "br"), Q(6, 6, 2, "br")],
    [hide(R(5, 4, 1, 3)), R(3, 2.5, 1, 3)],
    [hide(R(5, 4, 1, 3)), R(7, 2.5, 1, 3)],
  ],
  P: [
    [R(3, 3, 1, 7), R(3, 0, 1, 8)],
    [Q(4, 3, 2, "tl"), Q(4, 0, 2, "tl")],
    [Q(6, 3, 2, "tr"), Q(7, 0, 2, "tr")],
    [Q(4, 5, 2, "bl"), Q(4, 3, 2, "bl")],
    [Q(6, 5, 2, "br"), Q(7, 3, 2, "br")],
  ],
  Q: [
    [R(3, 3, 4, 2.5, [[2, 2.5], [2, 2.5], 0, 0]), R(3, 0, 4, 2, [2, 2, 0, 0])],
    [R(3, 5.5, 4, 2.5, [0, 0, [2, 2.5], [2, 2.5]]), R(3, 6, 4, 2, [0, 0, 2, 2])],
    [hide(R(4.5, 4, 1, 3)), R(3, 2.5, 1, 3)],
    [hide(R(4.5, 4, 1, 3)), R(6, 2.5, 1, 3)],
    [R(6.5, 7, 1.5, 1), S(7.18, 7.23, 7.52, 7.57)],
  ],
  R: [
    [R(3, 3, 1, 5), R(3, 0, 1, 8)],
    [R(4, 3.5, 2, 1), R(4, 4, 3, 1)],
    [R(4, 3.5, 2, 1), R(4, 0, 3, 1)],
    [hide(R(5, 3.5, 1, 1, [0, 0.5, 0.5, 0])), R(7, 0.5, 1, 4, [0, 1, 1, 0])],
    [hide(turn(R(4.5, 3.5, 1.5, 1), 45)), S(5.5, 5.5, 7.5, 7.5)],
  ],
  S: [
    [Q(3, 3, 1.25, "tl"), Q(4, 0, 2, "tl")],
    [Q(3, 4.25, 1.25, "bl"), Q(3, 2, 2, "bl")],
    [Q(3.75, 5.5, 1.25, "tr"), Q(6, 4, 2, "tr")],
    [Q(3.75, 6.75, 1.25, "br"), Q(5, 6, 2, "br")],
    [hide(C(4, 5.5, 0)), C(5, 3.5, 1)],
  ],
  T: [
    [R(3, 3, 3, 1), R(3, 0, 5, 1)],
    [R(4, 4, 1, 4, [0.5, 0.5, 0, 1]), R(5, 2, 1, 6)],
  ],
  U: [
    [R(3, 3, 1, 4), R(3, 0, 1, 7)],
    [R(7, 3, 1, 4), R(7, 0, 1, 7)],
    [R(3.5, 7, 4, 1), R(3.5, 7, 4, 1)],
  ],
  V: [
    [R(3, 3, 1, 3.5), R(3, 0, 1, 6)],
    [R(7, 3, 1, 3.5), R(7, 0, 1, 6)],
    [R(4.5, 7, 2, 1), R(4.5, 7, 2, 1)],
  ],
  W: [
    [R(3, 3, 1, 5), R(3, 0, 1, 8)],
    [R(7, 3, 1, 5), R(7, 0, 1, 8)],
    [R(5, 5, 1, 2), R(5, 3, 1, 4)],
  ],
  X: [
    [S(3.9, 3.9, 7.3, 7.3), S(3.7, 0.87, 7.4, 7.32)],
    [S(3.9, 7.3, 7.3, 3.9), S(3.7, 7.32, 7.4, 0.87)],
  ],
  Y: [
    [R(3, 3, 1, 3), R(3, 0, 1, 4.5)],
    [R(7, 3, 1, 3), R(7, 0, 1, 4.5)],
    [R(4, 6, 3, 1), R(4, 4, 3, 1)],
    [C(7, 6.5, 1), C(6, 4, 1)],
    [R(7, 8, 1, 2), R(5, 5.5, 1, 2.5)],
  ],
  Z: [
    [R(3, 3, 5, 1), R(3, 0, 5, 1)],
    [S(4.8, 6.3, 6.2, 4.9), S(3.85, 5.72, 5, 4.57)],
    [S(4.8, 6.3, 6.2, 4.9), S(5.97, 3.55, 7.12, 2.4)],
    [R(3, 7, 5, 1), R(3, 7, 5, 1)],
  ],
};

// ---- rendering ----

const TILE_WIDTH = 9; // units; each tile is 9 x 12 units
const TILE_TOP = -1; // first visible row of the grid

function radiusCss(shape) {
  let corners = shape.radius;
  if (corners === "pill") corners = Math.min(shape.w, shape.h) / 2;
  if (!Array.isArray(corners)) corners = [corners, corners, corners, corners];
  const pairs = corners.map((c) => (Array.isArray(c) ? c : [c, c]));
  const xs = pairs.map((p) => `${p[0]}em`).join(" ");
  const ys = pairs.map((p) => `${p[1]}em`).join(" ");
  return `${xs} / ${ys}`;
}

// Horizontal centre of the visible parts, so each case is centred on its own.
function centreOf(shapes) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of shapes) {
    if (s.hidden) continue;
    const a = (s.rot * Math.PI) / 180;
    const half = Math.abs((s.w / 2) * Math.cos(a)) + Math.abs((s.h / 2) * Math.sin(a));
    min = Math.min(min, s.cx - half);
    max = Math.max(max, s.cx + half);
  }
  return (min + max) / 2;
}

function setState(el, prefix, shape, shiftX) {
  el.style.setProperty(`--${prefix}x`, shape.cx - shape.w / 2 + shiftX);
  el.style.setProperty(`--${prefix}y`, shape.cy - shape.h / 2 - TILE_TOP);
  el.style.setProperty(`--${prefix}w`, shape.w);
  el.style.setProperty(`--${prefix}h`, shape.h);
  el.style.setProperty(`--${prefix}rot`, `${shape.rot}deg`);
  el.style.setProperty(`--${prefix}radius`, radiusCss(shape));
  el.style.setProperty(`--${prefix}opacity`, shape.hidden ? 0 : 1);
}

function renderSpecimen(container) {
  for (const [letter, parts] of Object.entries(GLYPHS)) {
    const lowerShift = TILE_WIDTH / 2 - centreOf(parts.map((p) => p[0]));
    const upperShift = TILE_WIDTH / 2 - centreOf(parts.map((p) => p[1]));

    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.setAttribute("aria-label", `Letter ${letter}`);

    const label = document.createElement("span");
    label.className = "tile-label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = letter + letter.toLowerCase();

    const glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.setAttribute("aria-hidden", "true");

    for (const [lower, upper] of parts) {
      const part = document.createElement("span");
      part.className = "part";
      setState(part, "l", lower, lowerShift);
      setState(part, "u", upper, upperShift);
      const clip = lower.clip || upper.clip;
      if (clip) part.style.clipPath = clip;
      glyph.append(part);
    }

    tile.append(label, glyph);
    container.append(tile);
  }
}

renderSpecimen(document.getElementById("specimen"));

const toggle = document.getElementById("case-toggle");
toggle.addEventListener("click", () => {
  const upper = toggle.getAttribute("aria-pressed") !== "true";
  toggle.setAttribute("aria-pressed", String(upper));
  toggle.textContent = upper ? "Show lowercase" : "Show uppercase";
  document.getElementById("specimen").classList.toggle("is-upper", upper);
});
