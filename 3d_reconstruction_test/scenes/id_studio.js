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
   Rebuilt from measurements, not by eye. The 20 photos and 58 frames of
   the 360° video in Space Media/ID Studio were solved together with
   structure-from-motion (COLMAP, lens data from EXIF). The solve was
   levelled with the room's vertical lines, squared to its walls, and
   scaled with the EXIT sign (6 in letters), which also puts the tables
   at 0.91 m and the phone at eye height. Every position below comes from
   that solve: floor contacts, plane intersections and triangulated
   corners.

   Units are metres. x runs along the circulation spine (+x toward the
   white corridor), z crosses it (+z toward the windows), y is up. The
   origin is the floor under the spot where the 360° video was shot.
------------------------------------------------------------------- */

// ---------- colours picked from the photos ----------
const C = {
  floor: "#7d7568",
  base: "#4f483f",
  wall: "#ecebe4",
  board: "#cfc3a4",
  ceiling: "#e8dcc2",
  joist: "#d9c49c",
  steel: "#a9aeb1",
  glass: "#f4f6f2",
  roomGlass: "#b8c7c9",
  shade: "#3d4043",
  wood: "#d6a463",
  frame: "#efefea",
  cardboard: "#c49a66",
  cardboardDark: "#b38957",
  black: "#2a292c",
  yellow: "#f2c12e",
  white: "#f7f5f0",
  grey: "#9a9b9d",
  red: "#d1392f",
  teal: "#7fd3c4",
  lime: "#b9e05a",
  pink: "#e86a8a",
  concrete: "#d9d6cd",
};

// ---------- measured layout (m) ----------
// the studio bay sits between two lines of hanging tack boards and the window wall
const BAY = { x0: -4.12, x1: 4.12, z0: 0.75, z1: 7.12 };
// the circulation spine: EXIT aisle toward -x, white corridor toward +x
const SPINE = { z0: -1.35, z1: 0.75 };
const CEIL = 3.6;
// mullions on a 1.99 m grid; shade bottoms of the four bays in the studio, left to right
const WIN = { sill: 1.0, head: 3.3, bay: 1.9875, first: -3.85, shades: [1.45, 1.25, 1.3, 2.85] };
const BOARD = { bottom: 1.0, top: 2.05, rail: 2.1 };
const GRID = 2.5; // steel grid the cord reels hang from
const TOP = 0.91; // bench tops
// round concrete columns (r 0.17) with a squared white pier on their -z side
const COLUMNS = [
  { x: 4.2, z: -1.29, pier: [4.01, 4.41, -1.62, -1.42] },
  { x: -3.95, z: -1.36, pier: [-4.18, -3.78, -1.66, -1.48] },
];
// extent of the model
const MODEL = { x0: -10, x1: 10.5, z0: -6.8, z1: BAY.z1 };
const CORRIDOR = { x0: 4.45, x1: 22, open: 9.5, ceil: 3.2 };
const AISLE = { x1: -18, glassFrom: -5.6, glassZ: -1.05 };

// ceilings face down, away from the sky light: let them glow a little instead of going dark
const LIT = { emissive: "#bfb7a6", emissiveIntensity: 0.55 };

let scene;
let layers; // groups the panel can show or hide
// roof parts also hide when the camera flies above the room, like a dollhouse
let roof;
// window frames: thin stuff that shouldn't stripe the floor with shadows
let shell;

/* ==================================================================
   SMALL BUILDERS
================================================================== */

// one-sided wall plane facing +z before turning; y is its bottom
function wall(parent, w, h, color, x, y, z, turnDeg) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.y = THREE.MathUtils.degToRad(turnDeg);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// upright slab standing on the floor between two floor points (cardboard walls, boards)
function slab(parent, a, b, y0, y1, color, thick = 0.012) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const g = place(parent, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, -THREE.MathUtils.radToDeg(Math.atan2(dz, dx)));
  box(g, Math.hypot(dx, dz), y1 - y0, thick, color, 0, y0, 0);
  return g;
}

// sheets of paper pinned to a board; the board plane is given by its axis
// axis "x": sheets in the plane x = c facing +x (side +1) or -x (side -1)
function posters(parent, axis, c, side, a0, a1, y0, y1, count, palette, size = [0.2, 0.28]) {
  const sheets = batch();
  for (let i = 0; i < count; i++) {
    const w = size[0] * (0.8 + rand() * 0.7);
    const h = size[1] * (0.8 + rand() * 0.6);
    const a = a0 + w / 2 + rand() * Math.max(0, a1 - a0 - w);
    const y = y0 + rand() * Math.max(0, y1 - y0 - h);
    const color = palette[Math.floor(rand() * palette.length)];
    // just clear of a 30 mm board's face, later sheets a hair in front of earlier ones
    const off = c + side * (0.02 + i * 0.0004);
    if (axis === "x") sheets.box(0.004, h, w, color, off, y, a);
    else sheets.box(w, h, 0.004, color, a, y, off);
  }
  sheets.addTo(parent);
}

// white steel workbench with a butcher-block top, given by its footprint
function bench(parent, x0, x1, z0, z1, top = TOP) {
  const g = new THREE.Group();
  parent.add(g);
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  box(g, w, 0.045, d, C.wood, cx, top - 0.045, cz);
  const lx = w / 2 - 0.05;
  const lz = d / 2 - 0.05;
  const frame = batch();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    frame.box(0.04, top - 0.12, 0.04, C.frame, cx + sx * lx, 0.07, cz + sz * lz);
    frame.box(0.06, 0.07, 0.06, C.grey, cx + sx * lx, 0, cz + sz * lz);
  }
  for (const y of [top - 0.12, 0.2]) {
    frame.box(w - 0.1, 0.04, 0.04, C.frame, cx, y, cz - lz);
    frame.box(w - 0.1, 0.04, 0.04, C.frame, cx, y, cz + lz);
    frame.box(0.04, 0.04, d - 0.1, C.frame, cx - lx, y, cz);
    frame.box(0.04, 0.04, d - 0.1, C.frame, cx + lx, y, cz);
  }
  frame.addTo(g, true);
  bar(g, [cx - lx, 0.22, cz + lz], [cx + lx, top - 0.14, cz + lz], 0.035, C.frame);
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

// black school chair on four legs; faces +z before turning
function chair(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  box(g, 0.42, 0.04, 0.42, C.black, 0, 0.44, 0);
  box(g, 0.42, 0.32, 0.04, C.black, 0, 0.55, -0.2);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    bar(g, [sx * 0.18, 0, sz * 0.18], [sx * 0.16, 0.44, sz * 0.16], 0.025, C.grey);
  }
  return g;
}

// black office chair on a five-star base
function officeChair(parent, x, z) {
  const g = place(parent, x, z, rand() * 360);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    bar(g, [0, 0.08, 0], [Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3], 0.04, C.black);
  }
  cyl(g, 0.03, 0.03, 0.4, 6, C.black, 0, 0.06, 0);
  box(g, 0.48, 0.07, 0.46, C.black, 0, 0.46, 0);
  box(g, 0.44, 0.5, 0.06, C.black, 0, 0.6, -0.22);
  return g;
}

// yellow retractable cord reel hanging from the steel grid, cable dropping down
function cordReel(x, y, z, turn, dropTo) {
  const g = place(layers.hanging, x, z, turn, y);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 12), mat(C.yellow));
  reel.rotation.z = Math.PI / 2;
  g.add(reel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 8), mat(C.black));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  bar(g, [0, 0.1, 0], [0, GRID - y, 0], 0.02, C.black);
  bar(g, [0, -0.09, 0.03], [0.06, dropTo - y, 0.15], 0.014, C.black);
}

// white ribbed pendant lamp, about 15 cm across; y is the bottom of the shade
function pendantLamp(x, y, z) {
  const profile = [
    [0.0, 0.0], [0.04, 0.0], [0.062, 0.022], [0.056, 0.045], [0.073, 0.068],
    [0.067, 0.096], [0.076, 0.118], [0.067, 0.146], [0.048, 0.163], [0.034, 0.174],
  ].map(([r, h]) => new THREE.Vector2(r, h));
  const shade = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 10),
    mat(C.white, { emissive: "#fff3dc", emissiveIntensity: 0.35, side: THREE.DoubleSide }),
  );
  shade.position.set(x, y, z);
  layers.hanging.add(shade);
  bar(layers.hanging, [x, y + 0.174, z], [x, GRID, z], 0.012, C.black);
}

// the hanging red EXIT sign, readable from both ends of the aisle
function exitSign(x, y, z) {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 112;
  const g = cv.getContext("2d");
  g.fillStyle = "#b52f2a";
  g.fillRect(0, 0, 256, 112);
  g.strokeStyle = g.fillStyle = "#fbe9e4";
  g.lineWidth = 4;
  g.strokeRect(8, 8, 240, 96);
  g.font = "bold 62px Arial, Helvetica, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("EXIT", 128, 58);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshBasicMaterial({ map: tex });
  const edge = mat("#b52f2a");
  // 6 in letters on a sign about 0.42 x 0.23 m, faces along x
  addMesh(layers.hanging, new THREE.BoxGeometry(0.06, 0.23, 0.42), [face, face, edge, edge, edge, edge], x, y, z);
  bar(layers.hanging, [x, y + 0.115, z - 0.15], [x, CEIL, z - 0.15], 0.02, C.black);
  bar(layers.hanging, [x, y + 0.115, z + 0.15], [x, CEIL, z + 0.15], 0.02, C.black);
}

// white shelving unit with models on it; its open side faces +z before turning
function shelves(parent, x, z, turn, w = 1.2, h = 2.0, d = 0.4) {
  const g = place(parent, x, z, turn);
  const parts = batch();
  parts.box(w, h, 0.02, C.white, 0, 0, -d / 2);
  parts.box(0.03, h, d, C.white, -w / 2, 0, 0);
  parts.box(0.03, h, d, C.white, w / 2, 0, 0);
  const levels = [0.08, 0.5, 0.92, 1.34, 1.76];
  for (const y of levels) parts.box(w, 0.025, d, C.white, 0, y, 0);
  const colors = [C.cardboard, C.white, C.red, "#d8c7a8", C.grey, C.wood];
  for (const y of levels.slice(0, -1)) {
    for (let a = -w / 2 + 0.12; a < w / 2 - 0.1; a += 0.22 + rand() * 0.2) {
      const mh = 0.1 + rand() * 0.25;
      parts.box(0.12 + rand() * 0.1, mh, 0.15 + rand() * 0.1, colors[Math.floor(rand() * colors.length)], a, y + 0.025, 0);
    }
  }
  parts.addTo(g, true);
  return g;
}

function monitor(parent, x, y, z, turn, color = C.black) {
  const g = place(parent, x, z, turn, y);
  box(g, 0.2, 0.02, 0.16, color, 0, 0, 0);
  box(g, 0.04, 0.22, 0.03, color, 0, 0, -0.03);
  box(g, 0.6, 0.36, 0.035, color, 0, 0.17, 0);
  box(g, 0.56, 0.32, 0.005, "#1d2530", 0, 0.19, 0.02);
}

function printer3d(parent, x, y, z) {
  const g = place(parent, x, z, 0, y);
  box(g, 0.42, 0.42, 0.42, C.black, 0, 0, 0);
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), mat(C.white));
  spool.rotation.x = Math.PI / 2;
  spool.position.set(0, 0.24, -0.25);
  g.add(spool);
}

/* ==================================================================
   ROOM SHELL
================================================================== */

function buildFloor() {
  const w = MODEL.x1 - MODEL.x0;
  const d = MODEL.z1 - MODEL.z0;
  const x = MODEL.x0 + w / 2;
  const z = MODEL.z0 + d / 2;
  facetedGround(scene, w, d, C.floor, x, z, 0.68);
  box(scene, w, 0.4, d, C.base, x, -0.41, z);

  // the spine carries on as the white corridor (+x) and the EXIT aisle (-x)
  const sd = SPINE.z1 - SPINE.z0;
  const sz = (SPINE.z0 + SPINE.z1) / 2;
  for (const [a, b] of [[MODEL.x1, CORRIDOR.x1], [AISLE.x1, MODEL.x0]]) {
    facetedGround(scene, b - a, sd, C.floor, (a + b) / 2, sz, 0.68);
    box(scene, b - a, 0.4, sd, C.base, (a + b) / 2, -0.41, sz);
  }

  // yellow tape on the floor in the aisle, by the display boards
  const tape = batch();
  tape.box(0.92, 0.004, 0.06, C.yellow, -3.05, 0.002, -1.2);
  tape.box(0.06, 0.004, 0.46, C.yellow, -2.6, 0.002, -1.4);
  tape.addTo(scene);
}

function buildWindowWall() {
  const z = BAY.z1;
  const w = MODEL.x1 - MODEL.x0;
  const mid = (MODEL.x0 + MODEL.x1) / 2;
  wall(scene, w, WIN.sill, C.wall, mid, 0, z, 180);
  wall(scene, w, CEIL - WIN.head, C.wall, mid, WIN.head, z, 180);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, WIN.head - WIN.sill), new THREE.MeshBasicMaterial({ color: C.glass }));
  glass.position.set(mid, (WIN.sill + WIN.head) / 2, z + 0.01);
  glass.rotation.y = Math.PI;
  scene.add(glass);

  // mullions every 2 m, lined up with the bay; transoms; mesh shades pulled to different heights
  const frames = batch();
  const first = Math.ceil((MODEL.x0 - WIN.first) / WIN.bay);
  const last = Math.floor((MODEL.x1 - WIN.first) / WIN.bay);
  for (let k = first; k <= last; k++) {
    frames.box(0.09, WIN.head - WIN.sill, 0.08, C.steel, WIN.first + k * WIN.bay, WIN.sill, z - 0.04);
  }
  for (const y of [WIN.sill - 0.03, 1.75, 2.5, WIN.head - 0.04]) frames.box(w, 0.06, 0.07, C.steel, mid, y, z - 0.04);
  for (let k = first; k < last; k++) {
    const x0 = WIN.first + k * WIN.bay;
    // measured in the studio's four bays, a guess elsewhere
    const bottom = k >= 0 && k < WIN.shades.length ? WIN.shades[k] : 1.25 + rand() * 0.4;
    frames.box(WIN.bay - 0.1, WIN.head - bottom, 0.02, C.shade, x0 + WIN.bay / 2, bottom, z - 0.1);
  }
  frames.addTo(shell);
  // white piers where the column lines meet the window wall
  for (const x of [-4.1, 4.2]) box(scene, 0.45, CEIL, 0.3, C.wall, x, 0, z - 0.15);
}

// round concrete columns on the spine, one at each end of the bay
function buildColumns() {
  for (const { x, z, pier } of COLUMNS) {
    cyl(scene, 0.17, 0.17, CEIL, 12, C.concrete, x, 0, z);
    const [x0, x1, z0, z1] = pier;
    box(scene, x1 - x0, CEIL, z1 - z0, C.wall, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  }
}

// the white corridor that leaves the spine toward +x
function buildCorridor() {
  const { x0, x1, open, ceil } = CORRIDOR;
  const len = x1 - x0;
  wall(scene, len, CEIL, C.wall, (x0 + x1) / 2, 0, SPINE.z0, 0);
  wall(scene, x1 - open, CEIL, C.wall, (open + x1) / 2, 0, SPINE.z1, 180);
  wall(scene, SPINE.z1 - SPINE.z0, ceil, C.wall, x1, 0, (SPINE.z0 + SPINE.z1) / 2, -90);
  // a room window in the left wall, a door and exit light at the far end
  box(scene, 2.4, 1.0, 0.03, C.roomGlass, 6.4, 1.0, SPINE.z0 + 0.02);
  box(scene, 0.05, 2.2, 0.95, "#3c6a62", x1 - 0.03, 0, -0.55);
  box(scene, 0.05, 0.14, 0.38, "#55c27a", x1 - 0.03, 2.45, -0.55);
  cyl(scene, 0.07, 0.07, 0.5, 8, C.red, 4.95, 0.75, SPINE.z0 + 0.1);
  // lower white ceiling over the corridor
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(len, SPINE.z1 - SPINE.z0), mat(C.wall, LIT));
  lid.rotation.x = Math.PI / 2;
  lid.position.set((x0 + x1) / 2, ceil, (SPINE.z0 + SPINE.z1) / 2);
  roof.add(lid);
  wall(roof, len, CEIL - ceil, C.wall, (x0 + x1) / 2, ceil, SPINE.z1, 180);

  // past the east boards: the next studio, closed off at x = 9.5
  wall(scene, MODEL.z1 - SPINE.z1, CEIL, C.wall, open, 0, (SPINE.z1 + MODEL.z1) / 2, -90);
  // the opposite studio's end wall, with the model shelves against it
  wall(scene, SPINE.z0 - MODEL.z0, CEIL, C.wall, 4.5, 0, (MODEL.z0 + SPINE.z0) / 2, -90);
}

// the opposite studio, seen past the display boards: its far board line, a bench, a chair
function buildOppositeStudio() {
  const z = MODEL.z0 + 0.3;
  box(layers.boards, 6.4, BOARD.top - 0.9, 0.03, C.board, 1.2, 0.9, z);
  posters(layers.boards, "z", z + 0.015, 1, -1.9, 4.3, 1.0, 2.0, 30, [C.white, C.white, "#f1ead9", C.teal, C.pink], [0.2, 0.28]);
  bench(layers.furniture, -0.6, 0.6, -4.6, -3.85);
  officeChair(layers.furniture, 2.1, -4.7);
}

// the EXIT aisle toward -x: bins by the column, glass-walled rooms along one side
function buildAisle() {
  const F = layers.furniture;
  for (const [x, color] of [[-4.35, "#2f63b8"], [-4.85, "#3e8a4f"], [-5.3, "#2f63b8"]]) {
    box(F, 0.44, 0.92, 0.3, color, x, 0, -1.15);
  }
  const roomGlass = new THREE.MeshStandardMaterial({
    color: C.roomGlass,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    depthWrite: false,
  });
  materials.set("room glass", roomGlass);
  const len = AISLE.glassFrom - AISLE.x1;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.0), roomGlass);
  pane.position.set((AISLE.glassFrom + AISLE.x1) / 2, 1.5, AISLE.glassZ);
  scene.add(pane);
  const frames = batch();
  for (let x = AISLE.glassFrom; x >= AISLE.x1 - 0.01; x -= 1.5) frames.box(0.06, 3.0, 0.08, "#3a3d40", x, 0, AISLE.glassZ);
  for (const y of [0, 1.0, 2.95]) frames.box(len, 0.06, 0.08, "#3a3d40", (AISLE.glassFrom + AISLE.x1) / 2, y, AISLE.glassZ);
  frames.box(len, CEIL - 3.0, 0.15, C.wall, (AISLE.glassFrom + AISLE.x1) / 2, 3.0, AISLE.glassZ - 0.05);
  frames.addTo(shell);
  for (const x of [-7.2, -10.4, -13.6, -16.6]) shelves(F, x, AISLE.glassZ - 0.5, 0, 1.4, 1.9, 0.4);

  // the next studio bay across the aisle: its hanging boards and a couple of benches
  box(layers.boards, 0.05, BOARD.top - BOARD.bottom, BAY.z1 - 0.5 - SPINE.z1, C.board, -12.25, BOARD.bottom, (SPINE.z1 + 0.25 + BAY.z1) / 2);
  bench(F, -7.4, -6.2, 1.3, 2.05);
  bench(F, -9.4, -8.2, 3.4, 4.15);
  // cardboard standing under the end of the west boards, seen down the aisle
  slab(layers.cardboard, [-4.15, 0.35], [-4.15, 1.0], 0.0, 0.95, C.cardboard);
  // shelf by the aisle column, and the rolling whiteboard with the class list beside it
  shelves(F, -3.91, -1.94, 90, 0.64, 1.65, 0.45);
  const names = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.05, 1.2), mat(C.white));
  names.position.set(-3.42, 1.32, -2.7);
  layers.boards.add(names);
  posters(layers.boards, "x", -3.42, 1, -3.25, -2.15, 1.0, 1.75, 12, ["#3a4150"], [0.12, 0.02]);
  for (const zz of [-2.15, -3.25]) box(layers.boards, 0.55, 0.04, 0.04, C.frame, -3.42, 0.02, zz);
  standingPerson(layers.people, -15.3, -0.25, 90, "#3a3640", "#2c2f38");
}

// ceiling: timber deck and joists, a beam, the steel grid, a skylight over the spine
function buildCeiling() {
  const w = MODEL.x1 - MODEL.x0;
  const mid = (MODEL.x0 + MODEL.x1) / 2;
  for (const [z0, z1] of [[SPINE.z1, MODEL.z1], [MODEL.z0, SPINE.z0]]) {
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), mat(C.ceiling, LIT));
    deck.rotation.x = Math.PI / 2;
    deck.position.set(mid, CEIL, (z0 + z1) / 2);
    roof.add(deck);
  }
  // skylight ridge over the spine, out to the end of the aisle
  const sky = new THREE.MeshBasicMaterial({ color: "#fbfaf4", side: THREE.DoubleSide });
  const sx0 = AISLE.x1;
  const sx1 = CORRIDOR.x0;
  const half = (SPINE.z1 - SPINE.z0) / 2;
  for (const s of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(sx1 - sx0, Math.hypot(half, 0.7)), sky);
    pane.position.set((sx0 + sx1) / 2, CEIL + 0.35, (SPINE.z0 + SPINE.z1) / 2 + (s * half) / 2);
    pane.rotation.x = Math.PI / 2 - s * Math.atan2(0.7, half);
    roof.add(pane);
  }

  const timber = batch();
  timber.box(w, 0.55, 0.2, C.joist, mid, CEIL - 0.55, 2.55);
  for (let x = MODEL.x0 + 0.6; x < MODEL.x1; x += 1.2) {
    timber.box(0.07, 0.25, BAY.z1 - SPINE.z1, C.joist, x, CEIL - 0.25, (SPINE.z1 + BAY.z1) / 2);
  }
  timber.addTo(roof);

  // steel grid at 2.5 m; rails at 2.1 m along the board lines
  const steel = batch();
  for (const z of [0.85, 2.55, 4.7, 6.85]) steel.box(BAY.x1 - BAY.x0, 0.05, 0.05, C.steel, 0, GRID, z);
  for (const x of [-2.7, 0, 2.7]) steel.box(0.05, 0.05, 6.0, C.steel, x, GRID, 3.85);
  for (const x of [BAY.x0 + 0.04, BAY.x1 - 0.12]) steel.box(0.06, 0.06, BAY.z1 - 0.4, C.steel, x, BOARD.rail, (0.4 + BAY.z1) / 2);
  steel.box(3.25, 0.06, 0.06, C.steel, 0.8, BOARD.rail, -1.17);
  for (const [x, z] of [[2.15, -1.15], [3.92, 0.6], [-4.1, 0.4], [-0.8, -1.17]]) steel.box(0.05, GRID, 0.05, C.steel, x, 0, z);
  // LED light bars
  for (const z of [1.7, 3.6, 5.6]) steel.box(7.0, 0.04, 0.06, "#fffdf4", 0, GRID - 0.06, z);
  steel.addTo(layers.ceiling);
}

/* ==================================================================
   BOARDS: hanging tack boards, display boards, whiteboard, black board
================================================================== */

// the whiteboard in the photos: a big hand-drawn ring of writing
function whiteboardTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 680;
  const g = cv.getContext("2d");
  g.fillStyle = "#fbfbf7";
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = "#27303b";
  for (let ring = 0; ring < 5; ring++) {
    g.lineWidth = 2 + (ring % 2) * 2;
    g.beginPath();
    g.ellipse(470, 350, 250 + ring * 16, 270 + ring * 14, -0.15, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = "#27303b";
  for (let a = 0; a < Math.PI * 2; a += 0.045) {
    const r = 310 + Math.sin(a * 7) * 8;
    g.fillRect(470 + Math.cos(a) * r * 0.9, 350 + Math.sin(a) * r, 10, 3);
  }
  g.fillStyle = "#e5508a";
  g.beginPath();
  g.arc(960, 80, 16, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildBoards() {
  const B = layers.boards;
  const paper = [C.white, C.white, C.white, "#f1ead9", "#e5dccb", C.teal, "#f3d36b", C.pink, "#9bc3f0", "#2d2d2f"];
  const notes = [C.teal, "#f3d36b", "#d8f05a", C.pink];

  // the two lines of hanging tack boards along the bay, 1.0 to 2.05 m up
  const h = BOARD.top - BOARD.bottom;
  const eastX = BAY.x1 - 0.15;
  const westX = BAY.x0;
  box(B, 0.03, h, BAY.z1 - 0.12 - 0.6, C.board, eastX, BOARD.bottom, (0.6 + BAY.z1 - 0.12) / 2);
  box(B, 0.03, h, BAY.z1 - 0.12 - 0.4, C.board, westX, BOARD.bottom, (0.4 + BAY.z1 - 0.12) / 2);
  // east: the pin-up collage in the middle, a few sheets elsewhere
  posters(B, "x", eastX, -1, 3.4, 5.6, 1.1, 2.0, 46, paper, [0.18, 0.24]);
  posters(B, "x", eastX, -1, 0.8, 3.3, 1.2, 1.9, 5, [C.white], [0.22, 0.3]);
  posters(B, "x", eastX, -1, 5.8, 6.9, 1.1, 1.9, 8, paper, [0.2, 0.28]);
  // west: project sheets, sticky notes and name tags
  posters(B, "x", westX, 1, 0.6, 6.8, 1.15, 1.95, 30, paper, [0.21, 0.29]);
  posters(B, "x", westX, 1, 1.0, 4.0, 1.5, 1.9, 24, notes, [0.07, 0.07]);

  // display boards on the far side of the spine
  // a plain sheet, then the "How do people sense time?" board, both facing the bay
  slab(B, [-0.8, -1.21], [0.47, -1.21], 0.05, 2.05, C.cardboard, 0.02);
  slab(B, [0.7, -1.21], [1.95, -1.21], 0.05, 2.05, C.cardboard, 0.02);
  posters(B, "z", -1.21, 1, 0.75, 1.9, 0.85, 2.0, 6, [C.white], [0.4, 0.56]);
  for (const x of [-0.6, 0.85, 1.75]) box(B, 0.06, 0.05, 0.5, C.black, x, 0, -1.21);
  // "Farming in Cities": tall board facing +x, posters up top, a photo collage with
  // URBAN / SMALL / LARGE / RURAL below, on two black feet
  slab(B, [-1.63, -1.25], [-1.63, -2.47], 0.6, 2.48, C.cardboard, 0.02);
  posters(B, "x", -1.63, 1, -2.42, -1.3, 1.5, 2.25, 4, [C.white], [0.4, 0.55]);
  posters(B, "x", -1.63, 1, -2.35, -1.35, 0.75, 1.4, 16, ["#6f8f6a", "#8aa0b8", "#a58d6c", C.white], [0.12, 0.1]);
  for (const z of [-1.3, -2.4]) {
    box(B, 0.5, 0.05, 0.06, C.black, -1.63, 0, z);
    box(B, 0.05, 0.6, 0.06, C.black, -1.63, 0, z);
  }

  // the ring whiteboard on its rolling stand: board in the plane x = -1.5
  const wb = { x: -1.5, z0: 0.79, z1: 1.92, y0: 0.72, y1: 1.47 };
  const front = new THREE.MeshStandardMaterial({ map: whiteboardTexture(), roughness: 0.4 });
  materials.set("whiteboard", front);
  const side = mat(C.steel);
  const board = addMesh(
    B,
    new THREE.BoxGeometry(0.03, wb.y1 - wb.y0, wb.z1 - wb.z0),
    [front, side, side, side, side, side],
    wb.x,
    (wb.y0 + wb.y1) / 2,
    (wb.z0 + wb.z1) / 2,
  );
  board.castShadow = true;
  const stand = batch();
  for (const z of [wb.z0 + 0.05, wb.z1 - 0.05]) {
    stand.box(0.04, wb.y1 + 0.1, 0.04, C.frame, wb.x - 0.04, 0.06, z);
    stand.box(0.62, 0.05, 0.06, C.frame, wb.x - 0.04, 0.03, z);
  }
  stand.box(0.04, 0.04, wb.z1 - wb.z0, C.frame, wb.x - 0.04, 0.35, (wb.z0 + wb.z1) / 2);
  stand.addTo(B, true);

  // the black foam pin-board (4 x 8 ft) on its stand, in the plane z = 0.95
  const bb = { z: 0.95, x0: -3.9, x1: -1.72, y0: 0.05, y1: 1.35 };
  box(B, bb.x1 - bb.x0, bb.y1 - bb.y0, 0.025, C.black, (bb.x0 + bb.x1) / 2, bb.y0, bb.z);
  box(B, 0.12, 0.1, 0.004, "#d8f05a", bb.x1 - 0.2, 1.15, bb.z - 0.015);
  for (const x of [bb.x0 + 0.15, bb.x1 - 0.15]) {
    box(B, 0.04, 1.2, 0.04, C.frame, x, 0.05, bb.z + 0.05);
    box(B, 0.06, 0.05, 0.6, C.frame, x, 0.02, bb.z + 0.05);
  }
}

/* ==================================================================
   CARDBOARD: dividers, cubicle walls, boxes
================================================================== */

function buildCardboard() {
  const K = layers.cardboard;
  // dividers on the front edge of the first bench row
  slab(K, [0.78, 0.8], [1.45, 0.8], 0.0, 1.3, C.cardboard);
  slab(K, [2.2, 0.88], [3.35, 0.88], 0.0, 1.2, C.cardboard);
  // the rocket print and the purple clamps on the first one
  const rocket = batch();
  rocket.box(0.42, 0.3, 0.004, "#7fa4cf", 1.1, 0.93, 0.79);
  rocket.box(0.38, 0.12, 0.003, "#e4e0dc", 1.1, 1.0, 0.786);
  for (const x of [0.88, 1.38]) rocket.box(0.09, 0.07, 0.05, "#a678d8", x, TOP - 0.06, 0.8);
  rocket.addTo(K);

  // the sheet standing behind the first row
  slab(K, [0.08, 2.47], [1.78, 2.72], 0.0, 1.14, C.cardboard);
  // the cubicle wall across the middle of the bay, folded at -1.24, and its L toward the windows
  slab(K, [1.11, 4.24], [-0.41, 4.22], 0.0, 1.15, C.cardboard);
  slab(K, [-0.41, 4.22], [-1.24, 4.16], 0.0, 1.15, C.cardboardDark);
  slab(K, [-1.24, 4.16], [-1.72, 4.07], 0.0, 1.12, C.cardboard);
  slab(K, [0.29, 4.32], [1.04, 4.32], 0.0, 1.29, C.cardboardDark);
  slab(K, [-0.4, 4.22], [-0.4, 5.45], 0.0, 1.15, C.cardboard);

  // the big open box behind the whiteboard, flaps up, a robot rig inside
  const bx = { x1: -1.58, x0: -2.5, z0: 2.5, z1: 3.74, h: 0.98 };
  const g = new THREE.Group();
  K.add(g);
  box(g, bx.x1 - bx.x0, bx.h, bx.z1 - bx.z0, C.cardboard, (bx.x0 + bx.x1) / 2, 0, (bx.z0 + bx.z1) / 2);
  for (const [axis, at] of [["x", bx.x1], ["x", bx.x0], ["z", bx.z0], ["z", bx.z1]]) {
    const flap = axis === "x"
      ? box(g, 0.012, 0.36, bx.z1 - bx.z0 - 0.04, C.cardboardDark, at, bx.h, (bx.z0 + bx.z1) / 2)
      : box(g, bx.x1 - bx.x0 - 0.04, 0.36, 0.012, C.cardboardDark, (bx.x0 + bx.x1) / 2, bx.h, at);
    if (axis === "x") flap.rotation.z = (at === bx.x1 ? -1 : 1) * 0.35;
    else flap.rotation.x = (at === bx.z1 ? -1 : 1) * 0.35;
  }
  const rig = batch();
  for (const z of [2.85, 3.4]) rig.box(0.04, 0.6, 0.04, "#d6dadd", -2.0, bx.h - 0.3, z);
  rig.box(0.04, 0.04, 0.6, "#d6dadd", -2.0, bx.h + 0.28, 3.12);
  rig.box(0.12, 0.1, 0.12, C.white, -2.0, bx.h + 0.2, 3.12);
  rig.addTo(g);
}

/* ==================================================================
   FURNITURE
================================================================== */

function buildFurniture() {
  const F = layers.furniture;

  // first bench row along the spine
  bench(F, 0.22, 1.0, 0.85, 1.6);
  bench(F, 1.0, 2.2, 0.85, 1.6);
  bench(F, 2.2, 3.4, 0.85, 1.6);
  const items = batch();
  // drawings with green, blue and purple panels; keyboard
  items.box(0.48, 0.01, 0.52, C.white, 0.5, TOP, 1.17);
  items.box(0.14, 0.012, 0.09, C.lime, 0.36, TOP + 0.01, 1.05);
  items.box(0.14, 0.012, 0.09, C.lime, 0.58, TOP + 0.01, 1.05);
  items.box(0.16, 0.012, 0.12, "#7fa8e0", 0.42, TOP + 0.01, 1.3);
  items.box(0.05, 0.014, 0.12, "#b07fe0", 0.5, TOP + 0.012, 1.3);
  items.box(0.14, 0.03, 0.4, C.black, 0.88, TOP, 1.12);
  // paper bag, clear bin with a grey bag on top, toolbox, power strip
  items.box(0.3, 0.38, 0.17, "#c9b48a", 0.72, TOP, 1.38);
  items.box(0.58, 0.3, 0.42, "#e1e8ec", 1.2, TOP, 1.22);
  items.box(0.48, 0.12, 0.3, "#8f8f94", 1.15, TOP + 0.3, 1.22);
  items.box(0.38, 0.2, 0.24, C.black, 2.7, TOP, 1.15);
  items.box(0.38, 0.06, 0.24, C.yellow, 2.7, TOP + 0.14, 1.15);
  items.box(0.28, 0.04, 0.06, C.white, 1.9, TOP, 1.05);
  items.addTo(F, true);
  stool(F, 0.75, 1.85);
  stool(F, 1.95, 1.95);
  chair(F, 1.45, 2.1, 160);

  // benches behind the sheet: the 3D-printer bench and its neighbours
  bench(F, 1.2, 2.6, 2.78, 3.53);
  bench(F, 1.2, 2.6, 3.53, 4.18);
  bench(F, 2.6, 3.85, 2.78, 3.53);
  printer3d(F, 2.15, TOP, 2.98);
  const more = batch();
  more.box(0.22, 0.22, 0.22, C.red, 3.3, TOP, 3.0);
  more.box(0.35, 0.18, 0.25, "#7f8487", 1.6, TOP, 3.15);
  more.box(0.3, 0.42, 0.02, C.white, 1.45, TOP, 3.75);
  more.box(0.2, 0.5, 0.2, "#d8c7a8", 2.4, TOP, 3.55);
  more.box(0.4, 0.06, 0.3, "#c79b6e", 2.0, TOP, 3.9);
  more.addTo(F, true);
  stool(F, 3.0, 2.45);

  // white counter under the windows, with screens and odds and ends
  const counter = { z0: BAY.z1 - 0.66, x0: BAY.x0 + 0.17, x1: BAY.x1 - 0.17, top: 0.93 };
  box(F, counter.x1 - counter.x0, counter.top, BAY.z1 - 0.02 - counter.z0, C.white, (counter.x0 + counter.x1) / 2, 0, (counter.z0 + BAY.z1 - 0.02) / 2);
  monitor(F, -3.2, counter.top, 6.8, 180, "#d9dadc");
  monitor(F, 2.3, counter.top, 6.8, 180, "#d9dadc");
  monitor(F, 3.3, counter.top, 6.8, 180);
  printer3d(F, -1.1, counter.top, 6.8);
  const odds = batch();
  const colors = [C.red, C.yellow, C.white, C.grey, "#f08a3c", C.lime, C.teal];
  for (let x = counter.x0 + 0.3; x < counter.x1 - 0.3; x += 0.35 + rand() * 0.5) {
    const hh = 0.08 + rand() * 0.3;
    odds.box(0.1 + rand() * 0.15, hh, 0.12 + rand() * 0.15, colors[Math.floor(rand() * colors.length)], x, counter.top, 6.6 + rand() * 0.35);
  }
  odds.addTo(F, true);
  stool(F, 0.05, 6.1);
  stool(F, -2.1, 6.05);
  chair(F, 1.1, 6.05, 180);
  chair(F, -3.3, 6.0, 190);

  // the bike parked by the cubicle wall
  const bike = place(F, -0.47, 6.05, 90);
  for (const x of [-0.5, 0.5]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 4, 14), mat(C.black));
    wheel.position.set(x, 0.35, 0);
    bike.add(wheel);
  }
  bar(bike, [-0.5, 0.35, 0], [0.1, 0.8, 0], 0.03, "#3b4a5a");
  bar(bike, [0.5, 0.35, 0], [0.1, 0.8, 0], 0.03, "#3b4a5a");
  bar(bike, [0.1, 0.8, 0], [0.45, 0.85, 0], 0.03, "#3b4a5a");

  // fibre drum under the end of the east boards
  cyl(F, 0.27, 0.27, 0.95, 12, "#cfa772", 4.32, 0, 0.86);
  cyl(F, 0.28, 0.28, 0.03, 12, C.steel, 4.32, 0.93, 0.86);

  // model shelves behind the corridor-side column
  shelves(F, 4.3, -2.18, -90, 1.07, 2.0, 0.36);
  // the next studio past the east boards: a white table with two chairs
  const t = new THREE.Group();
  F.add(t);
  box(t, 1.6, 0.04, 0.8, C.white, 7.9, 0.72, 1.35);
  for (const [x, z] of [[7.15, 1.0], [8.65, 1.0], [7.15, 1.7], [8.65, 1.7]]) box(t, 0.04, 0.72, 0.04, C.grey, x, 0, z);
  chair(F, 7.4, 1.95, 180);
  chair(F, 8.4, 1.95, 180);
}

function buildHanging() {
  // yellow cord reels on the 2.5 m grid, measured centres
  for (const [x, y, z, drop] of [[0.17, 2.3, 1.4, 1.3], [2.7, 2.3, 2.8, 1.2], [2.6, 2.3, 4.47, 1.25], [2.75, 2.3, 4.45, 1.3], [-2.35, 2.29, 4.29, 1.3], [-0.2, 2.3, 3.6, 1.25]]) {
    cordReel(x, y, z, 90, drop);
  }
  // triangulated centre of the shade: (-2.38, 1.79, 1.23)
  pendantLamp(-2.38, 1.7, 1.23);
  exitSign(-4.19, 2.25, -0.18);
}

function buildLights() {
  scene.add(new THREE.HemisphereLight("#fff9ee", "#7d7465", 1.9));
  // daylight through the windows, low from beyond the window wall
  const sun = new THREE.DirectionalLight("#fff1d9", 2.2);
  sun.position.set(6, 14, 26);
  sun.target.position.set(0, 0, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#e4ecff", 0.8);
  fill.position.set(-8, 10, -12);
  scene.add(fill);
}

/* ==================================================================
   VIEWS
================================================================== */

// iPhone 16 Pro main camera as solved: 24 mm equiv., 4:3, vertical fov 55.9°
const IPHONE = { fov: 55.87, aspect: 4 / 3 };

export default {
  title: "ID Studio",
  // title card shown before the scene opens
  card: { number: "Scene Two", title: "ID Studio", line: "Through the old gate, into the studio." },
  intro: "windows",
  layers: [
    { key: "furniture", label: "Furniture" },
    { key: "cardboard", label: "Cardboard" },
    { key: "boards", label: "Boards" },
    { key: "hanging", label: "Cords & lamps" },
    { key: "ceiling", label: "Ceiling" },
    { key: "people", label: "People" },
  ],
  // photo views use the camera poses solved for those photos
  views: {
    windows: {
      label: "Windows",
      pos: [0.076, 1.563, -0.619],
      target: [-0.8, 0.314, 9.264],
      photo: { ...IPHONE, name: "IMG_4716", src: "photos/id_studio_windows.jpg" },
    },
    corridor: {
      label: "Corridor",
      pos: [0.075, 1.564, -0.03],
      target: [9.996, 0.334, 0.191],
      photo: { ...IPHONE, name: "IMG_4718", src: "photos/id_studio_corridor.jpg" },
    },
    aisle: {
      label: "Aisle",
      pos: [-0.225, 1.544, -0.054],
      target: [-10.097, 0.008, -0.482],
      photo: { ...IPHONE, name: "IMG_4722", src: "photos/id_studio_aisle.jpg" },
    },
    overview: { label: "Overview", pos: [9.5, 11.5, -9.5], target: [-0.2, 0.4, 2.8], fov: 45 },
    plan: { label: "Plan", pos: [0.4, 30, 0.81], target: [0.4, 0, 0.8], fov: 45 },
  },

  build() {
    reseed(11);
    scene = new THREE.Scene();
    layers = makeLayers(scene, this.layers);
    roof = new THREE.Group();
    shell = new THREE.Group();
    layers.ceiling.add(roof);
    scene.add(shell);

    buildLights();
    buildFloor();
    buildWindowWall();
    buildColumns();
    buildCorridor();
    buildOppositeStudio();
    buildAisle();
    buildCeiling();
    buildBoards();
    buildCardboard();
    buildFurniture();
    buildHanging();
    for (const part of [roof, shell]) part.traverse((obj) => (obj.castShadow = false));
    return scene;
  },

  // called every frame with the camera
  update(camera) {
    roof.visible = camera.position.y < CEIL - 0.1;
  },
};
