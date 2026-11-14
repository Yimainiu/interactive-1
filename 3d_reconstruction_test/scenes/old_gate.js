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
   Scene 1: Old Gate
   The small side entrance of the school building, rebuilt from a
   drone flight (DJI photos + video) and two phone photos.

   Units are metres. The door is at x = 0 and the building's front
   wall is the plane z = 0; the parking lot is toward +z.
------------------------------------------------------------------- */

// ---------- colours picked from the photos ----------
const C = {
  lot: "#999b9c", // wet
  walk: "#b7b8b5",
  joint: "#8f908e",
  puddle: "#c6d1d9", // the sky, lying on the ground
  base: "#4f4a43",
  wall: "#dcdcd7",
  coping: "#cfd0cc",
  trim: "#b4473f",
  roof: "#aaa59a",
  monitor: "#8e9293",
  solar: "#2f3c52",
  hvac: "#c2c4c4",
  doorGlass: "#3f6c6c",
  leafGlass: "#35525a",
  trunk: "#5b4a3c",
  leafA: "#7d6b45",
  leafB: "#8e7142",
  leafC: "#6c6d44",
  mulch: "#5a4636",
  carGlass: "#2b333b",
  tyre: "#1f1f21",
  rack: "#2f8a4a",
  yellow: "#e2bd45",
  white: "#f4f4f1",
  black: "#26272a",
};

const SITE = { left: -34, right: 34, back: -26, front: 22 };
const WALK = { depth: 3.6, height: 0.15 }; // sidewalk; the curb is at z = WALK.depth
const WALL = 8.9; // facade height above the sidewalk
const DOOR = { w: 3.4, h: 3.3, depth: 0.6 }; // the recessed entrance bay

let scene;
let layers; // groups the panel can show or hide

/* ==================================================================
   GROUND
================================================================== */

function buildGround() {
  const w = SITE.right - SITE.left;
  const lotDepth = SITE.front - WALK.depth;
  // wet: the lot and the sidewalk shine a little under the grey sky
  facetedGround(scene, w, lotDepth, C.lot, 0, WALK.depth + lotDepth / 2, 2, 0.1).material.roughness = 0.3;
  mat(C.walk).roughness = 0.4;

  // sidewalk slab with expansion joints
  box(scene, w, WALK.height, WALK.depth, C.walk, 0, 0, WALK.depth / 2);
  const joints = batch();
  for (let x = SITE.left + 1.5; x < SITE.right; x += 1.5) {
    joints.box(0.03, 0.004, WALK.depth, C.joint, x, WALK.height, WALK.depth / 2);
  }
  joints.box(w, 0.004, 0.03, C.joint, 0, WALK.height, WALK.depth / 2);
  // yellow loading-zone paint on the curb by the door
  joints.box(10, 0.006, 0.16, C.yellow, 1, WALK.height, WALK.depth - 0.08);
  joints.box(10, WALK.height, 0.01, C.yellow, 1, 0, WALK.depth + 0.005);
  joints.addTo(scene);

  // slab underneath, so the site reads as a model on a table
  box(scene, w, 0.4, SITE.front - SITE.back, C.base, 0, -0.41, (SITE.front + SITE.back) / 2);
}

/* ==================================================================
   BUILDING
================================================================== */

// one red-framed window: glass plus a grid of mullions
function windowUnit(parts, x, y, w, h, cols, rows, glass) {
  parts.box(w, h, 0.04, glass, x + w / 2, y, 0.02);
  const z = 0.05;
  parts.box(w, 0.12, 0.08, C.trim, x + w / 2, y, z);
  parts.box(w, 0.1, 0.08, C.trim, x + w / 2, y + h - 0.1, z);
  parts.box(0.12, h, 0.08, C.trim, x + 0.06, y, z);
  parts.box(0.12, h, 0.08, C.trim, x + w - 0.06, y, z);
  for (let i = 1; i < cols; i++) parts.box(0.04, h, 0.06, C.trim, x + (w * i) / cols, y, z);
  for (let j = 1; j < rows; j++) parts.box(w, 0.04, 0.06, C.trim, x + w / 2, y + (h * j) / rows, z);
}

function buildBuilding() {
  const y0 = WALK.height;
  const top = y0 + WALL;
  const len = SITE.right - SITE.left;
  const half = DOOR.w / 2;

  // the block itself, with the entrance bay cut into the front
  const backDepth = -SITE.back - DOOR.depth;
  box(scene, len, top, backDepth, C.wall, 0, 0, -DOOR.depth - backDepth / 2);
  const sideW = SITE.right - half;
  box(scene, sideW, top, DOOR.depth, C.wall, -half - sideW / 2, 0, -DOOR.depth / 2);
  box(scene, sideW, top, DOOR.depth, C.wall, half + sideW / 2, 0, -DOOR.depth / 2);
  box(scene, DOOR.w, WALL - DOOR.h, DOOR.depth, C.wall, 0, y0 + DOOR.h, -DOOR.depth / 2);
  box(scene, DOOR.w, y0, DOOR.depth, C.walk, 0, 0, -DOOR.depth / 2);

  // roof: gravel, parapet coping, the long sloped roof monitor, solar panels
  box(scene, len, 0.04, -SITE.back - 0.3, C.roof, 0, top, SITE.back / 2 - 0.15);
  box(scene, len, 0.22, 0.5, C.coping, 0, top, -0.15);
  const slope = new THREE.Shape([
    new THREE.Vector2(3.7, 0),
    new THREE.Vector2(12.5, 0),
    new THREE.Vector2(12.5, 1.3),
  ]);
  const monitorGeo = new THREE.ExtrudeGeometry(slope, { depth: 62, bevelEnabled: false });
  monitorGeo.rotateY(Math.PI / 2); // extrude along x, shape x becomes -z
  addMesh(layers.roof, monitorGeo, mat(C.monitor), -28, top, 0);
  box(layers.roof, 62, 0.3, 0.12, "#5f6264", 3, top, -3.66);
  for (let z = -15; z >= -24; z -= 2.6) {
    const panel = box(layers.roof, 52, 0.08, 1.8, C.solar, 2, top + 0.55, z);
    panel.rotation.x = -0.28;
  }
  for (const [x, z] of [[-24, -18], [-21.5, -22], [26, -20], [14, -24]]) {
    box(layers.roof, 2.2, 1.1, 1.6, C.hvac, x, top, z);
  }

  const parts = batch();

  // upper floor: one long ribbon of 2.2 m window units, blinds at different heights
  const blinds = ["#c5cacd", "#b7bec2", "#a3adb3"];
  for (let x = -33.3; x <= SITE.right - 2.2; x += 2.2) {
    windowUnit(parts, x, y0 + 4.85, 2.2, 2.8, 4, 3, blinds[Math.floor(rand() * blinds.length)]);
  }

  // ground floor: windows in groups with solid wall in between; the ones
  // right of the door are wider and come down lower
  const dark = ["#66747b", "#5b6970", "#76838a"];
  const groups = [
    { starts: [-33, -21, -11.1, -5.95], counts: [4, 3, 1, 2], w: 1.9, sill: 1.55, h: 1.65 },
    { starts: [1.9, 17.6, 27], counts: [3, 4, 3], w: 2.2, sill: 0.9, h: 2.2 },
  ];
  for (const { starts, counts, w, sill, h } of groups) {
    starts.forEach((start, k) => {
      for (let i = 0; i < counts[k]; i++) {
        windowUnit(parts, start + i * w, y0 + sill, w, h, 3, 2, dark[Math.floor(rand() * dark.length)]);
      }
    });
  }

  // red trim line along the top of the ground floor
  parts.box(len, 0.15, 0.06, C.trim, 0, y0 + 3.45, 0.03);

  // the double door, its side lights and transom, set back in the bay
  const z = -DOOR.depth;
  parts.box(1.8, 2.3, 0.04, C.leafGlass, 0, y0, z + 0.02);
  parts.box(0.62, 2.3, 0.04, C.doorGlass, -1.24, y0, z + 0.02);
  parts.box(0.62, 2.3, 0.04, C.doorGlass, 1.24, y0, z + 0.02);
  parts.box(3.1, 0.65, 0.04, C.doorGlass, 0, y0 + 2.3, z + 0.02);
  const fz = z + 0.06;
  for (const x of [-1.5, -0.92, 0.92, 1.5]) parts.box(0.1, 2.95, 0.1, C.trim, x, y0, fz);
  parts.box(0.08, 2.3, 0.1, C.trim, 0, y0, fz);
  for (const y of [0, 2.25, 2.9]) parts.box(3.1, 0.1, 0.1, C.trim, 0, y0 + y, fz);
  for (const y of [0.8, 1.5]) {
    parts.box(0.58, 0.06, 0.08, C.trim, -1.21, y0 + y, fz);
    parts.box(0.58, 0.06, 0.08, C.trim, 1.21, y0 + y, fz);
  }
  for (const x of [-0.46, 0.46]) {
    parts.box(0.8, 0.25, 0.08, C.trim, x, y0 + 0.05, fz); // kick plates
    parts.box(0.36, 0.26, 0.02, C.white, x, y0 + 1.1, fz + 0.04); // paper signs
  }
  for (const x of [-0.12, 0.12]) parts.box(0.03, 0.45, 0.06, "#c9ccce", x, y0 + 0.95, fz + 0.06);

  parts.addTo(scene);

  // lights are on inside: the door glows warm, and so do the windows with the palest blinds
  for (const [color, glow] of [[C.leafGlass, 0.38], [C.doorGlass, 0.45], [blinds[0], 0.3]]) {
    mat(color).emissive.set("#ffac5c");
    mat(color).emissiveIntensity = glow;
  }
  // and spill out onto the wet sidewalk
  const spill = new THREE.PointLight("#ffbe7a", 8, 11, 2);
  spill.position.set(0, y0 + 2.4, 0.9);
  scene.add(spill);

  // invisible click target over the door: it leads into the ID Studio
  const doorway = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 2.95, 0.1),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  doorway.position.set(0, y0 + 1.475, -DOOR.depth + 0.14); // clear of the handles, so they don't block a click
  doorway.userData.portal = { to: "studio" }; // the card comes from the studio scene
  scene.add(doorway);

  // lamp in the bay ceiling, signs and boxes on the wall
  cyl(scene, 0.13, 0.13, 0.16, 8, C.coping, 0, y0 + DOOR.h - 0.16, -0.35);
  box(scene, 0.32, 0.4, 0.14, "#c4c5c1", -4.05, y0 + 0.75, 0.07);
  box(scene, 0.28, 0.22, 0.02, C.white, -4.7, y0 + 1.05, 0.01);
  // access control right of the door: card reader, push-button post, camera box.
  // Clicking it opens the 3D scan of the ID card you tap on the reader.
  const access = new THREE.Group();
  access.userData.scan = {
    src: "models/access_card.glb",
    title: "Student ID card",
    note: "3D scan of the card you tap on this reader to get in.",
  };
  scene.add(access);
  box(access, 0.09, 0.14, 0.03, C.black, 1.8, y0 + 1.22, 0.015); // card reader
  box(access, 0.13, 0.06, 0.02, "#2f5fb3", 1.8, y0 + 1.1, 0.01); // "activate switch" label
  box(access, 0.13, 1.08, 0.1, C.white, 1.8, y0, 0.05); // accessible push-button post
  box(access, 0.04, 0.06, 0.004, "#2f5fb3", 1.8, y0 + 0.55, 0.101); // wheelchair sign
  box(access, 0.12, 0.16, 0.1, C.black, 1.8, y0 + 1.95, 0.05); // camera box
}

/* ==================================================================
   STREET: trees, cars
================================================================== */

// rusty-leaved street tree: trunk, two limbs, a few chunky blobs
function bigTree(x, z, s = 1) {
  const g = place(layers.trees, x, z, rand() * 360, WALK.height);
  cyl(g, 0.12 * s, 0.17 * s, 2.7 * s, 6, C.trunk, 0, 0, 0);
  bar(g, [0, 2.3 * s, 0], [0.8 * s, 3.7 * s, 0.2 * s], 0.14 * s, C.trunk);
  bar(g, [0, 2.5 * s, 0], [-0.7 * s, 3.9 * s, -0.3 * s], 0.13 * s, C.trunk);
  const blobs = [
    [0, 4.6, 0, 2.1, C.leafA],
    [1.3, 4.1, 0.5, 1.5, C.leafB],
    [-1.2, 4.2, -0.4, 1.6, C.leafC],
    [0.2, 5.7, -0.2, 1.4, C.leafB],
  ];
  for (const [bx, by, bz, r, color] of blobs) {
    const blob = addMesh(g, new THREE.IcosahedronGeometry(r * s, 0), mat(color), bx * s, by * s, bz * s);
    blob.rotation.set(rand() * 3, rand() * 3, 0);
  }
  box(scene, 1.3, 0.02, 1.3, C.mulch, x, WALK.height, z);
}

function wheels(g, len, wid, r = 0.33) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = addMesh(g, new THREE.CylinderGeometry(r, r, 0.24, 8), mat(C.tyre), sx * (len / 2 - 0.85), r, sz * (wid / 2 - 0.08));
      wheel.rotation.x = Math.PI / 2;
    }
  }
}

function tailLights(g, len, wid, y) {
  for (const sz of [-1, 1]) box(g, 0.04, 0.12, 0.32, "#b3262b", -len / 2 - 0.02, y, sz * (wid / 2 - 0.25));
}

// parked nose-in toward the building; local +x is the front of the car
const CARS = {
  sedan: { len: 4.7, wid: 1.82, body: 0.62, cab: 2.6, cabTop: 1.5, cabH: 0.5, at: -0.25, slant: -0.15 },
  hatch: { len: 4.1, wid: 1.78, body: 0.66, cab: 2.5, cabTop: 1.8, cabH: 0.55, at: -0.35, slant: -0.25 },
  suv: { len: 4.8, wid: 1.9, body: 0.8, cab: 3.1, cabTop: 2.6, cabH: 0.62, at: -0.4, slant: -0.15 },
};

function car(x, type, color, skew = 0) {
  const s = CARS[type];
  const g = place(layers.cars, x, WALK.depth + 0.45 + s.len / 2, 90 + skew);
  box(g, s.len, s.body, s.wid, color, 0, 0.3, 0);
  taperedBox(g, s.cab, s.cabH, s.wid - 0.1, s.cabTop, s.wid - 0.35, C.carGlass, s.at, 0.3 + s.body, 0, s.slant);
  box(g, s.cabTop - 0.1, 0.05, s.wid - 0.4, color, s.at + s.slant, 0.3 + s.body + s.cabH, 0);
  wheels(g, s.len, s.wid);
  tailLights(g, s.len, s.wid, 0.3 + s.body - 0.25);
}

// white work trucks with green ladder racks; "utility" has the tall tool body
function workTruck(x, utility, skew = 0) {
  const len = utility ? 6.4 : 5.8;
  const wid = 2.0;
  const g = place(layers.cars, x, WALK.depth + 0.45 + len / 2, 90 + skew);
  const cabX = len / 2 - 1.6;
  box(g, len, 0.75, wid, C.white, 0, 0.4, 0);
  taperedBox(g, 1.9, 0.62, wid - 0.1, 1.5, wid - 0.3, C.carGlass, cabX, 1.15, 0, -0.15);
  box(g, 1.4, 0.06, wid - 0.35, C.white, cabX - 0.15, 1.77, 0);
  const bedLen = len - 2.8;
  const bedX = -len / 2 + bedLen / 2;
  if (utility) {
    box(g, bedLen, 0.95, wid + 0.1, C.white, bedX, 1.15, 0);
  } else {
    box(g, bedLen - 0.1, 0.02, wid - 0.2, "#3b3d40", bedX, 1.15, 0);
  }
  // ladder rack: hoops over the bed, rails reaching over the cab
  const rackTop = utility ? 2.45 : 2.1;
  const bedTop = utility ? 2.1 : 1.15;
  for (const rx of [bedX - bedLen / 2 + 0.2, bedX + bedLen / 2 - 0.2]) {
    for (const sz of [-1, 1]) bar(g, [rx, bedTop, sz * (wid / 2 - 0.05)], [rx, rackTop, sz * (wid / 2 - 0.05)], 0.07, C.rack);
    bar(g, [rx, rackTop, -wid / 2], [rx, rackTop, wid / 2], 0.07, C.rack);
  }
  for (const sz of [-1, 1]) {
    bar(g, [bedX - bedLen / 2 + 0.2, rackTop, sz * (wid / 2 - 0.05)], [cabX + 0.6, rackTop, sz * (wid / 2 - 0.05)], 0.07, C.rack);
  }
  wheels(g, len, wid, 0.38);
  tailLights(g, len, wid, 0.85);
}

function buildStreet() {
  // positions measured off the drone photo
  for (const x of [-31, -23.4, -15.5, -7.6, 10.8, 18.6, 26.4]) {
    bigTree(x, 2.75, 0.9 + rand() * 0.25);
  }

  // street sign
  cyl(scene, 0.03, 0.03, 2.6, 5, "#8b8f92", -9.3, WALK.height, 3.25);
  box(scene, 0.32, 0.45, 0.02, C.white, -9.3, 2.2, 3.25);

  // cars along the curb, left to right as in the drone photo
  car(-27.7, "sedan", "#b9bcc0");
  car(-25, "sedan", "#1f2328");
  car(-22.3, "sedan", "#e9ebeb", 3);
  car(-19.6, "sedan", "#a4a8ad");
  car(-14.7, "suv", "#33353a");
  car(-11.9, "sedan", "#b3232b");
  car(-9.2, "hatch", "#4a4e54");
  workTruck(-6.3, true, -6);
  workTruck(3.3, false);
  car(6.15, "hatch", "#eef0ef");
  car(8.5, "sedan", "#16181b");
  car(10.9, "sedan", "#b8bcc0");
  car(13.7, "sedan", "#9da2a8");
  car(16.1, "sedan", "#283255");
  car(18.7, "suv", "#e8eaea");
  car(21.3, "hatch", "#3d6fb0");
  car(23.9, "sedan", "#c3c6ca");
  car(26.5, "suv", "#f0f1f0");
  car(29.1, "sedan", "#2a2c30");

  // someone heading for the door
  standingPerson(layers.people, -1.3, 1.1, 35, "#2a2d33", "#3a3f4a").position.y = WALK.height;

  buildCamp();
}

/* ==================================================================
   CAMP: tents and a few people at the far side of the lot
================================================================== */

// low dome tent: a squashed few-sided half sphere with a dark door flap
function domeTent(x, z, turn, color, size = 1) {
  const g = place(layers.camp, x, z, turn);
  const geo = new THREE.SphereGeometry(1.1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = addMesh(g, geo, mat(color), 0, 0, 0);
  dome.scale.set(size, 0.95 * size, 0.8 * size);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.38 * size, 5, 0, Math.PI), mat("#2b2a28", { side: THREE.DoubleSide }));
  door.position.set(0, 0.02, 0.87 * size);
  g.add(door);
  // poles crossing over the top
  bar(g, [-1.0 * size, 0, 0], [0, 1.05 * size, 0], 0.025, "#3a3a3a");
  bar(g, [0, 1.05 * size, 0], [1.0 * size, 0, 0], 0.025, "#3a3a3a");
  return g;
}

// tarp strung over a rope between two poles, pinned to the ground on one side
function leanTo(x, z, turn, color) {
  const g = place(layers.camp, x, z, turn);
  bar(g, [-1.4, 0, 0], [-1.4, 1.5, 0], 0.05, "#5b4a3c");
  bar(g, [1.4, 0, 0], [1.4, 1.5, 0], 0.05, "#5b4a3c");
  const tarp = box(g, 2.9, 0.02, 1.9, color, 0, 0, 0);
  tarp.position.set(0, 0.8, 0.75);
  tarp.rotation.x = 0.9;
  box(g, 1.6, 0.12, 0.8, "#6c6f78", 0, 0, 0.6); // a mattress underneath
}

// someone sitting on the ground or a crate, knees up
function sittingFigure(x, z, turn, shirt, pants, onCrate = false) {
  const g = place(layers.camp, x, z, turn);
  const seat = onCrate ? 0.4 : 0.05;
  if (onCrate) box(g, 0.45, 0.4, 0.4, "#2f5fb3", 0, 0, -0.05);
  bar(g, [0.1, seat + 0.05, 0], [0.1, seat + 0.35, 0.35], 0.12, pants);
  bar(g, [-0.1, seat + 0.05, 0], [-0.1, seat + 0.35, 0.35], 0.12, pants);
  bar(g, [0.1, seat + 0.35, 0.35], [0.1, 0, 0.5], 0.11, pants);
  bar(g, [-0.1, seat + 0.35, 0.35], [-0.1, 0, 0.5], 0.11, pants);
  cyl(g, 0.17, 0.19, 0.55, 6, shirt, 0, seat, 0);
  addMesh(g, new THREE.IcosahedronGeometry(0.11, 0), mat("#c89577"), 0, seat + 0.7, 0.02);
  addMesh(g, new THREE.IcosahedronGeometry(0.12, 0), mat("#3d3a36"), 0, seat + 0.76, -0.01); // beanie
  return g;
}

function buildCamp() {
  const P = layers.camp;
  // tents in a loose cluster where the lot meets the empty ground
  domeTent(-15.5, 16.6, 10, "#3f6b8e");
  domeTent(-12.4, 17.4, -15, "#6b7a3c", 1.1);
  domeTent(-9.2, 16.2, 20, "#9a4a3b", 0.9);
  domeTent(-5.6, 17.6, -5, "#4a4f57", 1.05);
  leanTo(-18.8, 18.2, 5, "#2f6fb0");
  // belongings: shopping cart, bags, crates, a folding chair
  const cart = place(P, -10.8, 14.3, 30);
  box(cart, 0.9, 0.5, 0.55, "#9aa0a3", 0, 0.45, 0);
  for (const [sx, sz] of [[-0.4, -0.22], [0.4, -0.22], [-0.4, 0.22], [0.4, 0.22]]) {
    bar(cart, [sx, 0.05, sz], [sx * 0.9, 0.45, sz * 0.9], 0.03, "#9aa0a3");
  }
  box(cart, 0.7, 0.35, 0.45, "#2b2b2e", 0, 0.95, 0); // bags piled in it
  for (const [x, z, w, h, c] of [[-14.0, 15.4, 0.6, 0.45, "#1f1f22"], [-13.6, 15.7, 0.5, 0.35, "#5a6b3a"], [-7.6, 15.6, 0.7, 0.5, "#2b3550"], [-4.3, 16.2, 0.5, 0.4, "#7a3b33"], [-17.6, 16.8, 0.8, 0.45, "#3a3a3a"]]) {
    box(P, w, h, w * 0.7, c, x, 0, z);
  }
  box(P, 0.5, 0.35, 0.4, "#2f5fb3", -8.4, 0, 15.2);
  box(P, 0.5, 0.35, 0.4, "#2f5fb3", -8.4, 0.35, 15.2);

  // people
  sittingFigure(-14.6, 15.0, 160, "#4b3b2f", "#2c3038");
  sittingFigure(-11.6, 15.4, 200, "#2e4a3a", "#3a3f4a", true);
  sittingFigure(-18.6, 17.4, 180, "#5d5550", "#2a2d33");
  standingPerson(P, -9.9, 15.0, 150, "#6a2f2f", "#33363d");
  standingPerson(P, -6.4, 15.3, 200, "#3a3a40", "#4d5a6e");
}

/* ==================================================================
   PUDDLES: flat, uneven patches of sky on the lot and the sidewalk
================================================================== */

function buildPuddles() {
  const water = new THREE.MeshBasicMaterial({ color: C.puddle, transparent: true, opacity: 0.34, depthWrite: false });
  const puddle = (x, z, y, r) => {
    const pts = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = r * (0.55 + rand() * 0.6);
      pts.push(new THREE.Vector2(Math.cos(a) * d * 1.5, Math.sin(a) * d));
    }
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)).rotateX(-Math.PI / 2).rotateY(rand() * Math.PI), water);
    mesh.position.set(x, y + 0.012, z);
    mesh.raycast = () => {};
    scene.add(mesh);
  };
  // on the lot, out past the parked cars, and a few in the dips of the sidewalk
  for (let i = 0; i < 18; i++) puddle(SITE.left + 3 + rand() * (SITE.right - SITE.left - 6), 9.5 + rand() * 11, 0, 0.4 + rand() * 0.8);
  for (const x of [-12.5, -3.4, 2.6, 7.2, 15.3]) puddle(x, 1.0 + rand() * 1.6, WALK.height, 0.3 + rand() * 0.35);
}

/* ==================================================================
   RAIN: falling streaks over the whole site, and small splashes on the ground
================================================================== */

const RAIN = { count: 9000, speed: 13, len: 0.6, wind: 0.14, top: 26, splashes: 220 };
let rain = null;

function buildRain() {
  const heads = new Float32Array(RAIN.count * 3);
  const drop = (i, y) => {
    heads[i * 3] = SITE.left + Math.random() * (SITE.right - SITE.left);
    heads[i * 3 + 1] = y;
    heads[i * 3 + 2] = SITE.back + Math.random() * (SITE.front - SITE.back);
  };
  for (let i = 0; i < RAIN.count; i++) drop(i, Math.random() * RAIN.top);

  // each drop is one short line, slanted a little by the wind
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RAIN.count * 6), 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#8d9caa", transparent: true, opacity: 0.55, depthWrite: false }));
  lines.frustumCulled = false;
  lines.raycast = () => {}; // never in the way of a click on the door

  // splashes: flat rings that open out where drops land, reused round-robin
  const splashes = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.05, 0.08, 10).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#d4dde4", transparent: true, opacity: 0.7, depthWrite: false }),
    RAIN.splashes,
  );
  splashes.frustumCulled = false;
  splashes.raycast = () => {};
  const born = new Float32Array(RAIN.splashes).fill(-1);
  const at = new Float32Array(RAIN.splashes * 3);

  layers.rain.add(lines, splashes);
  rain = { heads, drop, geo, splashes, born, at, next: 0, last: 0, m: new THREE.Matrix4() };
}

function stepRain(now) {
  const r = rain;
  if (!layers.rain.visible) return;
  const dt = Math.min((now - (r.last || now)) / 1000, 0.05);
  r.last = now;
  const t = now / 1000;
  const pos = r.geo.attributes.position.array;
  const fall = RAIN.speed * dt;
  for (let i = 0; i < RAIN.count; i++) {
    const k = i * 3;
    r.heads[k] += RAIN.wind * fall;
    r.heads[k + 1] -= fall;
    // ground level: the sidewalk in front of the building is a step up from the lot
    const ground = r.heads[k + 2] < WALK.depth ? WALK.height : 0;
    if (r.heads[k + 1] < ground) {
      if (Math.random() < 0.15) {
        const s = r.next;
        r.next = (r.next + 1) % RAIN.splashes;
        r.born[s] = t;
        r.at.set([r.heads[k], ground + 0.01, r.heads[k + 2]], s * 3);
      }
      r.drop(i, RAIN.top - Math.random() * 2);
    }
    const j = i * 6;
    pos[j] = r.heads[k];
    pos[j + 1] = r.heads[k + 1];
    pos[j + 2] = r.heads[k + 2];
    pos[j + 3] = r.heads[k] - RAIN.wind * RAIN.len;
    pos[j + 4] = r.heads[k + 1] + RAIN.len;
    pos[j + 5] = r.heads[k + 2];
  }
  r.geo.attributes.position.needsUpdate = true;

  for (let s = 0; s < RAIN.splashes; s++) {
    const age = (t - r.born[s]) / 0.35;
    const size = r.born[s] >= 0 && age < 1 ? 0.6 + age * 2.2 : 0;
    r.m.makeScale(size, 1, size).setPosition(r.at[s * 3], r.at[s * 3 + 1], r.at[s * 3 + 2]);
    r.splashes.setMatrixAt(s, r.m);
  }
  r.splashes.instanceMatrix.needsUpdate = true;
}

// overcast, for the rain: most of the light comes evenly from a grey sky,
// with a weak, cool key from high above, so shadows are soft and faint
function buildLights() {
  scene.add(new THREE.HemisphereLight("#d3dbe3", "#6f757b", 2.25));

  const sun = new THREE.DirectionalLight("#dfe7ef", 0.65);
  sun.position.set(12, 50, 18);
  sun.target.position.set(0, 0, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight("#cfd9e4", 0.4);
  fill.position.set(-10, 15, 30);
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

const DRONE = [5.54, 16.06, 28.49];
const STREET = [-0.5, 1.5, 7];

export default {
  title: "Old Gate",
  // title card shown before the scene opens
  card: { number: "Scene One", title: "Old Gate", line: "The small side entrance, off the parking lot." },
  intro: "drone",
  layers: [
    { key: "cars", label: "Cars" },
    { key: "trees", label: "Trees" },
    { key: "people", label: "People" },
    { key: "camp", label: "Tents" },
    { key: "roof", label: "Roof gear" },
    { key: "rain", label: "Rain" },
  ],
  // the sound of rain plays while this scene is on screen and its Rain layer is shown
  ambience: { sound: "rain", layer: "rain" },
  // a rainy day: a grey-blue sky, the far end of the building lost in the rain
  mood: {
    sky: { top: "#7d8a97", horizon: "#c0c9d0", ground: "#aab3ba" },
    fog: { color: "#bac3ca", near: 14, far: 130, ref: 45 },
    grade: { tint: "#f3f7ff", saturation: 0.8, grain: 0.08, vignette: 0.38, ink: "#1d2530", line: 0.9 },
  },
  views: {
    // DJI drone camera: 24 mm equiv., 16:9 photos
    drone: { label: "Drone", pos: DRONE, target: aim(DRONE, -10.6, 26.7), photo: { fov: 43, aspect: 16 / 9, name: "DJI_0007", src: "photos/old_gate.jpg" } },
    // iPhone 16 Pro main camera: 24 mm equiv., 4:3 photos
    street: { label: "Street", pos: STREET, target: aim(STREET, 0, 5.4), photo: { fov: 56.8, aspect: 4 / 3, name: "IMG_4594", src: "photos/old_gate_street.jpg" } },
    overview: { label: "Overview", pos: [-28, 24, 36], target: [0, 2, 0], fov: 45 },
    plan: { label: "Plan", pos: [0, 80, -1.99], target: [0, 0, -2], fov: 45 },
  },

  build() {
    reseed(7);
    scene = new THREE.Scene();
    layers = makeLayers(scene, this.layers);
    buildLights();
    buildGround();
    buildBuilding();
    buildStreet();
    buildPuddles();
    buildRain();
    return scene;
  },

  // called every frame
  update(camera, now) {
    stepRain(now);
  },
};
