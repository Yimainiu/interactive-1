import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ------------------------------------------------------------------
   3D Reconstruction Test
   A rough low-poly rebuild of the ID studio from two phone photos.

   Units are metres. Photo 1 was taken standing at the origin,
   looking toward the window wall (-z). x runs to the right, y is up.
------------------------------------------------------------------- */

// ---------- colours picked from the photos ----------
const C = {
  floor: "#7d7568",
  base: "#4f483f",
  wall: "#efece4",
  partition: "#c9c3a3",
  ceiling: "#ece3c8",
  steel: "#a9aeb1",
  glass: "#f4f6f2",
  shade: "#4a4c4f",
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
  skin: "#d9a383",
  shirt: "#2f3440",
};

const ROOM = { left: -7, right: 10, back: -15.6, front: 1.5, height: 6 };
const PARTITION = { z: -15, from: -5.4, to: 4.4, height: 2.8 };

// Photos were shot on an iPhone 16 Pro main camera (24 mm equiv.), 4:3 frame
const PHOTO_FOV = 56.8;

// ---------- small helpers ----------

// seeded random, so the "messy" bits look the same on every visit
let seed = 11;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

const materials = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) {
    materials.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.85,
        ...extra,
      }),
    );
  }
  return materials.get(key);
}

function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// box whose bottom sits at y (handy for furniture)
function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
  return addMesh(parent, new THREE.BoxGeometry(w, h, d), mat(color), x, y + h / 2, z);
}

// cylinder whose bottom sits at y; few sides = low-poly
function cyl(parent, rTop, rBottom, h, sides, color, x = 0, y = 0, z = 0) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  return addMesh(parent, geo, mat(color), x, y + h / 2, z);
}

// thin square bar between two points (frames, trusses, cables)
const UP = new THREE.Vector3(0, 1, 0);
function bar(parent, a, b, size, color) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const dir = end.clone().sub(start);
  const mesh = addMesh(
    parent,
    new THREE.BoxGeometry(size, dir.length(), size),
    mat(color),
    0,
    0,
    0,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

// a group placed on the floor and turned around the y axis
function place(parent, x, z, turnDeg = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = THREE.MathUtils.degToRad(turnDeg);
  parent.add(g);
  return g;
}

// ---------- renderer, scene, camera ----------

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#f6eee9");

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxDistance = 60;

// soft daylight from the windows plus a bit of fill
scene.add(new THREE.HemisphereLight("#fff9ee", "#7d7465", 1.9));

const sun = new THREE.DirectionalLight("#fff1d9", 2.4);
sun.position.set(5, 16, -26);
sun.target.position.set(2, 0, -6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -16;
sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -16;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const fill = new THREE.DirectionalLight("#e4ecff", 0.8);
fill.position.set(-8, 10, 12);
scene.add(fill);

// roof parts hide when the camera flies above the room, like a dollhouse
const roof = new THREE.Group();
// window frames and the cable grid: thin stuff that shouldn't stripe the floor with shadows
const shell = new THREE.Group();
scene.add(roof, shell);

/* ==================================================================
   ROOM SHELL
================================================================== */

function buildFloor() {
  const w = ROOM.right - ROOM.left;
  const d = ROOM.front - ROOM.back;
  const geo = new THREE.PlaneGeometry(w, d, 26, 24);
  geo.rotateX(-Math.PI / 2);

  // nudge the inner points around so the triangles look hand-cut
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (Math.abs(x) < w / 2 - 0.01 && Math.abs(z) < d / 2 - 0.01) {
      pos.setX(i, x + (rand() - 0.5) * 0.4);
      pos.setZ(i, z + (rand() - 0.5) * 0.4);
    }
  }

  // one colour per triangle: patchy polished concrete
  const flat = geo.toNonIndexed();
  const colors = [];
  const base = new THREE.Color(C.floor);
  const tint = new THREE.Color();
  for (let i = 0; i < flat.attributes.position.count; i += 3) {
    tint.copy(base).multiplyScalar(0.86 + rand() * 0.2);
    for (let k = 0; k < 3; k++) colors.push(tint.r, tint.g, tint.b);
  }
  flat.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  flat.computeVertexNormals();

  const floor = new THREE.Mesh(
    flat,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55 }),
  );
  floor.position.set(ROOM.left + w / 2, 0, ROOM.back + d / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  materials.set("floor", floor.material);

  // slab underneath, so the room reads as a model on a table
  box(scene, w, 0.4, d, C.base, floor.position.x, -0.41, floor.position.z);
}

// one-sided wall: visible from inside, see-through from outside
function wall(w, h, color, x, y, z, turnDeg) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(color));
  mesh.position.set(x, y + h / 2, z);
  mesh.rotation.y = THREE.MathUtils.degToRad(turnDeg);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function buildWalls() {
  const w = ROOM.right - ROOM.left;
  const d = ROOM.front - ROOM.back;
  const midX = ROOM.left + w / 2;
  const midZ = ROOM.back + d / 2;

  // back wall: low wall, big factory windows, strip above
  const sill = 0.8;
  const head = 5.3;
  wall(w, sill, C.wall, midX, 0, ROOM.back, 0);
  wall(w, ROOM.height - head, C.wall, midX, head, ROOM.back, 0);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w, head - sill),
    new THREE.MeshBasicMaterial({ color: C.glass }),
  );
  glass.position.set(midX, (sill + head) / 2, ROOM.back);
  scene.add(glass);

  // window grid, split into even bays
  const bays = Math.round(w / 1.9);
  const bay = w / bays;
  for (let i = 0; i <= bays; i++) {
    const x = ROOM.left + i * bay;
    bar(shell, [x, sill, ROOM.back + 0.05], [x, head, ROOM.back + 0.05], 0.09, C.steel);
  }
  for (const y of [sill, 1.9, 3.1, 4.2, head]) {
    bar(shell, [ROOM.left, y, ROOM.back + 0.05], [ROOM.right, y, ROOM.back + 0.05], 0.07, C.steel);
  }

  // dark roller shades on the right half, pulled to different heights
  for (let i = 0; i < bays; i++) {
    const x = ROOM.left + i * bay;
    if (x < PARTITION.to - 0.5) continue;
    const bottom = 1.55 + rand() * 0.6;
    const shade = box(scene, bay - 0.08, head - bottom, 0.03, C.shade, x + bay / 2, bottom, ROOM.back + 0.12);
    shade.castShadow = false;
  }

  // long counter under the windows with odds and ends on it
  box(scene, ROOM.right - PARTITION.to, 0.85, 0.6, C.white, (ROOM.right + PARTITION.to) / 2, 0, ROOM.back + 0.35);
  const sillColors = [C.red, C.yellow, C.white, C.grey, "#f08a3c", C.lime];
  for (let x = PARTITION.to + 0.4; x < ROOM.right - 0.3; x += 0.55 + rand() * 0.6) {
    const h = 0.12 + rand() * 0.35;
    const color = sillColors[Math.floor(rand() * sillColors.length)];
    cyl(scene, 0.06 + rand() * 0.06, 0.1, h, 6, color, x, 0.85, ROOM.back + 0.35);
  }

  // side walls (only seen from inside)
  wall(d, ROOM.height, C.wall, ROOM.left, 0, midZ, 90);
  wall(d, ROOM.height, C.wall, ROOM.right, 0, midZ, -90);

  // doorway into the corridor on the left
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), mat("#d9d5cc"));
  door.position.set(ROOM.left + 0.01, 1.2, -13.6);
  door.rotation.y = Math.PI / 2;
  scene.add(door);

  // ceiling: one-sided so it disappears when seen from above
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(C.ceiling));
  deck.rotation.x = Math.PI / 2;
  deck.position.set(midX, ROOM.height, midZ);
  roof.add(deck);
}

// beige sliding partition with the pin-up wall on its right end
function buildPartition() {
  const { z, from, to, height } = PARTITION;
  const g = place(scene, 0, z);
  const count = 8;
  const pw = (to - from) / count;
  for (let i = 0; i < count; i++) {
    const tone = new THREE.Color(C.partition).multiplyScalar(0.95 + rand() * 0.08);
    box(g, pw - 0.03, height - 0.1, 0.05, "#" + tone.getHexString(), from + pw * (i + 0.5), 0.1, 0);
  }
  // steel header rail and end post
  box(g, to - from + 0.4, 0.14, 0.12, C.steel, (from + to) / 2, height, 0);
  bar(g, [from - 0.1, 0, 0], [from - 0.1, ROOM.height, 0], 0.12, C.steel);

  // pinned-up posters, sketches and prints
  const paper = [C.white, C.white, "#f1ead9", "#e5dccb", "#2d2d2f", "#5d8fd8", "#e6a83c", "#d65a4e", C.teal, "#b6a5da"];
  for (let i = 0; i < 70; i++) {
    const w = 0.15 + rand() * 0.3;
    const h = 0.18 + rand() * 0.3;
    const x = 0.6 + rand() * (to - 0.9);
    const y = 1.2 + rand() * 1.35;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(paper[Math.floor(rand() * paper.length)]));
    sheet.position.set(x, y, 0.03 + i * 0.0004);
    g.add(sheet);
  }

  // white wall + folding chair beside the partition on the left
  box(scene, from - ROOM.left - 0.1, 3.2, 0.2, C.wall, (ROOM.left + from) / 2, 0, z + 0.3);
  foldingChair(scene, -6.3, z + 0.9, 10);
}

// exposed steel and the cable grid under the ceiling
function buildCeiling() {
  // timber joists
  for (let z = ROOM.back + 0.6; z < ROOM.front; z += 1.4) {
    box(roof, ROOM.right - ROOM.left, 0.28, 0.12, "#e3d7b5", (ROOM.left + ROOM.right) / 2, ROOM.height - 0.28, z);
  }

  // three big steel trusses spanning the room
  for (const z of [-3, -8, -13]) {
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

  // LED strips over the right half
  const led = new THREE.MeshBasicMaterial({ color: "#fffdf4" });
  for (let x = 3.2; x < ROOM.right; x += 1.6) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 11), led);
    strip.position.set(x, 4.5, -8);
    roof.add(strip);
  }

  // unistrut grid that the cord reels hang from (kept when the roof hides)
  const gridY = 4.2;
  for (let z = -2; z >= -14; z -= 3) {
    bar(shell, [ROOM.left + 1, gridY, z], [ROOM.right - 1, gridY, z], 0.06, C.steel);
  }
  for (let x = -5; x <= 10; x += 3) {
    bar(shell, [x, gridY, -14], [x, gridY, -2], 0.06, C.steel);
  }

  for (const part of [roof, shell]) {
    part.traverse((obj) => (obj.castShadow = false));
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
  // apron + lower stretchers
  for (const y of [h - 0.12, 0.2]) {
    box(g, w - 0.12, 0.04, 0.04, C.frame, 0, y, -lz);
    box(g, w - 0.12, 0.04, 0.04, C.frame, 0, y, lz);
    box(g, 0.04, 0.04, d - 0.12, C.frame, -lx, y, 0);
    box(g, 0.04, 0.04, d - 0.12, C.frame, lx, y, 0);
  }
  // diagonal brace on one side
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

function foldingChair(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  for (const sx of [-0.2, 0.2]) {
    bar(g, [sx, 0, -0.25], [sx, 0.85, 0.1], 0.025, C.black);
    bar(g, [sx, 0, 0.25], [sx, 0.45, -0.05], 0.025, C.black);
  }
  box(g, 0.42, 0.03, 0.38, C.black, 0, 0.45, 0);
  box(g, 0.42, 0.25, 0.03, C.black, 0, 0.58, -0.15);
  return g;
}

// big black pin-board on a rolling stand ("the wall" in front of the camera)
function pinBoard(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  const w = 2.05;
  box(g, w, 1.15, 0.03, C.board, w / 2, 0.3, 0);
  // two inverted-T side frames on casters
  for (const px of [0.12, 1.2]) {
    box(g, 0.05, 1.55, 0.05, C.frame, px, 0.06, -0.06);
    box(g, 0.06, 0.06, 0.62, C.frame, px, 0.06, -0.06);
    for (const pz of [-0.34, 0.22]) cyl(g, 0.035, 0.035, 0.06, 6, C.black, px, 0, pz);
  }
  box(g, 1.1, 0.02, 0.32, "#3b2f2a", 0.66, 0.24, -0.22);
  // sticky note in the corner
  box(g, 0.13, 0.11, 0.004, "#d8f05a", w - 0.18, 1.24, 0.017);
  return g;
}

// handwriting on the whiteboard, drawn on a canvas
function whiteboardTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 640;
  const g = cv.getContext("2d");
  g.fillStyle = "#fbfbf7";
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = g.strokeStyle = "#27303b";
  g.lineWidth = 5;
  g.save();
  g.rotate(-0.05);
  g.font = "bold 68px 'Marker Felt', 'Comic Sans MS', 'Chalkboard SE', cursive";
  g.fillText("INDEPEDANCE", 300, 125);
  g.strokeRect(280, 55, 470, 92);
  g.restore();
  g.font = "36px 'Marker Felt', 'Comic Sans MS', 'Chalkboard SE', cursive";
  g.fillText("ORGANIZATIONAL:", 330, 250);
  g.fillText("COGNITIVE:", 760, 180);
  g.fillText("PHYSICAL:", 30, 330);
  // two columns of teal sticky notes
  for (const [cx, n] of [[360, 4], [690, 6]]) {
    for (let i = 0; i < n; i++) {
      const y = 280 + i * 58;
      g.fillStyle = "#86dccd";
      g.fillRect(cx, y, 70, 50);
      g.fillStyle = "#3a5c58";
      g.fillRect(cx + 8, y + 14, 50, 3);
      g.fillRect(cx + 8, y + 28, 38, 3);
    }
  }
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
  // a box only shows the drawing on its front (+z) face
  const board = addMesh(g, new THREE.BoxGeometry(w, 1.05, 0.04), [side, side, side, side, front, side], w / 2, 1.18, 0);
  board.castShadow = true;
  for (const px of [0.05, w - 0.05]) {
    box(g, 0.05, 1.68, 0.05, C.steel, px, 0.05, -0.04);
    box(g, 0.06, 0.05, 0.6, C.frame, px, 0.05, -0.04);
  }
  return g;
}

// yellow retractable cord reel hanging from the grid, cable dropping down
function cordReel(x, y, z, turn, dropTo) {
  const g = place(scene, x, z, turn, y);
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), mat(C.yellow));
  reel.rotation.z = Math.PI / 2;
  g.add(reel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), mat(C.black));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  bar(g, [0, 0.2, 0], [0, 4.2 - y, 0], 0.03, C.black);
  bar(g, [0, -0.2, 0.05], [0.15, dropTo - y, 0.3], 0.02, C.black);
  return g;
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
  scene.add(shade);
  cyl(scene, 0.09, 0.09, 0.08, 10, C.black, x, y + 0.37, z);
  bar(scene, [x, y + 0.45, z], [x, 4.2, z], 0.015, C.black);
  const glow = new THREE.PointLight("#ffe9c4", 3, 6);
  glow.position.set(x, y + 0.1, z);
  scene.add(glow);
}

function printer3d(parent, x, y, z, turn) {
  const g = place(parent, x, z, turn, y);
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

// a classmate at their desk, kept very simple
function sittingPerson(parent, x, z, turn) {
  const g = place(parent, x, z, turn);
  stool(g, 0, 0, 0.66);
  bar(g, [0, 0.76, 0.06], [0, 0.78, 0.42], 0.13, "#3b3f48");
  bar(g, [0, 0.76, 0.42], [0, 0.25, 0.45], 0.1, "#3b3f48");
  cyl(g, 0.17, 0.2, 0.55, 6, C.shirt, 0, 0.74, 0);
  addMesh(g, new THREE.IcosahedronGeometry(0.11, 0), mat(C.skin), 0, 1.44, 0.03);
  addMesh(g, new THREE.IcosahedronGeometry(0.115, 0), mat("#3a2a22"), 0, 1.48, -0.01);
  const phones = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 4, 8, Math.PI), mat(C.black));
  phones.position.set(0, 1.44, 0.02);
  g.add(phones);
  bar(g, [0.18, 1.2, 0], [0.12, 1.0, 0.38], 0.07, C.shirt);
  bar(g, [-0.18, 1.2, 0], [-0.12, 1.0, 0.38], 0.07, C.shirt);
}

function robotArm(parent, x, y, z) {
  const g = place(parent, x, z, 30, y);
  cyl(g, 0.12, 0.14, 0.08, 8, C.white, 0, 0, 0);
  bar(g, [0, 0.08, 0], [0.05, 0.42, 0.05], 0.07, C.white);
  bar(g, [0.05, 0.42, 0.05], [0.3, 0.5, 0.15], 0.06, C.white);
  box(g, 0.08, 0.08, 0.08, C.grey, 0.3, 0.46, 0.15);
}

/* ==================================================================
   LAYOUT  (rough positions, read off the two photos)
================================================================== */

function buildStudio() {
  // --- black pin-board right in front of the camera ---
  pinBoard(scene, 0.2, -2.9, -60);

  // --- whiteboard just behind it ---
  whiteboard(scene, 0.35, -4.3, 18);

  // --- front pod of benches with cardboard dividers ---
  const t1 = workbench(scene, -0.55, -5.25, 32, 1.15, 0.8);
  // papers, rulers, sticky notes
  box(t1, 0.42, 0.01, 0.3, C.white, 0.05, t1.userData.top, 0.05);
  box(t1, 0.3, 0.012, 0.22, "#eef0f6", 0.25, t1.userData.top, 0.1);
  box(t1, 0.28, 0.02, 0.04, C.lime, 0.0, t1.userData.top + 0.01, -0.05);
  box(t1, 0.24, 0.02, 0.04, C.lime, 0.3, t1.userData.top + 0.01, -0.12);
  box(t1, 0.14, 0.02, 0.05, "#3f6fd1", 0.08, t1.userData.top + 0.01, 0.18);
  cardboard(t1, 0.85, 1.4, -0.6, 0, 90);

  const t2 = workbench(scene, -1.5, -5.8, 32, 1.1, 0.8);
  // toolbox, black bag, clear bin, poster
  box(t2, 0.34, 0.22, 0.22, C.black, -0.15, t2.userData.top, 0);
  box(t2, 0.34, 0.06, 0.22, C.yellow, -0.15, t2.userData.top + 0.16, 0);
  box(t2, 0.4, 0.26, 0.26, C.black, 0.25, t2.userData.top, -0.12);
  box(t2, 0.34, 0.26, 0.24, "#dfe8ec", 0.3, t2.userData.top, 0.18);
  cardboard(t2, 0.85, 1.35, -0.57, 0, 90);
  cardboard(t2, 0.36, 0.45, 0.05, 0.33, 0, t2.userData.top);

  const t3 = workbench(scene, -0.45, -6.45, 32, 1.4, 0.8);
  // instrument case and grey bag
  box(t3, 0.85, 0.12, 0.28, C.black, 0.15, t3.userData.top, -0.05);
  box(t3, 0.45, 0.2, 0.3, "#a8a6a8", -0.35, t3.userData.top, 0.22);
  cardboard(t3, 0.8, 0.9, 0.72, -0.05, 90, 0.2);

  stool(scene, -0.15, -5.85);
  stool(scene, -1.1, -6.4);

  // round fibre drum
  cyl(scene, 0.29, 0.29, 0.95, 10, "#cfa772", -2.55, 0, -7.9);
  cyl(scene, 0.3, 0.3, 0.04, 10, C.steel, -2.55, 0.92, -7.9);

  // --- back pod: 3D printer table, divider, person's desk ---
  const t4 = workbench(scene, -0.1, -9.2, 4, 1.8, 0.8);
  printer3d(t4, 0.1, t4.userData.top, -0.05, -10);
  box(t4, 0.35, 0.16, 0.22, "#7f8487", -0.35, t4.userData.top, 0.05);
  box(t4, 0.2, 0.2, 0.2, C.red, -0.7, t4.userData.top, -0.1);
  box(t4, 0.3, 0.4, 0.02, C.white, -0.85, t4.userData.top, 0.1);
  const t5 = workbench(scene, 1.6, -8.4, -6, 1.6, 0.8);
  box(t5, 0.4, 0.06, 0.25, "#c79b6e", 0.1, t5.userData.top, 0);
  box(t5, 0.3, 0.12, 0.2, C.white, -0.4, t5.userData.top, 0.1);
  cardboard(scene, 0.8, 0.75, 1.0, -7.75, -6, 0.92);
  stool(scene, 1.2, -7.6);

  cardboard(scene, 2.4, 1.55, 2.7, -9.75, -8);
  const desk = workbench(scene, 3.55, -10.4, 90, 1.8, 0.75);
  monitor(desk, 0.0, desk.userData.top, -0.05, 90, "#d9dadc");
  sittingPerson(scene, 4.25, -10.2, -90);

  // --- right side: big cardboard boxes and a prototyping table ---
  const big = place(scene, 2.9, -4.9, 12);
  box(big, 1.7, 1.3, 1.1, C.cardboard, 0, 0, 0);
  const flap = box(big, 1.6, 0.02, 0.65, "#b98f5c", 0.05, 1.3, 0.1);
  flap.rotation.x = -0.35;

  const t6 = workbench(scene, 4.3, -6.6, 6, 1.6, 0.8);
  robotArm(t6, -0.2, t6.userData.top, 0);
  box(t6, 0.6, 0.45, 0.4, C.cardboard, 0.45, t6.userData.top, 0);
  monitor(t6, 0.4, t6.userData.top, -0.35, 0);
  cyl(t6, 0.05, 0.05, 0.25, 6, C.yellow, -0.6, t6.userData.top, -0.2);
  addMesh(t6, new THREE.IcosahedronGeometry(0.12, 0), mat(C.yellow), -0.6, t6.userData.top + 0.3, -0.2);
  cardboard(scene, 2.2, 1.3, 5.6, -5.7, 6);

  const t7 = workbench(scene, 1.9, -3.55, 18, 1.2, 0.75);
  box(t7, 0.5, 0.3, 0.4, C.white, -0.15, t7.userData.top, 0);
  cyl(t7, 0.13, 0.13, 0.03, 10, C.yellow, 0.3, t7.userData.top, 0.1);
  cyl(t7, 0.04, 0.04, 0.24, 8, "#c0c3c6", 0.0, t7.userData.top, -0.25);

  // black school chair right behind the pin-board
  const chair = place(scene, 1.55, -2.35, -40);
  cyl(chair, 0.22, 0.22, 0.05, 8, C.black, 0, 0.45, 0);
  box(chair, 0.4, 0.3, 0.04, C.black, 0, 0.55, -0.2);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    bar(chair, [sx * 0.17, 0, sz * 0.17], [sx * 0.15, 0.45, sz * 0.15], 0.025, C.grey);
  }

  // more benches toward the window, mostly hidden in the photos
  workbench(scene, 6.6, -9.0, 0, 1.8, 0.8);
  monitor(scene, 6.3, 0.92, -9.15, 0);
  workbench(scene, 8.8, -11.5, 0, 1.8, 0.8);
  cardboard(scene, 1.8, 1.4, 7.6, -7.6, 0);
}

function buildHangingStuff() {
  cordReel(-1.4, 3.7, -9.5, 90, 1.2);
  cordReel(-0.2, 3.45, -12.5, 90, 1.5);
  cordReel(2.6, 3.55, -14, 90, 1.6);
  cordReel(3.05, 3.55, -14, 90, 1.6);
  cordReel(4.3, 3.7, -10.8, 90, 1.3);
  cordReel(-3.2, 3.7, -4.8, 90, 1.4);
  cordReel(0.9, 3.8, -4.6, 90, 1.3);

  // loose black cables hanging down to the desks
  for (const [x, z, y] of [[1.25, -6.6, 1.0], [2.0, -5.6, 1.3], [-0.9, -4.6, 1.6], [3.5, -7.8, 1.1]]) {
    bar(scene, [x, 4.2, z], [x + 0.1, y, z + 0.1], 0.02, C.black);
  }

  pendantLamp(3.4, 2.35, -7.2);
}

buildFloor();
buildWalls();
buildPartition();
buildCeiling();
buildStudio();
buildHangingStuff();

/* ==================================================================
   VIEWS + UI
================================================================== */

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

const VIEWS = {
  photo1: { pos: [0, 1.6, 0], target: aim([0, 1.6, 0], 10, 10), photo: "Photo 1 · IMG_4677" },
  photo2: { pos: [-0.2, 2.35, -0.4], target: aim([-0.2, 2.35, -0.4], 14, 25), photo: "Photo 2 · IMG_4678" },
  overview: { pos: [-8.5, 9.5, 4.5], target: [1.2, 0.6, -7.2], fov: 45 },
  plan: { pos: [1.5, 29, -6.99], target: [1.5, 0, -7], fov: 45 },
};

const frame = document.querySelector("#frame");
const frameLabel = document.querySelector("#frame-label");
const buttons = document.querySelectorAll("#views button");
let current = null;
let tween = null;

// field of view that fits the photo's 4:3 frame inside the window
function photoFov() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fh = Math.min(h, (w * 3) / 4) * 0.92;
  frame.style.width = `${(fh * 4) / 3}px`;
  frame.style.height = `${fh}px`;
  const half = Math.tan(THREE.MathUtils.degToRad(PHOTO_FOV / 2)) * (h / fh);
  return THREE.MathUtils.radToDeg(2 * Math.atan(half));
}

// other views: on tall phone screens, widen so the sides don't get cut off
function viewFov(view) {
  if (view.photo) return photoFov();
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect >= 4 / 3) return view.fov;
  const half = (Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) * (4 / 3)) / aspect;
  return Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(half)), 75);
}

function goTo(name, instant = false) {
  const view = VIEWS[name];
  current = name;
  buttons.forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  frame.hidden = !view.photo;
  frameLabel.textContent = view.photo || "";

  // drop any leftover spin from the last drag so it can't push the camera off
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = true;

  const to = {
    pos: new THREE.Vector3(...view.pos),
    target: new THREE.Vector3(...view.target),
    fov: viewFov(view),
  };
  if (instant) {
    camera.position.copy(to.pos);
    controls.target.copy(to.target);
    camera.fov = to.fov;
    camera.updateProjectionMatrix();
    return;
  }
  tween = {
    start: performance.now(),
    from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov },
    to,
  };
}

function updateTween(now) {
  if (!tween) return;
  const t = Math.min((now - tween.start) / 1200, 1);
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
  controls.target.lerpVectors(tween.from.target, tween.to.target, e);
  camera.fov = THREE.MathUtils.lerp(tween.from.fov, tween.to.fov, e);
  camera.updateProjectionMatrix();
  if (t === 1) tween = null;
}

buttons.forEach((b) => b.addEventListener("click", () => goTo(b.dataset.view)));

// once you drag, you're no longer standing where the photo was taken
controls.addEventListener("start", () => {
  tween = null;
  frame.hidden = true;
  buttons.forEach((b) => b.classList.remove("active"));
  current = null;
});

document.querySelector("#wireframe").addEventListener("change", (e) => {
  materials.forEach((m) => (m.wireframe = e.target.checked));
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (current && !tween) camera.fov = viewFov(VIEWS[current]);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// a view can be linked directly, e.g. 3d_reconstruction_test.html#photo2
const start = location.hash.slice(1);
goTo(VIEWS[start] ? start : "overview", true);

renderer.setAnimationLoop((now) => {
  updateTween(now);
  controls.update();
  roof.visible = camera.position.y < ROOM.height - 0.2;
  renderer.render(scene, camera);
});
