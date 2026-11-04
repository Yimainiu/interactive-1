import * as THREE from "three";
import {
  reseed,
  rand,
  mat,
  addMesh,
  box,
  cyl,
  taperedBox,
  bar,
  place,
  batch,
  facetedGround,
  makeLayers,
  standingPerson,
} from "./lowpoly.js";

/* ------------------------------------------------------------------
   Scene 3: Main Gate & Courtyard
   The courtyard between the main CCA building and the timber
   building, rebuilt from the phone photos and the drone video in
   Space Media/Main Gate and Courtyard.

   Units are metres. The photo IMG_4593 was taken from the entrance
   terrace by the street, at the origin, looking down the courtyard
   (-z) toward the far gate. The CCA building runs along the left.
------------------------------------------------------------------- */

const C = {
  paving: "#b4b6b5",
  darkPaving: "#74787d",
  base: "#4f4a43",
  white: "#eeeeea",
  roof: "#b0ada5",
  trim: "#b13f37",
  glass: "#6c8794",
  teal: "#2aa7a3",
  step: "#6d7176",
  black: "#26272a",
  steel: "#3a3c40",
  concrete: "#c9c6bf",
  wood: "#c99a62",
  timberGlass: "#3b4a50",
  siding: "#6e6560",
  darkGlass: "#2d3640",
  asphalt: "#4b4c4f",
  trunk: "#5b4a3c",
  grassA: "#5f7a45",
  grassB: "#7a8f4e",
  grassC: "#4f6a3f",
  grassD: "#8d9a5a",
  leaf: "#7f9a4c",
  hedge: "#405a35",
  sign: "#e0604a",
  carGlass: "#2b333b",
  tyre: "#1f1f21",
};

const SITE = { left: -40, right: 40, back: -115, front: 24 };
const TERRACE = { edge: -2, back: 10, height: 4.5 }; // where the photo was taken from
const CCA = { x: -15.3, z: 8, turn: -6.5, len: 68, depth: 28, height: 8.6 };
const FENCE_Z = -62.5;

let scene;
let layers; // groups the panel can show or hide

// x of the CCA facade at a given z (the facade runs slightly askew)
function facadeX(z) {
  const t = Math.tan(THREE.MathUtils.degToRad(-CCA.turn));
  return CCA.x + t * (CCA.z - z);
}

/* ==================================================================
   GROUND
================================================================== */

function buildGround() {
  const w = SITE.right - SITE.left;
  const d = SITE.front - SITE.back;
  box(scene, w, 0.4, d, C.base, 0, -0.41, (SITE.front + SITE.back) / 2);

  // courtyard paving, from the terrace to the far fence
  const pz0 = FENCE_Z - 1;
  const pz1 = TERRACE.back;
  facetedGround(scene, 52, pz1 - pz0, C.paving, 2, (pz0 + pz1) / 2, 2.2, 0.08);

  // streets: the one beyond the far gate and the one behind the terrace
  box(scene, w, 0.02, 16, C.asphalt, 0, 0, FENCE_Z - 9);
  box(scene, w, 0.02, SITE.front - TERRACE.back, C.asphalt, 0, 0, (SITE.front + TERRACE.back) / 2);
  box(scene, w, 0.15, 3, C.concrete, 0, 0, FENCE_Z - 18.5);
  box(scene, w, 0.15, 2, C.concrete, 0, 0, TERRACE.back + 1);

  // entrance terrace the photo was taken from, with steps down at the side
  const tw = 20;
  box(scene, tw, TERRACE.height, TERRACE.back - TERRACE.edge, C.concrete, 2, 0, (TERRACE.edge + TERRACE.back) / 2);
  for (let i = 0; i < 8; i++) {
    box(scene, 3, TERRACE.height * (1 - i / 8), 0.45, C.concrete, 10.5, 0, TERRACE.edge - 0.25 - i * 0.45);
  }
}

/* ==================================================================
   BUILDINGS
================================================================== */

// the white lettering and teal logo on the CCA glass, drawn on a canvas
function graphicsTexture() {
  const cv = document.createElement("canvas");
  cv.width = 4096;
  cv.height = 512;
  const g = cv.getContext("2d");
  g.fillStyle = C.teal;
  g.font = "bold 420px Arial, Helvetica, sans-serif";
  g.textBaseline = "middle";
  g.fillText("CCA", 40, 270);
  g.fillStyle = "#ffffff";
  g.font = "bold 150px Arial, Helvetica, sans-serif";
  g.fillText("California College of the Arts", 1000, 300);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// the main building: white box, a long wall of red-framed glass facing the courtyard
function buildCCA() {
  // local frame: the facade is the plane x = 0 facing +x, running from z = 0 to -len
  const g = place(scene, CCA.x, CCA.z, CCA.turn);
  const { len, depth, height } = CCA;
  box(g, depth, height, len, C.white, -depth / 2 - 0.1, 0, -len / 2);
  box(g, depth, 0.05, len, C.roof, -depth / 2, height, -len / 2);
  box(g, 0.6, 0.6, len, C.white, -0.3, height, -len / 2); // parapet
  // roof clutter seen from the air: skylight rows and solar panels
  for (let i = 0; i < 4; i++) box(g, 2.2, 0.5, len - 12, "#cfd5d6", -5 - i * 5.5, height, -len / 2);
  for (let i = 0; i < 6; i++) {
    const p = box(g, 4, 0.1, 2, "#2f3c52", -6 - (i % 3) * 6, height + 0.4, -12 - Math.floor(i / 3) * 18);
    p.rotation.x = 0.3;
  }

  // glazing from 1.2 m to 7 m with a grid of red mullions; aluminium doors at the bottom
  const g0 = 1.2;
  const g1 = 7.0;
  addMesh(g, new THREE.BoxGeometry(0.06, g1 - g0, len - 1), mat(C.glass, { roughness: 0.3 }), 0.03, (g0 + g1) / 2, -len / 2);
  const parts = batch();
  for (let z = -0.5; z >= -len + 0.5; z -= 2.3) {
    const thick = Math.round(z / 2.3) % 2 === 0;
    parts.box(0.1, g1 - g0, thick ? 0.16 : 0.08, C.trim, 0.08, g0, z);
  }
  for (const y of [g0, 2.9, 4.4, 5.8, g1 - 0.1]) parts.box(0.1, 0.1, len - 1, C.trim, 0.08, y, -len / 2);
  // entrance: glass doors from the ground between z -16 and -30
  parts.box(0.08, g0, 14, C.glass, 0.03, 0, -23);
  for (let z = -16; z >= -30; z -= 1.4) parts.box(0.1, 2.9, 0.08, "#c3c7c9", 0.1, 0, z);
  parts.addTo(g);

  // lettering and logo on a transparent sheet just in front of the glass
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 4.5),
    new THREE.MeshBasicMaterial({ map: graphicsTexture(), transparent: true }),
  );
  sheet.rotation.y = Math.PI / 2;
  sheet.position.set(0.2, 4.6, -30);
  g.add(sheet);

  // bleacher steps along the foot of the facade, and a dark paving strip
  for (let i = 0; i < 3; i++) box(g, 0.9, 0.4 * (3 - i), 22, C.step, 0.45 + i * 0.9, 0, -20);
  box(g, 6, 0.02, len, C.darkPaving, 3, 0, -len / 2);

  // tall black light poles along the facade
  for (let z = -6; z > -len; z -= 9) cyl(layers.lamps, 0.07, 0.09, 7, 6, C.black, 5.5, 0, z);
  return g;
}

// mass-timber building: wood floors, glass, black steel X-bracing, open arcade below
function buildTimber() {
  const x0 = 13.5;
  const x1 = 34;
  const z0 = -48.5; // courtyard-facing front
  const z1 = -70;
  const floors = [0, 5.5, 9.3, 13.1, 16.9, 20.7];
  const top = floors[floors.length - 1];
  const parts = batch();

  // glass skin set back behind the frame (deeper at the arcade)
  parts.box(x1 - x0 - 1.6, top - 5.5, z0 - z1 - 1.6, C.timberGlass, (x0 + x1) / 2, 5.5, (z0 + z1) / 2);
  parts.box(x1 - x0 - 6, 5.5, z0 - z1 - 6, C.timberGlass, (x0 + x1) / 2 + 1, 0, (z0 + z1) / 2 - 1);
  // floor slabs: concrete edge with warm wood underneath
  for (const y of floors.slice(1)) {
    parts.box(x1 - x0, 0.35, z0 - z1, C.concrete, (x0 + x1) / 2, y - 0.35, (z0 + z1) / 2);
    parts.box(x1 - x0 - 0.4, 0.25, z0 - z1 - 0.4, C.wood, (x0 + x1) / 2, y - 0.6, (z0 + z1) / 2);
  }
  parts.box(x1 - x0, 0.4, z0 - z1, C.concrete, (x0 + x1) / 2, top, (z0 + z1) / 2);
  // columns on a 4.2 m grid along the two courtyard faces
  for (let x = x0; x <= x1 + 0.01; x += 4.2) parts.box(0.35, top, 0.35, C.black, x, 0, z0);
  for (let z = z0; z >= z1 - 0.01; z -= 4.4) parts.box(0.35, top, 0.35, C.black, x0, 0, z);
  parts.addTo(scene, true);

  // X-braces in every other bay of the front and side faces
  for (let f = 1; f < floors.length - 1; f++) {
    const y0 = floors[f];
    const y1 = floors[f + 1] - 0.35;
    for (let x = x0; x < x1 - 1; x += 8.4) {
      bar(scene, [x, y0, z0 + 0.2], [x + 4.2, y1, z0 + 0.2], 0.18, C.black);
      bar(scene, [x + 4.2, y0, z0 + 0.2], [x, y1, z0 + 0.2], 0.18, C.black);
    }
    for (let z = z0; z > z1 + 1; z -= 8.8) {
      bar(scene, [x0 - 0.2, y0, z], [x0 - 0.2, y1, z - 4.4], 0.18, C.black);
      bar(scene, [x0 - 0.2, y0, z - 4.4], [x0 - 0.2, y1, z], 0.18, C.black);
    }
  }
  // balcony rail along the first floor
  box(scene, x1 - x0, 1.0, 0.06, C.black, (x0 + x1) / 2, floors[1], z0 + 0.25);
}

// a plain block with bands of windows, for the neighbours
function block(parent, x0, x1, z0, z1, floors, floorH, wall, glass, ground = glass) {
  const parts = batch();
  const w = x1 - x0;
  const d = z0 - z1;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  parts.box(w, floors * floorH, d, wall, cx, 0, cz);
  parts.box(w + 0.2, floorH * 0.8, d + 0.2, ground, cx, 0, cz);
  for (let f = 1; f < floors; f++) {
    parts.box(w + 0.1, floorH * 0.45, d + 0.1, glass, cx, f * floorH + floorH * 0.3, cz);
  }
  parts.addTo(parent, true);
}

function buildNeighbours() {
  const N = layers.neighbours;
  // grey building across the far street: siding, window bands, light top floor
  block(N, -13, 28, -88, -104, 5, 3.8, C.siding, C.darkGlass);
  box(N, 41.2, 1.6, 16.2, "#d8d8d4", 7.5, 18.2, -96);
  box(N, 3.5, 23, 5, C.darkGlass, -14.8, 0, -88.5); // glass stair tower
  // lower white building to its left and the low white building by the terrace
  block(N, -36, -16.5, -90, -108, 4, 3.5, "#dcdcd6", "#5d6870");
  block(N, 16, 32, 8, -22, 2, 3.6, C.white, "#5d6870");
  box(N, 16.2, 0.5, 30.2, "#8a6a4a", 24, 5.2, -7);
}

/* ==================================================================
   COURTYARD: planting, fence, lamps, signs
================================================================== */

// a raised bed in any four-sided shape, packed with grass tufts
function plantedBed(corners, tufts) {
  const shape = new THREE.Shape(corners.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  addMesh(layers.plants, geo, mat("#4a5a3a"), 0, 0, 0);

  const xs = corners.map((c) => c[0]);
  const zs = corners.map((c) => c[1]);
  const inside = (x, z) => {
    let hit = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const [xi, zi] = corners[i];
      const [xj, zj] = corners[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const grass = batch();
  const colors = [C.grassA, C.grassB, C.grassC, C.grassD];
  let placed = 0;
  while (placed < tufts) {
    const x = Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs));
    const z = Math.min(...zs) + rand() * (Math.max(...zs) - Math.min(...zs));
    if (!inside(x, z)) continue;
    const h = 0.4 + rand() * 0.5;
    const tuft = new THREE.ConeGeometry(0.28 + rand() * 0.15, h, 5);
    tuft.rotateY(rand() * Math.PI);
    tuft.translate(x, 0.3 + h / 2, z);
    grass.add(tuft, colors[Math.floor(rand() * colors.length)]);
    placed++;
  }
  grass.addTo(layers.plants);
}

// young courtyard tree: thin trunk, a few leafy blobs
function tree(x, z, s = 1, y = 0.3) {
  const g = place(layers.plants, x, z, rand() * 360, y);
  cyl(g, 0.05 * s, 0.08 * s, 2.6 * s, 5, C.trunk, 0, 0, 0);
  for (const [bx, by, bz, r] of [[0, 3.1, 0, 0.95], [0.6, 2.7, 0.2, 0.6], [-0.5, 2.8, -0.3, 0.65], [0.1, 3.7, 0.1, 0.6]]) {
    const blob = addMesh(g, new THREE.IcosahedronGeometry(r * s, 0), mat(rand() < 0.5 ? C.leaf : "#6d8a42"), bx * s, by * s, bz * s);
    blob.rotation.set(rand() * 3, rand() * 3, 0);
  }
}

function buildCourtyard() {
  // the big angled bed in the middle of the courtyard, and its tree
  plantedBed([[-5.5, -28.7], [4.7, -37.1], [4.4, -48.7], [-7.3, -43.8]], 330);
  tree(-0.8, -37.5, 1.2);

  // the garden in front of the timber building and the low white building
  plantedBed([[13.5, -25], [29, -25], [29, -45.5], [13.5, -45.5]], 300);
  for (const [x, z] of [[16, -29], [21, -38], [26, -31]]) tree(x, z, 1.1);

  // hedge strip and a row of young trees along the far fence
  box(layers.plants, 23, 0.7, 2.4, C.hedge, 4.5, 0, FENCE_Z + 2);
  for (const x of [-4.5, -0.5, 3.5, 7.5, 11.5, 15]) tree(x, FENCE_Z + 2, 1.15, 0.7);

  // the main gate: black picket fence with taller gate posts
  const fence = batch();
  for (let x = -7; x <= 16; x += 0.22) fence.box(0.03, 2.4, 0.03, C.black, x, 0, FENCE_Z);
  for (const y of [0.1, 2.3]) fence.box(23, 0.06, 0.06, C.black, 4.5, y, FENCE_Z);
  for (const x of [-7, 1.5, 6.5, 16]) fence.box(0.18, 3.0, 0.18, C.black, x, 0, FENCE_Z);
  fence.addTo(scene, true);

  // red A-frame sign on the paving
  const sign = place(scene, 0.36, -22.2, 0);
  for (const s of [-1, 1]) {
    const leaf = box(sign, 0.62, 0.95, 0.03, C.sign, 0, 0, s * 0.17);
    leaf.rotation.x = s * 0.18;
  }

  // black bell lamps hanging from cables strung across the courtyard
  for (const z of [-11, -26, -42, -55]) {
    const xL = facadeX(z);
    const xR = z < -48 ? 13.5 : 15;
    bar(layers.lamps, [xL, 4.6, z], [xR, 4.6, z], 0.02, C.black).castShadow = false;
    for (let i = 1; i <= 3; i++) {
      const x = xL + ((xR - xL) * i) / 4;
      bar(layers.lamps, [x, 4.6, z], [x, 4.1, z], 0.015, C.black);
      cyl(layers.lamps, 0.12, 0.32, 0.45, 8, C.black, x, 3.65, z);
    }
  }

  // people crossing the courtyard
  standingPerson(layers.people, 6.5, -30, 200, "#2c3a52", "#c9b79b");
  standingPerson(layers.people, 7.4, -31, 180, "#3d4a37", "#202226");
  standingPerson(layers.people, -2.5, -53, 20, "#6a2f2f", "#33363d");
}

/* ==================================================================
   STREET: cars beyond the gate and along the terrace
================================================================== */

function car(x, z, turn, color, len = 4.6) {
  const g = place(layers.cars, x, z, turn);
  const wid = 1.8;
  box(g, len, 0.62, wid, color, 0, 0.3, 0);
  taperedBox(g, len * 0.55, 0.5, wid - 0.1, len * 0.33, wid - 0.35, C.carGlass, -0.2, 0.92, 0, -0.15);
  box(g, len * 0.31, 0.05, wid - 0.4, color, -0.35, 1.42, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = addMesh(g, new THREE.CylinderGeometry(0.33, 0.33, 0.24, 8), mat(C.tyre), sx * (len / 2 - 0.85), 0.33, sz * (wid / 2 - 0.08));
      wheel.rotation.x = Math.PI / 2;
    }
  }
}

function motorbike(x, z, color) {
  const g = place(layers.cars, x, z, 90);
  box(g, 1.6, 0.35, 0.25, color, 0, 0.45, 0);
  box(g, 0.5, 0.15, 0.3, C.black, -0.3, 0.8, 0);
  for (const sx of [-0.6, 0.6]) {
    const w = addMesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), mat(C.tyre), sx, 0.3, 0);
    w.rotation.x = Math.PI / 2;
  }
}

function buildStreets() {
  const colors = ["#b3232b", "#e9ebeb", "#a4a8ad", "#1f2328", "#283255", "#c3c6ca"];
  // beyond the gate: parked along the far side, one red car and a white one by the fence
  for (let x = -14; x < 34; x += 5.2) car(x, FENCE_Z - 15, 0, colors[Math.floor(rand() * colors.length)]);
  car(-3.5, FENCE_Z - 5, 0, "#b3232b");
  car(2.5, FENCE_Z - 5, 0, "#eceeee");
  car(9, FENCE_Z - 5, 0, "#b3232b");
  motorbike(-0.2, FENCE_Z - 3.2, "#c62f3a");
  motorbike(1, FENCE_Z - 3.2, C.black);
  // along the street behind the terrace, nose-in on both sides
  for (let x = -30; x < 36; x += 2.6) {
    if (rand() < 0.2) continue;
    car(x, TERRACE.back + 5, 90, colors[Math.floor(rand() * colors.length)]);
  }
}

function buildLights() {
  scene.add(new THREE.HemisphereLight("#e9f1fa", "#8d8a82", 2.0));
  // bright afternoon sun from behind the camera's left, as in the photos
  const sun = new THREE.DirectionalLight("#fff4e0", 2.6);
  sun.position.set(-40, 45, 25);
  sun.target.position.set(0, 0, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  for (const side of ["left", "bottom"]) sun.shadow.camera[side] = -70;
  for (const side of ["right", "top"]) sun.shadow.camera[side] = 70;
  sun.shadow.camera.far = 200;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#dfe8ff", 0.7);
  fill.position.set(30, 20, 30);
  scene.add(fill);
}

// where the camera pointed: yaw turns right, pitch tilts down (degrees)
function aim(pos, yaw, pitch) {
  const y = THREE.MathUtils.degToRad(yaw);
  const p = THREE.MathUtils.degToRad(pitch);
  return [
    pos[0] + Math.sin(y) * Math.cos(p) * 10,
    pos[1] - Math.sin(p) * 10,
    pos[2] - Math.cos(y) * Math.cos(p) * 10,
  ];
}

const GATE = [0, 6, 0];
const GARDEN = [-2.6, 5.8, -1.5];

export default {
  title: "Main Gate",
  intro: "gate",
  layers: [
    { key: "cars", label: "Cars" },
    { key: "plants", label: "Trees & plants" },
    { key: "lamps", label: "Lamps & cables" },
    { key: "people", label: "People" },
    { key: "neighbours", label: "Neighbours" },
  ],
  views: {
    // iPhone 16 Pro at 2x (47 mm equiv.) and 3x (66 mm equiv.), 4:3 photos
    gate: { label: "Courtyard", pos: GATE, target: aim(GATE, 0, 1.9), photo: { fov: 30.3, aspect: 4 / 3, name: "IMG_4593", src: "photos/main_gate.jpg" } },
    garden: { label: "Garden", pos: GARDEN, target: aim(GARDEN, 4, 4.5), photo: { fov: 22.3, aspect: 4 / 3, name: "IMG_4592", src: "photos/main_gate_garden.jpg" } },
    aerial: { label: "Aerial", pos: [62, 40, -8], target: [2, 0, -36], fov: 45 },
    overview: { label: "Overview", pos: [46, 42, 30], target: [0, 0, -32], fov: 45 },
    plan: { label: "Plan", pos: [2, 130, -39.99], target: [2, 0, -40], fov: 45 },
  },

  build() {
    reseed(5);
    scene = new THREE.Scene();
    layers = makeLayers(scene, this.layers);
    buildLights();
    buildGround();
    buildCCA();
    buildTimber();
    buildNeighbours();
    buildCourtyard();
    buildStreets();
    return scene;
  },
};
