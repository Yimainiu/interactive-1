import * as THREE from "three";
import {
  reseed,
  rand,
  materials,
  mat,
  addMesh,
  box,
  cyl,
  bar,
  place,
  batch,
  facetedGround,
  makeLayers,
  standingPerson,
} from "./lowpoly.js";

/* ------------------------------------------------------------------
   Scene 2: ID Studio
   A rough low-poly rebuild of the ID studio, laid out from the
   photo set, panorama and walk-around video in Space Media/ID Studio.

   Units are metres. x runs to the right, y is up and the window
   wall is at the back (-z). The long aisle with the EXIT sign runs
   along the front (+z), with glass-walled rooms on its far side;
   the corridor leaves from the back left corner.
------------------------------------------------------------------- */

// ---------- colours picked from the photos ----------
const C = {
  floor: "#7d7568",
  base: "#4f483f",
  wall: "#efece4",
  panel: "#c9c3a3",
  ceiling: "#ece3c8",
  steel: "#a9aeb1",
  glass: "#f4f6f2",
  shade: "#3f4245",
  wood: "#d6a463",
  frame: "#efefea",
  cardboard: "#c49a66",
  black: "#2a292c",
  board: "#333236",
  yellow: "#f2c12e",
  white: "#f7f5f0",
  grey: "#9a9b9d",
  red: "#d1392f",
  teal: "#7fd3c4",
  lime: "#b9e05a",
  pink: "#e86a8a",
  concrete: "#d9d6cd",
  roomGlass: "#b8c7c9",
};

const ROOM = { left: -10, right: 13, back: -13, front: 2.6, height: 6 };
const CORRIDOR = { left: -6.5, right: -3.2, end: -24, height: 3.4 };
const AISLE = { near: -2.4, far: 0.6 }; // z range of the EXIT aisle
const GLASS_Z = 1.2; // front of the glass-walled rooms
const AISLE_END = 38; // where the long aisle stops, well past the studio
const PANEL = { bottom: 1.0, top: 2.5 }; // the hanging beige tack boards

let scene;
let layers; // groups the panel can show or hide
// roof parts also hide when the camera flies above the room, like a dollhouse
let roof;
// window frames and thin structure that shouldn't stripe the floor with shadows
let shell;
// the cable grid: stays when the roof hides, goes with the Ceiling checkbox
let grid;

/* ==================================================================
   ROOM SHELL
================================================================== */

// one-sided wall: visible from inside, see-through from outside
function wall(w, h, color, x, y, z, turnDeg, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.y = THREE.MathUtils.degToRad(turnDeg);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildFloor() {
  const w = ROOM.right - ROOM.left;
  const d = ROOM.front - ROOM.back;
  const x = ROOM.left + w / 2;
  const z = ROOM.back + d / 2;
  facetedGround(scene, w, d, C.floor, x, z, 0.68);
  box(scene, w, 0.4, d, C.base, x, -0.41, z);

  // the corridor floor and its slab
  const cw = CORRIDOR.right - CORRIDOR.left;
  const cd = ROOM.back - CORRIDOR.end;
  const cx = CORRIDOR.left + cw / 2;
  const cz = CORRIDOR.end + cd / 2;
  facetedGround(scene, cw, cd, C.floor, cx, cz, 0.68);
  box(scene, cw, 0.4, cd, C.base, cx, -0.41, cz);

  // yellow tape on the floor by the column in the aisle
  const tape = batch();
  tape.box(1.6, 0.005, 0.06, C.yellow, 4.4, 0.005, AISLE.far - 0.05);
  tape.box(0.06, 0.005, 1.0, C.yellow, 3.6, 0.005, AISLE.far - 0.55);
  tape.addTo(scene);
}

function buildWalls() {
  const w = ROOM.right - ROOM.left;
  const d = ROOM.front - ROOM.back;
  const midZ = ROOM.back + d / 2;

  // back wall: big factory windows from the corridor to the right wall
  const winL = CORRIDOR.right;
  const winW = ROOM.right - winL;
  const winX = winL + winW / 2;
  const sill = 0.8;
  const head = 5.3;
  wall(winW, sill, C.wall, winX, 0, ROOM.back, 0);
  wall(winW, ROOM.height - head, C.wall, winX, head, ROOM.back, 0);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, head - sill), new THREE.MeshBasicMaterial({ color: C.glass }));
  glass.position.set(winX, (sill + head) / 2, ROOM.back);
  scene.add(glass);

  const bays = Math.round(winW / 1.9);
  const bay = winW / bays;
  for (let i = 0; i <= bays; i++) {
    const x = winL + i * bay;
    bar(shell, [x, sill, ROOM.back + 0.05], [x, head, ROOM.back + 0.05], 0.09, C.steel);
  }
  for (const y of [sill, 1.9, 3.1, 4.2, head]) {
    bar(shell, [winL, y, ROOM.back + 0.05], [ROOM.right, y, ROOM.back + 0.05], 0.07, C.steel);
  }
  // dark mesh shades pulled most of the way down, a few left up
  for (let i = 0; i < bays; i++) {
    if (rand() < 0.15) continue;
    const bottom = 1.4 + rand() * 0.5;
    const shade = box(scene, bay - 0.08, head - bottom, 0.03, C.shade, winL + i * bay + bay / 2, bottom, ROOM.back + 0.12);
    shade.castShadow = false;
  }

  // long white counter under the windows, with screens and clutter
  box(scene, winW, 0.88, 0.65, C.white, winX, 0, ROOM.back + 0.4);
  const clutter = [C.red, C.yellow, C.white, C.grey, "#f08a3c", C.lime, C.pink];
  for (let x = winL + 0.5; x < ROOM.right - 0.3; x += 0.5 + rand() * 0.7) {
    if (rand() < 0.3) {
      box(scene, 0.55, 0.38, 0.05, "#d9dadc", x, 1.0, ROOM.back + 0.45); // screen
      box(scene, 0.06, 0.14, 0.06, "#d9dadc", x, 0.88, ROOM.back + 0.45);
    } else {
      const h = 0.1 + rand() * 0.3;
      cyl(scene, 0.06 + rand() * 0.06, 0.1, h, 6, clutter[Math.floor(rand() * clutter.length)], x, 0.88, ROOM.back + 0.45);
    }
  }

  // back left: white wall of the room beside the corridor, with model shelves
  wall(CORRIDOR.left - ROOM.left, ROOM.height, C.wall, (ROOM.left + CORRIDOR.left) / 2, 0, ROOM.back, 0);
  box(scene, 0.15, 3.2, 4.5, C.wall, CORRIDOR.left - 0.08, 0, ROOM.back + 2.25);
  shelves(CORRIDOR.left - 0.2, ROOM.back + 1.6, -90);
  // header over the corridor opening
  wall(CORRIDOR.right - CORRIDOR.left, ROOM.height - CORRIDOR.height, C.wall, (CORRIDOR.left + CORRIDOR.right) / 2, CORRIDOR.height, ROOM.back, 0);

  // the corridor: white walls, low ceiling, a door and exit light at the end
  const cd = ROOM.back - CORRIDOR.end;
  const cz = CORRIDOR.end + cd / 2;
  wall(cd, CORRIDOR.height, C.wall, CORRIDOR.left, 0, cz, 90);
  wall(cd, CORRIDOR.height, C.wall, CORRIDOR.right, 0, cz, -90);
  wall(CORRIDOR.right - CORRIDOR.left, CORRIDOR.height, C.wall, (CORRIDOR.left + CORRIDOR.right) / 2, 0, CORRIDOR.end, 0);
  box(scene, 1.0, 2.2, 0.05, "#3c6a62", (CORRIDOR.left + CORRIDOR.right) / 2, 0, CORRIDOR.end + 0.03);
  box(scene, 0.4, 0.15, 0.05, "#55c27a", (CORRIDOR.left + CORRIDOR.right) / 2, 2.6, CORRIDOR.end + 0.03);
  for (const z of [-15, -18.5, -22]) {
    box(scene, 0.04, 1.0, 3.0, "#cfd6d8", CORRIDOR.left + 0.03, 1.1, z); // windows into rooms
  }
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.right - CORRIDOR.left, cd), mat(C.wall));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set((CORRIDOR.left + CORRIDOR.right) / 2, CORRIDOR.height, cz);
  roof.add(ceiling);

  // concrete column at the corridor mouth
  cyl(scene, 0.25, 0.25, ROOM.height, 10, C.concrete, CORRIDOR.right + 0.3, 0, ROOM.back + 0.4);

  // side walls (only seen from inside); the left one has a long window into a room
  wall(d, ROOM.height, C.wall, ROOM.left, 0, midZ, 90);
  box(scene, 0.04, 1.0, 4.0, "#cfd6d8", ROOM.left + 0.03, 1.2, ROOM.back + 5);
  wall(d, ROOM.height, C.wall, ROOM.right, 0, midZ, -90);
  wall(w, ROOM.height, C.wall, (ROOM.left + ROOM.right) / 2, 0, ROOM.front, 180);

  // ceiling: one-sided so it disappears when seen from above
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(C.ceiling));
  deck.rotation.x = Math.PI / 2;
  deck.position.set(ROOM.left + w / 2, ROOM.height, midZ);
  roof.add(deck);
}

// the glass-walled rooms along the far side of the aisle; the aisle carries
// on past the studio's right wall, so it gets its own long strip of building
function buildAisle() {
  const ext = AISLE_END - ROOM.right;
  const ez = (AISLE.near - 0.6 + ROOM.front) / 2;
  const ed = ROOM.front - AISLE.near + 0.6;
  facetedGround(scene, ext, ed, C.floor, ROOM.right + ext / 2, ez, 0.68);
  box(scene, ext, 0.4, ed, C.base, ROOM.right + ext / 2, -0.41, ez);
  wall(ext, ROOM.height, C.wall, ROOM.right + ext / 2, 0, AISLE.near - 0.6, 0);
  wall(ed, ROOM.height, C.wall, AISLE_END, 0, ez, -90);
  wall(ext, ROOM.height, C.wall, ROOM.right + ext / 2, 0, ROOM.front, 180);
  const extCeiling = new THREE.Mesh(new THREE.PlaneGeometry(ext, ed), mat(C.ceiling));
  extCeiling.rotation.x = Math.PI / 2;
  extCeiling.position.set(ROOM.right + ext / 2, ROOM.height, ez);
  roof.add(extCeiling);

  const roomGlass = new THREE.MeshStandardMaterial({
    color: C.roomGlass,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    depthWrite: false,
  });
  materials.set("room glass", roomGlass);
  const len = AISLE_END - ROOM.left;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.1), roomGlass);
  pane.position.set(ROOM.left + len / 2, 1.55, GLASS_Z);
  pane.rotation.y = Math.PI;
  scene.add(pane);
  const frames = batch();
  for (let x = ROOM.left; x <= AISLE_END + 0.01; x += 1.5) {
    frames.box(0.06, 3.1, 0.08, "#3a3d40", x, 0, GLASS_Z);
  }
  for (const y of [0, 1.0, 3.05]) frames.box(len, 0.06, 0.08, "#3a3d40", ROOM.left + len / 2, y, GLASS_Z);
  frames.box(len, ROOM.height - 3.1, 0.15, C.wall, ROOM.left + len / 2, 3.1, GLASS_Z + 0.05);
  frames.addTo(shell);

  // shelves of models inside the glass rooms
  for (const x of [-7, -2.5, 3.5, 8, 11.5, 17, 23, 29, 35]) shelves(x, GLASS_Z + 0.5, 180);

  // round concrete columns along the aisle
  for (const x of [-7.8, -1.6, 4.6, 10.8, 17, 23.2, 29.4, 35.6]) {
    cyl(scene, 0.25, 0.25, ROOM.height, 10, C.concrete, x, 0, AISLE.far + 0.25);
  }

  // recycling bins by a column
  box(layers.furniture, 0.5, 1.0, 0.5, "#2f63b8", 5.4, 0, GLASS_Z - 0.35);
  box(layers.furniture, 0.5, 1.0, 0.5, "#3e8a4f", 6.0, 0, GLASS_Z - 0.35);
  box(layers.furniture, 0.5, 1.0, 0.5, "#2f63b8", 6.6, 0, GLASS_Z - 0.35);

  // red EXIT sign hanging over the aisle, readable from both ends
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 96;
  const g = cv.getContext("2d");
  g.fillStyle = "#c8322c";
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = g.fillStyle = "#fbe9e4";
  g.lineWidth = 4;
  g.strokeRect(8, 8, 240, 80);
  g.font = "bold 58px Arial, Helvetica, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("EXIT", 128, 50);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshBasicMaterial({ map: tex });
  const edge = mat("#c8322c");
  addMesh(layers.hanging, new THREE.BoxGeometry(0.08, 0.36, 0.95), [face, face, edge, edge, edge, edge], 7.5, 3.4, (AISLE.near + AISLE.far) / 2);
  const mid = (AISLE.near + AISLE.far) / 2;
  bar(layers.hanging, [7.5, 3.58, mid - 0.3], [7.5, 4.2, mid - 0.3], 0.02, C.black);
  bar(layers.hanging, [7.5, 3.58, mid + 0.3], [7.5, 4.2, mid + 0.3], 0.02, C.black);
}

// white shelving unit with small models on it; faces +z before turning
function shelves(x, z, turn) {
  const g = place(scene, x, z, turn);
  box(g, 2.4, 2.0, 0.04, C.white, 0, 0, -0.2);
  for (const y of [0.05, 0.5, 0.95, 1.4, 1.85]) box(g, 2.4, 0.03, 0.4, C.white, 0, y, 0);
  const colors = [C.cardboard, C.white, C.red, "#d8c7a8", C.grey, C.cardboard];
  for (const y of [0.08, 0.53, 0.98, 1.43]) {
    for (let x2 = -1.0; x2 < 1.05; x2 += 0.3 + rand() * 0.25) {
      const h = 0.1 + rand() * 0.25;
      box(g, 0.14 + rand() * 0.1, h, 0.15, colors[Math.floor(rand() * colors.length)], x2, y, 0);
    }
  }
}

// exposed steel and the cable grid under the ceiling, plus skylights over the aisle
function buildCeiling() {
  for (let z = ROOM.back + 0.6; z < ROOM.front; z += 1.4) {
    box(roof, ROOM.right - ROOM.left, 0.28, 0.12, "#e3d7b5", (ROOM.left + ROOM.right) / 2, ROOM.height - 0.28, z);
  }

  for (const z of [-11, -7, -3]) {
    const top = 5.6;
    const bottom = 4.75;
    bar(roof, [ROOM.left, top, z], [ROOM.right, top, z], 0.16, C.steel);
    bar(roof, [ROOM.left, bottom, z], [ROOM.right, bottom, z], 0.16, C.steel);
    let up = true;
    for (let x = ROOM.left; x < ROOM.right; x += 1.2) {
      bar(roof, [x, up ? bottom : top, z], [x + 1.2, up ? top : bottom, z], 0.08, C.steel);
      up = !up;
    }
  }

  // sloped skylights over the aisle
  const sky = new THREE.MeshBasicMaterial({ color: "#fbfaf4", side: THREE.DoubleSide });
  const light = new THREE.Mesh(new THREE.PlaneGeometry(AISLE_END - ROOM.left, 2.4), sky);
  light.position.set((ROOM.left + AISLE_END) / 2, 5.5, (AISLE.near + AISLE.far) / 2);
  light.rotation.x = Math.PI / 2 - 0.5;
  roof.add(light);

  const led = new THREE.MeshBasicMaterial({ color: "#fffdf4" });
  for (const z of [-9.5, -7.8, -4, -2.4]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(ROOM.right - CORRIDOR.right - 1, 0.04, 0.06), led);
    strip.position.set((CORRIDOR.right + ROOM.right) / 2, 4.5, z);
    roof.add(strip);
  }

  // unistrut grid that the cord reels hang from (kept when the roof hides)
  const gridY = 4.2;
  for (let z = -11; z <= -2; z += 3) {
    bar(grid, [ROOM.left + 1, gridY, z], [ROOM.right - 1, gridY, z], 0.06, C.steel);
  }
  for (let x = -8; x <= 12; x += 3) {
    bar(grid, [x, gridY, -11], [x, gridY, -2], 0.06, C.steel);
  }
}

/* ==================================================================
   FURNITURE + OBJECTS
================================================================== */

// white steel workbench with a butcher-block top
function workbench(parent, x, z, turn, w = 1.25, d = 0.78, h = 0.92) {
  const g = place(parent, x, z, turn);
  box(g, w, 0.05, d, C.wood, 0, h - 0.05, 0);
  const lx = w / 2 - 0.06;
  const lz = d / 2 - 0.06;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, 0.04, h - 0.13, 0.04, C.frame, sx * lx, 0.08, sz * lz);
    cyl(g, 0.04, 0.04, 0.08, 6, C.grey, sx * lx, 0, sz * lz);
  }
  for (const y of [h - 0.12, 0.2]) {
    box(g, w - 0.12, 0.04, 0.04, C.frame, 0, y, -lz);
    box(g, w - 0.12, 0.04, 0.04, C.frame, 0, y, lz);
    box(g, 0.04, 0.04, d - 0.12, C.frame, -lx, y, 0);
    box(g, 0.04, 0.04, d - 0.12, C.frame, lx, y, 0);
  }
  bar(g, [-lx, 0.22, lz], [lx, h - 0.14, lz], 0.035, C.frame);
  g.userData.top = h;
  return g;
}

// tall sheet of cardboard used as a divider
function cardboard(parent, w, h, x, z, turn, y = 0) {
  const g = place(parent, x, z, turn, y);
  box(g, w, h, 0.012, C.cardboard, 0, 0, 0);
  return g;
}

// drafting stool: five-star base, foot ring, round seat
function stool(parent, x, z, seatH = 0.68) {
  const g = place(parent, x, z, rand() * 360);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    bar(g, [0, 0.07, 0], [Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3], 0.04, C.black);
  }
  cyl(g, 0.025, 0.025, seatH, 6, C.black, 0, 0.05, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 10), mat(C.grey));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.38;
  g.add(ring);
  cyl(g, 0.19, 0.17, 0.07, 9, C.black, 0, seatH, 0);
  return g;
}

// pinned sheets of paper on a board: a few headers in colour, the rest white
function posters(parent, w, h, x0, y0, z, count, colorful = false) {
  const sheets = batch();
  for (let i = 0; i < count; i++) {
    const sw = 0.2 + rand() * 0.15;
    const sh = 0.26 + rand() * 0.12;
    const color = colorful && rand() < 0.4 ? [C.pink, C.teal, "#f3d36b", "#9bc3f0"][Math.floor(rand() * 4)] : C.white;
    sheets.box(sw, sh, 0.004, color, x0 + rand() * (w - sw) + sw / 2, y0 + rand() * (h - sh), z);
  }
  sheets.addTo(parent);
}

// tall cardboard display board on two black posts with feet
function displayBoard(x, z, turn, withPosters) {
  const g = place(layers.cardboard, x, z, turn);
  box(g, 1.25, 2.1, 0.012, C.cardboard, 0, 0.3, 0);
  for (const px of [-0.6, 0.6]) {
    box(g, 0.06, 2.3, 0.06, C.black, px, 0, 0.04);
    box(g, 0.08, 0.05, 0.6, C.black, px, 0, 0.04);
  }
  if (withPosters) {
    posters(g, 1.0, 1.4, -0.5, 0.9, 0.01, 9, true);
    posters(g, 1.0, 1.0, -0.5, 1.2, -0.01, 5);
  }
}

// beige tack board hanging from a track, about a metre off the floor
function hangingPanel(x0, x1, z, side = 1) {
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const h = PANEL.top - PANEL.bottom;
  box(layers.boards, len, h, 0.05, C.panel, cx, PANEL.bottom, z);
  box(layers.boards, len + 0.2, 0.1, 0.12, C.steel, cx, PANEL.top + 0.1, z);
  for (const x of [x0 + 0.3, x1 - 0.3]) bar(layers.boards, [x, PANEL.top, z], [x, 4.2, z], 0.03, C.steel);
  return { cx, len, h, face: z + side * 0.03 };
}

// big black pin-board on a rolling stand
function pinBoard(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  const w = 2.05;
  box(g, w, 1.15, 0.03, C.board, w / 2, 0.3, 0);
  for (const px of [0.12, 1.2]) {
    box(g, 0.05, 1.55, 0.05, C.frame, px, 0.06, -0.06);
    box(g, 0.06, 0.06, 0.62, C.frame, px, 0.06, -0.06);
    for (const pz of [-0.34, 0.22]) cyl(g, 0.035, 0.035, 0.06, 6, C.black, px, 0, pz);
  }
  box(g, 1.1, 0.02, 0.32, "#3b2f2a", 0.66, 0.24, -0.22);
  box(g, 0.13, 0.11, 0.004, "#d8f05a", w - 0.18, 1.24, 0.017);
  return g;
}

// the whiteboard in the new photos: a big hand-drawn ring of writing
function whiteboardTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 640;
  const g = cv.getContext("2d");
  g.fillStyle = "#fbfbf7";
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = "#27303b";
  for (let ring = 0; ring < 5; ring++) {
    g.lineWidth = 2 + (ring % 2) * 2;
    g.beginPath();
    g.ellipse(512, 330, 280 + ring * 18, 250 + ring * 14, -0.1, 0, Math.PI * 2);
    g.stroke();
  }
  // tiny "words" written around the ring
  g.fillStyle = "#27303b";
  for (let a = 0; a < Math.PI * 2; a += 0.045) {
    const r = 345 + Math.sin(a * 7) * 8;
    g.fillRect(512 + Math.cos(a) * r, 330 + Math.sin(a) * r * 0.85, 10, 3);
  }
  g.fillStyle = "#e5508a";
  g.beginPath();
  g.arc(960, 70, 14, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function whiteboard(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  const w = 1.7;
  const front = new THREE.MeshStandardMaterial({ map: whiteboardTexture(), roughness: 0.4 });
  materials.set("whiteboard", front);
  const side = mat(C.steel);
  const board = addMesh(g, new THREE.BoxGeometry(w, 1.15, 0.04), [side, side, side, side, front, side], w / 2, 1.25, 0);
  board.castShadow = true;
  for (const px of [0.05, w - 0.05]) {
    box(g, 0.05, 1.85, 0.05, C.steel, px, 0.05, -0.04);
    box(g, 0.06, 0.05, 0.6, C.frame, px, 0.05, -0.04);
  }
  box(g, w - 0.1, 0.04, 0.04, C.frame, w / 2, 0.45, -0.04);
  return g;
}

// yellow retractable cord reel hanging from the grid, cable dropping down
function cordReel(x, y, z, dropTo) {
  const g = place(layers.hanging, x, z, 90, y);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), mat(C.yellow));
  reel.rotation.z = Math.PI / 2;
  g.add(reel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), mat(C.black));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  bar(g, [0, 0.2, 0], [0, 4.2 - y, 0], 0.03, C.black);
  bar(g, [0, -0.2, 0.05], [0.15, dropTo - y, 0.3], 0.02, C.black);
}

// white ribbed pendant lamp
function pendantLamp(x, y, z) {
  const profile = [
    [0.0, 0.0], [0.08, 0.0], [0.13, 0.05], [0.12, 0.1], [0.15, 0.15],
    [0.14, 0.21], [0.16, 0.26], [0.14, 0.32], [0.1, 0.36], [0.07, 0.38],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const shade = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 10),
    mat(C.white, { emissive: "#fff3dc", emissiveIntensity: 0.35, side: THREE.DoubleSide }),
  );
  shade.position.set(x, y, z);
  layers.hanging.add(shade);
  cyl(layers.hanging, 0.09, 0.09, 0.08, 10, C.black, x, y + 0.37, z);
  bar(layers.hanging, [x, y + 0.45, z], [x, 4.2, z], 0.015, C.black);
}

function printer3d(parent, x, y, z) {
  const g = place(parent, x, z, 0, y);
  box(g, 0.42, 0.45, 0.42, C.black, 0, 0, 0);
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), mat(C.white));
  spool.rotation.x = Math.PI / 2;
  spool.position.set(-0.08, 0.28, 0.25);
  g.add(spool);
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.075, 10), mat(C.red));
  fil.rotation.x = Math.PI / 2;
  fil.position.copy(spool.position);
  g.add(fil);
}

function monitor(parent, x, y, z, turn, color = C.black) {
  const g = place(parent, x, z, turn, y);
  box(g, 0.2, 0.02, 0.16, color, 0, 0, 0);
  box(g, 0.04, 0.2, 0.03, color, 0, 0, -0.03);
  box(g, 0.62, 0.38, 0.04, color, 0, 0.16, 0);
  box(g, 0.58, 0.34, 0.005, "#1d2530", 0, 0.18, 0.022);
}

// someone at a desk, kept very simple
function sittingPerson(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  stool(g, 0, 0, 0.66);
  bar(g, [0, 0.76, 0.06], [0, 0.78, 0.42], 0.13, "#3b3f48");
  bar(g, [0, 0.76, 0.42], [0, 0.25, 0.45], 0.1, "#3b3f48");
  cyl(g, 0.17, 0.2, 0.55, 6, "#2f3440", 0, 0.74, 0);
  addMesh(g, new THREE.IcosahedronGeometry(0.11, 0), mat("#d9a383"), 0, 1.44, 0.03);
  addMesh(g, new THREE.IcosahedronGeometry(0.115, 0), mat("#3a2a22"), 0, 1.48, -0.01);
  bar(g, [0.18, 1.2, 0], [0.12, 1.0, 0.38], 0.07, "#2f3440");
  bar(g, [-0.18, 1.2, 0], [-0.12, 1.0, 0.38], 0.07, "#2f3440");
}

function robotArm(parent, x, y, z) {
  const g = place(parent, x, z, 30, y);
  cyl(g, 0.12, 0.14, 0.08, 8, C.white, 0, 0, 0);
  bar(g, [0, 0.08, 0], [0.05, 0.42, 0.05], 0.07, C.white);
  bar(g, [0.05, 0.42, 0.05], [0.3, 0.5, 0.15], 0.06, C.white);
  box(g, 0.08, 0.08, 0.08, C.grey, 0.3, 0.46, 0.15);
}

// open cardboard box with its flaps up
function bigBox(x, z, turn, w, h, d) {
  const g = place(layers.cardboard, x, z, turn);
  box(g, w, h, d, C.cardboard, 0, 0, 0);
  const flap = box(g, w - 0.1, 0.02, d * 0.6, "#b98f5c", 0, h, d * 0.1);
  flap.rotation.x = -0.35;
}

/* ==================================================================
   LAYOUT  (rough positions, read off the photos)
================================================================== */

function buildStudio() {
  const F = layers.furniture;
  const K = layers.cardboard;

  // --- hanging tack board right behind the pod, with the pin-up collage ---
  const back = hangingPanel(-3.2, 2.6, -8.6);
  posters(layers.boards, 2.6, 1.3, 0, PANEL.bottom + 0.1, back.face, 40, true);

  // --- more hanging boards along the aisle, covered in sheets and sticky notes ---
  for (const [x0, x1] of [[4.9, 7.6], [7.9, 10.6], [10.9, 13.6], [13.9, 16.6], [16.9, 19.6], [24, 27], [30, 33]]) {
    const p = hangingPanel(x0, x1, AISLE.near - 0.5, 1);
    posters(layers.boards, x1 - x0 - 0.4, 1.2, x0 + 0.2, PANEL.bottom + 0.15, p.face, 12, true);
  }
  whiteboard(layers.boards, 11.0, AISLE.near - 0.15, 0);

  // --- the ring whiteboard and the black pin-board, side by side at the aisle ---
  whiteboard(layers.boards, 1.55, -4.3, -56);
  pinBoard(layers.boards, 2.5, -2.9, 20);
  bigBox(2.0, -3.8, -56, 0.5, 0.4, 0.4);
  box(K, 0.32, 0.42, 0.18, "#c9b48a", 2.3, 0, -3.4); // the paper bag

  // --- front pod of benches with cardboard dividers ---
  const t1 = workbench(F, -0.42, -5.28, 0, 1.1, 0.76);
  box(t1, 0.42, 0.01, 0.3, C.white, 0.05, t1.userData.top, 0.05);
  box(t1, 0.3, 0.012, 0.22, "#eef0f6", 0.25, t1.userData.top, 0.1);
  box(t1, 0.28, 0.02, 0.04, C.lime, 0.0, t1.userData.top + 0.01, -0.05);
  box(t1, 0.24, 0.02, 0.04, C.lime, 0.3, t1.userData.top + 0.01, -0.12);
  box(t1, 0.14, 0.02, 0.05, "#3f6fd1", 0.08, t1.userData.top + 0.01, 0.18);
  cardboard(K, 0.85, 1.4, -0.99, -5.28, 90);

  const t2 = workbench(F, -1.55, -6.5, 0, 1.0, 0.76);
  box(t2, 0.34, 0.22, 0.22, C.black, -0.15, t2.userData.top, 0);
  box(t2, 0.34, 0.06, 0.22, C.yellow, -0.15, t2.userData.top + 0.16, 0);
  box(t2, 0.4, 0.26, 0.26, C.black, 0.25, t2.userData.top, -0.12);
  box(t2, 0.34, 0.26, 0.24, "#dfe8ec", 0.25, t2.userData.top, 0.18);
  cardboard(K, 0.85, 1.35, -2.07, -6.5, 90);
  cardboard(K, 0.36, 0.45, -1.5, -6.17, 0, t2.userData.top);

  const t3 = workbench(F, -0.3, -6.5, 0, 1.3, 0.76);
  box(t3, 0.85, 0.12, 0.28, C.black, 0.15, t3.userData.top, -0.05);
  box(t3, 0.45, 0.2, 0.3, "#a8a6a8", -0.35, t3.userData.top, 0.2);
  box(t3, 0.3, 0.36, 0.18, "#c9b48a", 0.45, t3.userData.top, 0.15);
  cardboard(K, 0.8, 0.9, 0.37, -6.5, 90, 0.2);

  stool(F, -0.15, -5.9);
  stool(F, -1.3, -5.95);

  // round fibre drum under the end of the hanging board
  cyl(F, 0.29, 0.29, 0.95, 10, "#cfa772", -2.6, 0, -8.15);
  cyl(F, 0.3, 0.3, 0.04, 10, C.steel, -2.6, 0.92, -8.15);

  // --- 3D printer table in front of the collage ---
  const t4 = workbench(F, 0.7, -7.75, 0, 1.8, 0.76);
  printer3d(t4, 0.4, t4.userData.top, -0.05);
  box(t4, 0.35, 0.16, 0.22, "#7f8487", -0.1, t4.userData.top, 0.05);
  box(t4, 0.2, 0.2, 0.2, C.red, -0.5, t4.userData.top, -0.1);
  box(t4, 0.3, 0.4, 0.02, C.white, -0.75, t4.userData.top, 0.1);

  // --- desks behind the hanging board, along the windows ---
  for (const x of [-1.6, 0.4]) {
    const d = workbench(F, x, -10.6, 0, 1.8, 0.8);
    stool(F, x + 0.3, -9.8);
    box(d, 0.5, 0.06, 0.35, C.white, 0, d.userData.top, 0);
  }
  cardboard(K, 2.4, 1.55, 2.6, -9.7, 0);
  const desk = workbench(F, 3.55, -10.4, 90, 1.8, 0.75);
  monitor(desk, 0.0, desk.userData.top, -0.05, 90, "#d9dadc");
  sittingPerson(layers.people, 4.25, -10.2, -90);

  // --- cardboard cubicles and big open boxes in the middle ---
  bigBox(2.9, -4.9, 0, 1.7, 1.3, 1.1);
  bigBox(5.0, -4.6, 8, 1.2, 1.2, 1.0);
  cardboard(K, 2.2, 1.3, 5.6, -5.9, 0);
  cardboard(K, 1.6, 1.3, 6.7, -6.7, 90);
  cardboard(K, 2.0, 1.3, 8.4, -7.6, 0);
  stool(F, 7.6, -6.5);

  const t6 = workbench(F, 4.3, -7.0, 0, 1.6, 0.8);
  robotArm(t6, -0.2, t6.userData.top, 0);
  box(t6, 0.6, 0.45, 0.4, C.cardboard, 0.45, t6.userData.top, 0);
  monitor(t6, 0.4, t6.userData.top, -0.35, 0);
  cyl(t6, 0.05, 0.05, 0.25, 6, C.yellow, -0.6, t6.userData.top, -0.2);
  addMesh(t6, new THREE.IcosahedronGeometry(0.12, 0), mat(C.yellow), -0.6, t6.userData.top + 0.3, -0.2);


  // benches toward the right-hand windows
  workbench(F, 6.6, -9.4, 0, 1.8, 0.8);
  monitor(F, 6.3, 0.92, -9.55, 0);
  workbench(F, 9.4, -9.4, 0, 1.8, 0.8);
  workbench(F, 9.4, -4.8, 0, 1.8, 0.8);
  stool(F, 9.0, -4.0);

  // --- display boards for the review, standing in a zigzag by the open floor ---
  const boards = [[-4.5, -8.6, 80, true], [-4.1, -7.2, 100, true], [-4.6, -5.8, 75, false], [-4.2, -4.4, 105, true], [-4.7, -3.0, 85, true]];
  for (const [x, z, turn, p] of boards) displayBoard(x, z, turn, p);

  // someone walking down the aisle
  standingPerson(layers.people, 22, -0.6, 80, "#3a3640", "#2c2f38");
}

function buildHangingStuff() {
  for (const [x, y, z, drop] of [[-1.4, 3.7, -9.5, 1.2], [-0.2, 3.45, -11.5, 1.5], [2.6, 3.55, -12, 1.6], [3.05, 3.55, -12, 1.6], [4.3, 3.7, -10.8, 1.3], [-3.2, 3.7, -4.8, 1.4], [0.9, 3.8, -4.6, 1.3], [6.5, 3.7, -3.5, 1.4]]) {
    cordReel(x, y, z, drop);
  }
  for (const [x, z, y] of [[1.25, -6.6, 1.0], [2.0, -5.6, 1.3], [-0.9, -4.6, 1.6], [3.5, -7.8, 1.1]]) {
    bar(layers.hanging, [x, 4.2, z], [x + 0.1, y, z + 0.1], 0.02, C.black);
  }
  pendantLamp(3.4, 2.35, -7.2);
  pendantLamp(4.3, 2.3, -3.4);
}

function buildLights() {
  scene.add(new THREE.HemisphereLight("#fff9ee", "#7d7465", 1.9));

  const sun = new THREE.DirectionalLight("#fff1d9", 2.4);
  sun.position.set(5, 16, -26);
  sun.target.position.set(2, 0, -3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight("#e4ecff", 0.8);
  fill.position.set(-8, 10, 12);
  scene.add(fill);
}

// where the phone pointed: yaw turns right, pitch tilts down (degrees)
function aim(pos, yaw, pitch) {
  const y = THREE.MathUtils.degToRad(yaw);
  const p = THREE.MathUtils.degToRad(pitch);
  return [
    pos[0] + Math.sin(y) * Math.cos(p) * 10,
    pos[1] - Math.sin(p) * 10,
    pos[2] - Math.cos(y) * Math.cos(p) * 10,
  ];
}

// iPhone 16 Pro main camera: 24 mm equiv., 4:3 photos
const IPHONE = { fov: 56.8, aspect: 4 / 3 };
const WINDOWS = [0.75, 1.5, -2.7];
const AISLE_CAM = [1.2, 1.5, -1.9];

export default {
  title: "ID Studio",
  intro: "windows",
  layers: [
    { key: "furniture", label: "Furniture" },
    { key: "cardboard", label: "Cardboard" },
    { key: "boards", label: "Boards" },
    { key: "hanging", label: "Cords & lamps" },
    { key: "ceiling", label: "Ceiling" },
    { key: "people", label: "People" },
  ],
  views: {
    windows: { label: "Windows", pos: WINDOWS, target: aim(WINDOWS, 0, 8), photo: { ...IPHONE, name: "IMG_4716", src: "photos/id_studio_windows.jpg" } },
    aisle: { label: "Aisle", pos: AISLE_CAM, target: aim(AISLE_CAM, 91.6, 7), photo: { ...IPHONE, name: "IMG_4722", src: "photos/id_studio_aisle.jpg" } },
    overview: { label: "Overview", pos: [-11, 11, 7], target: [1.5, 0.5, -5.5], fov: 45 },
    plan: { label: "Plan", pos: [1.5, 34, -7.49], target: [1.5, 0, -7.5], fov: 45 },
  },

  build() {
    reseed(11);
    scene = new THREE.Scene();
    layers = makeLayers(scene, this.layers);
    roof = new THREE.Group();
    grid = new THREE.Group();
    shell = new THREE.Group();
    layers.ceiling.add(roof, grid);
    scene.add(shell);

    buildLights();
    buildFloor();
    buildWalls();
    buildAisle();
    buildCeiling();
    buildStudio();
    buildHangingStuff();
    for (const part of [roof, grid, shell]) part.traverse((obj) => (obj.castShadow = false));
    return scene;
  },

  // called every frame with the camera
  update(camera) {
    roof.visible = camera.position.y < ROOM.height - 0.2;
  },
};
