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
  dissolvable,
  shatterable,
} from "./lowpoly.js";

/* ------------------------------------------------------------------
   Scene 3: Main Gate & Courtyard
   Rebuilt from measurements. The three drone orbits (1.mp4, 2.mp4,
   3.mp4 in Space Media/Main Gate and Courtyard, 172 frames) were
   solved together with structure-from-motion. The solve was levelled
   on the courtyard paving and the buildings' vertical lines, squared
   to their walls, and scaled with the facade doors (7 ft) and a person
   on the paving. The two phone photos were placed with hand-matched
   landmarks.

   Units are metres. The courtyard floor is y = 0. x runs across the
   courtyard (+x from the CCA facade toward the raised plaza), z runs
   along it (-z toward the main gate and the street, +z toward the
   bleachers and the bridge).
------------------------------------------------------------------- */

const C = {
  paving: "#b4b6b5",
  plaza: "#d3d4d0",
  darkPaving: "#74787d",
  base: "#4f4a43",
  white: "#eeeeea",
  roof: "#a9a79f",
  trim: "#b13f37",
  glass: "#6c8794",
  teal: "#2aa7a3",
  black: "#26272a",
  concrete: "#c9c6bf",
  wood: "#c99a62",
  bleacher: "#6b5644",
  slat: "#a9673d",
  timberGlass: "#3b4a50",
  siding: "#6e6560",
  darkGlass: "#2d3640",
  asphalt: "#4b4c4f",
  trunk: "#5b4a3c",
  grassA: "#5f7a45",
  grassB: "#7a8f4e",
  grassC: "#4f6a3f",
  grassD: "#8d9a5a",
  lawn: "#7d9550",
  leaf: "#7f9a4c",
  hedge: "#405a35",
  sign: "#e0604a",
  flag: "#c2307a",
  carGlass: "#2b333b",
  tyre: "#1f1f21",
};

// ---------- measured layout (m) ----------
const COURT = { x0: -11.2, x1: 12.3, z0: -26, z1: 34.9 }; // facade, plaza wall, fence, bridge
const CCA = { x: -11.2, back: -40, z0: -25, z1: 34.9, ridgeZ: 2, ridge: 10.3, end0: 8.4, end1: 8.0 };
const PLAZA = { x0: 12.3, x1: 40, z0: -11.6, z1: 34.9, y: 4.6 };
const TIMBER = { x0: 9.5, x1: 30, z0: -30, z1: -11.6, floors: [0, 4.6, 8.0, 11.4, 14.8, 18.3] };
const BRIDGE = { z0: 34.9, z1: 43, y: 4.6 };
const BLEACH = { z0: 22.6, z1: 34.9, tiers: 10, stair: 1.5 };
// the bleachers' courtyard edge runs on a diagonal, through (2.0, 24.5) and (5.8, 34)
const bleachWest = (z) => 2.0 + ((z - 24.5) * 3.8) / 9.5;
const WALK = { x1: -5.6, z0: -3, top: 0.5 }; // raised walk along the CCA facade, with 3 steps
const BED = { x0: -1.48, x1: 4.6, z0: -2.29, z1: 8.07 };
const SITE = { x0: -42, x1: 42, z0: -64, z1: 66 };
const GATE = { x0: 2.5, x1: 5.3 }; // the walk-through gate in the fence, between two posts

let scene;
let layers; // groups the panel can show or hide

// top of the CCA facade at z: it peaks over the entrance and falls to both ends
function ccaTop(z) {
  return z < CCA.ridgeZ
    ? CCA.end0 + ((CCA.ridge - CCA.end0) * (z - CCA.z0)) / (CCA.ridgeZ - CCA.z0)
    : CCA.ridge + ((CCA.end1 - CCA.ridge) * (z - CCA.ridgeZ)) / (CCA.z1 - CCA.ridgeZ);
}

/* ==================================================================
   GROUND
================================================================== */

function buildGround() {
  const w = SITE.x1 - SITE.x0;
  box(scene, w, 0.4, SITE.z1 - SITE.z0, C.base, (SITE.x0 + SITE.x1) / 2, -0.41, (SITE.z0 + SITE.z1) / 2);

  // courtyard paving, from the gate to the bridge
  const cw = COURT.x1 - COURT.x0;
  facetedGround(scene, cw, COURT.z1 - COURT.z0, C.paving, (COURT.x0 + COURT.x1) / 2, (COURT.z0 + COURT.z1) / 2, 2, 0.08);

  // beyond the gate: sidewalk, street, far sidewalk
  box(scene, w, 0.12, 3, C.concrete, (SITE.x0 + SITE.x1) / 2, 0, COURT.z0 - 1.5);
  box(scene, w, 0.02, 12, C.asphalt, (SITE.x0 + SITE.x1) / 2, 0, COURT.z0 - 9);
  box(scene, w, 0.12, 3, C.concrete, (SITE.x0 + SITE.x1) / 2, 0, COURT.z0 - 16.5);
  // past the bridge and the plaza's edge: sidewalk, then the street where the drone saw parked cars
  box(scene, w, 0.12, 3, C.concrete, (SITE.x0 + SITE.x1) / 2, 0, BRIDGE.z1 + 1.5);
  box(scene, w, 0.02, 12, C.asphalt, (SITE.x0 + SITE.x1) / 2, 0, BRIDGE.z1 + 9);

  // the raised walk along the CCA facade and its three steps down to the courtyard
  const wz = COURT.z1 - WALK.z0;
  const mid = (WALK.z0 + COURT.z1) / 2;
  box(scene, WALK.x1 - COURT.x0, WALK.top, wz, C.darkPaving, (COURT.x0 + WALK.x1) / 2, 0, mid);
  for (let i = 0; i < 3; i++) {
    box(scene, 0.5, WALK.top * (1 - (i + 1) / 4), wz, C.darkPaving, WALK.x1 + 0.25 + i * 0.5, 0, mid);
  }
}

/* ==================================================================
   BUILDINGS
================================================================== */

// "CCA" and "California College of the Arts" on the glass, drawn on a canvas
// that covers the facade from z = -20 (left of the canvas) to z = 15
function graphicsTexture() {
  const cv = document.createElement("canvas");
  cv.width = 4096;
  cv.height = 740;
  const g = cv.getContext("2d");
  const px = (z) => ((15 - z) / 35) * cv.width; // facade z -> canvas x (viewed from the courtyard)
  g.fillStyle = C.teal;
  g.font = "bold 700px Arial, Helvetica, sans-serif";
  g.textBaseline = "alphabetic";
  g.fillText("CCA", px(14.1), 690);
  g.fillStyle = "#ffffff";
  g.font = "bold 165px Arial, Helvetica, sans-serif";
  g.fillText("California College of the Arts", px(0.6), 270);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// the CCA building: a long gabled block whose courtyard facade is red-framed glass
function buildCCA() {
  // the building's section in the z-y plane, extruded along x
  const profile = new THREE.Shape([
    new THREE.Vector2(CCA.z0, 0),
    new THREE.Vector2(CCA.z1, 0),
    new THREE.Vector2(CCA.z1, CCA.end1),
    new THREE.Vector2(CCA.ridgeZ, CCA.ridge),
    new THREE.Vector2(CCA.z0, CCA.end0),
  ]);
  const geo = new THREE.ExtrudeGeometry(profile, { depth: CCA.x - CCA.back, bevelEnabled: false });
  // shape x -> world z, shape y -> world y, extrusion -> world -x from the facade
  // (a proper rotation, so the faces keep pointing outward)
  geo.applyMatrix4(new THREE.Matrix4().set(0, 0, -1, CCA.x, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  addMesh(scene, geo, mat(C.white), 0, 0, 0);

  // grey roof membrane on the two slopes
  for (const [za, ya, zb, yb] of [[CCA.z0, CCA.end0, CCA.ridgeZ, CCA.ridge], [CCA.ridgeZ, CCA.ridge, CCA.z1, CCA.end1]]) {
    const L = Math.hypot(zb - za, yb - ya);
    const slope = box(scene, CCA.x - CCA.back, 0.06, L, C.roof, (CCA.x + CCA.back) / 2, 0, 0);
    slope.position.set((CCA.x + CCA.back) / 2, (ya + yb) / 2 + 0.02, (za + zb) / 2);
    slope.rotation.x = -Math.asin((yb - ya) / L);
  }
  // roof clutter: skylight rows, HVAC units (on the sloped roof)
  const roof = batch();
  for (let i = 0; i < 3; i++) {
    const x = -16 - i * 7;
    for (let z = CCA.z0 + 4; z < CCA.z1 - 4; z += 9) roof.box(1.6, 0.6, 4.0, "#c3c9ca", x, ccaTop(z) - 0.2, z);
  }
  for (let i = 0; i < 14; i++) {
    const z = CCA.z0 + 2 + rand() * (CCA.z1 - CCA.z0 - 4);
    roof.box(1.6 + rand(), 1.1, 1.2 + rand(), "#b9bcbd", -13 - rand() * 24, ccaTop(z) - 0.1, z);
  }
  roof.addTo(scene, true);

  // the building carries on beside the bridge to the street: plain white wall,
  // with a door onto the bridge deck
  const ez = (CCA.z1 + BRIDGE.z1) / 2;
  box(scene, CCA.x - CCA.back, CCA.end1, BRIDGE.z1 - CCA.z1, C.white, (CCA.x + CCA.back) / 2, 0, ez);
  box(scene, CCA.x - CCA.back, 0.06, BRIDGE.z1 - CCA.z1, C.roof, (CCA.x + CCA.back) / 2, CCA.end1, ez);
  box(scene, 0.06, 2.2, 1.1, "#3a4048", CCA.x + 0.03, BRIDGE.y, BRIDGE.z1 - 2.6);

  // facade: lower windows 0.65-3.0 m, upper glass band 3.6-7.8 m, red mullions
  const fx = CCA.x;
  const len = CCA.z1 - CCA.z0;
  const zc = (CCA.z0 + CCA.z1) / 2;
  addMesh(scene, new THREE.BoxGeometry(0.06, 4.2, len - 0.6), mat(C.glass, { roughness: 0.3 }), fx + 0.03, 5.7, zc);
  const parts = batch();
  for (let z = CCA.z0 + 0.3; z <= CCA.z1 - 0.3; z += 2.2) {
    parts.box(0.1, 4.2, 0.1, C.trim, fx + 0.08, 3.6, z);
    if (z < -11.6 || z > -2) parts.box(0.1, 2.35, 0.1, C.trim, fx + 0.08, 0.65, z);
  }
  for (const y of [3.6, 5.0, 6.4, 7.75]) parts.box(0.1, 0.1, len - 0.6, C.trim, fx + 0.08, y, zc);
  // lower windows, interrupted by the entrance doors between z -11.6 and -2
  for (const [a, b] of [[CCA.z0 + 0.3, -11.6], [-2, CCA.z1 - 0.3]]) {
    parts.box(0.05, 2.35, b - a, C.glass, fx + 0.03, 0.65, (a + b) / 2);
    for (const y of [0.65, 1.8, 2.95]) parts.box(0.1, 0.08, b - a, C.trim, fx + 0.08, y, (a + b) / 2);
  }
  // entrance: aluminium-framed glass doors, 2.13 m high
  parts.box(0.05, 2.6, 9.6, C.glass, fx + 0.03, 0, -6.8);
  for (let z = -11.6; z <= -2; z += 1.2) parts.box(0.1, 2.6, 0.06, "#c3c7c9", fx + 0.08, 0, z);
  parts.box(0.1, 0.08, 9.6, "#c3c7c9", fx + 0.08, 2.13, -6.8);
  parts.addTo(scene);

  // lettering and logo on a transparent sheet just in front of the glass
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(35, 6.3),
    new THREE.MeshBasicMaterial({ map: graphicsTexture(), transparent: true }),
  );
  sheet.rotation.y = Math.PI / 2;
  sheet.position.set(fx + 0.15, 1.5 + 6.3 / 2, -2.5);
  scene.add(sheet);
}

// mass-timber building: wood floors, glass, black steel X-bracing, its corner on the courtyard
function buildTimber() {
  const { x0, x1, z0, z1, floors } = TIMBER;
  const top = floors[floors.length - 1];
  const parts = batch();
  parts.box(x1 - x0 - 1.4, top - 0.4, z1 - z0 - 1.4, C.timberGlass, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  for (const y of floors.slice(1)) {
    parts.box(x1 - x0, 0.3, z1 - z0, C.concrete, (x0 + x1) / 2, y - 0.3, (z0 + z1) / 2);
    parts.box(x1 - x0 - 0.3, 0.25, z1 - z0 - 0.3, C.wood, (x0 + x1) / 2, y - 0.55, (z0 + z1) / 2);
  }
  // columns on the two faces that meet at the courtyard corner (x0, z1)
  for (let x = x0; x <= x1 + 0.01; x += 4.1) parts.box(0.35, top, 0.35, C.black, x, 0, z1);
  for (let z = z1; z >= z0 - 0.01; z -= 4.6) parts.box(0.35, top, 0.35, C.black, x0, 0, z);
  parts.addTo(scene, true);

  // X-braces in every other bay, from the plaza level up
  for (let f = 1; f < floors.length - 1; f++) {
    const y0 = floors[f];
    const y1 = floors[f + 1] - 0.3;
    for (let x = x0; x < x1 - 1; x += 8.2) {
      bar(scene, [x, y0, z1 + 0.2], [x + 4.1, y1, z1 + 0.2], 0.18, C.black);
      bar(scene, [x + 4.1, y0, z1 + 0.2], [x, y1, z1 + 0.2], 0.18, C.black);
    }
    for (let z = z1; z > z0 + 1; z -= 9.2) {
      bar(scene, [x0 - 0.2, y0, z], [x0 - 0.2, y1, z - 4.6], 0.18, C.black);
      bar(scene, [x0 - 0.2, y0, z - 4.6], [x0 - 0.2, y1, z], 0.18, C.black);
    }
  }
  // balcony rail at the plaza level, along the courtyard face
  box(scene, 0.06, 1.0, z1 - z0, C.black, x0 - 0.3, floors[1], (z0 + z1) / 2);
}

// the raised plaza east of the courtyard: concrete wall, railing, lawn, patterned paving
function buildPlaza() {
  const { x0, x1, z0, z1, y } = PLAZA;
  box(scene, x1 - x0, y, z1 - z0, C.concrete, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  // the building under the plaza fronts the courtyard: board-formed concrete, dark windows, doors
  const front = batch();
  // (they stop short of the bleachers, which stand against the wall's last stretch)
  for (let z = z0 + 3; z < BLEACH.z0 - 6; z += 7) {
    front.box(0.05, 2.4, 3.6, C.darkGlass, x0 - 0.03, 0.4, z + 1.8);
    front.box(0.06, 0.12, 3.8, "#8f9396", x0 - 0.04, 2.8, z + 1.8);
  }
  front.box(0.05, 2.4, 2.4, C.darkGlass, x0 - 0.03, 0.4, 20.4);
  front.box(0.06, 0.12, 2.6, "#8f9396", x0 - 0.04, 2.8, 20.4);
  for (const z of [-4.2, 9.8, 17.6]) front.box(0.05, 2.5, 1.8, "#3a4048", x0 - 0.035, 0, z);
  front.addTo(scene);
  facetedGround(scene, x1 - x0, z1 - z0, C.plaza, (x0 + x1) / 2, (z0 + z1) / 2, 3, 0.05).position.y = y + 0.005;
  // triangle pattern in the paving
  const lines = batch();
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  for (let a = 0; a < 3; a++) {
    const ang = (a * Math.PI) / 3;
    const dx = Math.cos(ang);
    const dz = -Math.sin(ang);
    for (let k = -14; k <= 14; k++) {
      // a line through this offset point, clipped to the plaza (Liang-Barsky)
      const ox = cx - dz * k * 3.5;
      const oz = cz + dx * k * 3.5;
      let t0 = -100;
      let t1 = 100;
      for (const [d, lo, hi, o] of [[dx, x0, x1, ox], [dz, z0, z1, oz]]) {
        if (Math.abs(d) < 1e-9) {
          if (o < lo || o > hi) t0 = t1;
          continue;
        }
        const a0 = (lo - o) / d;
        const a1 = (hi - o) / d;
        t0 = Math.max(t0, Math.min(a0, a1));
        t1 = Math.min(t1, Math.max(a0, a1));
      }
      if (t1 - t0 < 0.5) continue;
      const geo = new THREE.BoxGeometry(t1 - t0, 0.01, 0.08);
      geo.rotateY(ang);
      const tm = (t0 + t1) / 2;
      geo.translate(ox + dx * tm, y + 0.012, oz + dz * tm);
      lines.add(geo, "#a9aaa6");
    }
  }
  lines.addTo(scene);
  // the planted lawn, half a metre up
  box(layers.plants, 13.5, 0.5, 21.5, C.lawn, 22.25, y, 24);

  // railing along the courtyard edge: steel panels between concrete blocks,
  // then a solid concrete parapet above the bleachers
  const rail = batch();
  let railEnd = z0 + 0.5;
  for (; railEnd < BLEACH.z0 - 2; railEnd += 2.0) {
    rail.box(0.05, 1.0, 0.05, "#9aa0a3", x0 + 0.15, y, railEnd);
    rail.box(0.04, 0.04, 2.0, "#9aa0a3", x0 + 0.15, y + 1.0, railEnd + 1.0);
  }
  for (let z = z0 + 4; z < railEnd; z += 9) rail.box(0.5, 1.0, 1.4, C.concrete, x0 + 0.25, y, z);
  rail.box(0.3, 1.0, z1 - railEnd, C.concrete, x0 + 0.15, y, (railEnd + z1) / 2);
  rail.addTo(scene, true);

  // banners standing on the plaza
  for (const [x, z] of [[18, -4], [24, -4], [30, -4], [36, -4]]) flag(x, y, z);
}

// teardrop banner on a pole
function flag(x, y, z) {
  cyl(layers.people, 0.025, 0.025, 3.2, 5, "#9aa0a3", x, y, z);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.55, 1.2, 0.05, 2.6);
  shape.lineTo(0, 2.6);
  const banner = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(C.flag, { side: THREE.DoubleSide }));
  banner.position.set(x, y + 0.5, z);
  layers.people.add(banner);
}

// the bridge across the +z end, deck level with the plaza, a passage underneath
function buildBridge() {
  const { z0, z1, y } = BRIDGE;
  const x0 = COURT.x0;
  const x1 = COURT.x1;
  box(scene, x1 - x0, 0.6, z1 - z0, C.concrete, (x0 + x1) / 2, y - 0.6, (z0 + z1) / 2);
  facetedGround(scene, x1 - x0, z1 - z0, C.plaza, (x0 + x1) / 2, (z0 + z1) / 2, 3, 0.05).position.y = y + 0.005;
  for (let x = x0 + 3; x < x1; x += 6) box(scene, 0.5, y - 0.6, 0.5, C.concrete, x, 0, z0 + 0.6);
  // parapet on the courtyard side, up to where the bleachers' stair arrives
  const stairTop = bleachWest(BLEACH.z1);
  box(scene, stairTop - x0, 1.0, 0.25, C.concrete, (x0 + stairTop) / 2, y, z0 + 0.15);
  box(scene, 2.6, 0.9, 0.05, C.trim, 1.5, y - 1.5, z0 - 0.03); // red sign on the fascia
  // dark back wall of the passage; across the street, a low building
  box(scene, x1 - x0, y - 0.6, 0.3, "#3d3f43", (x0 + x1) / 2, 0, z1 - 1);
  box(layers.neighbours, 50, 6.5, 7.5, "#3f4145", -4, 0, z1 + 19.25);
  box(layers.neighbours, 50, 0.4, 7.7, C.trim, -4, 5.0, z1 + 19.25);
}

// black lamp post
function lamp(x, y, z) {
  cyl(scene, 0.05, 0.07, 4.4, 5, C.black, x, y, z);
  box(scene, 0.16, 0.34, 0.16, C.black, x + 0.18, y + 3.9, z);
}

// the plaza carries on beside the bridge to the street: a walk past the lawn,
// a planted strip, and concrete slabs standing along the edge above the sidewalk.
// (Built last: its paving and grass use rand(), and nothing after it should change.)
function buildStreetEdge() {
  const { x0, x1, y } = PLAZA;
  const { z0, z1 } = BRIDGE;
  box(scene, x1 - x0, y, z1 - z0, C.concrete, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  facetedGround(scene, x1 - x0, z1 - z0, C.plaza, (x0 + x1) / 2, (z0 + z1) / 2, 3, 0.05).position.y = y + 0.005;
  plantedBed(x0 + 1.2, x1 - 2, z1 - 2.8, z1 - 0.6, 240, y);
  const slabs = batch();
  for (let x = COURT.x0 + 0.2; x < x1 - 2.4; x += 2.8) slabs.box(2.4, 1.3, 0.3, C.concrete, x + 1.2, y, z1 - 0.15);
  slabs.addTo(scene, true);
  for (const [x, z] of [[x0 + 1.2, 25.5], [x0 + 1.2, 33.8], [24, z1 - 3.2]]) lamp(x, y, z);
}

// a flat-topped block standing on the floor, from its outline on the ground: [[x, z], ...]
function prism(points, h) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: h, bevelEnabled: false });
  return geo.rotateX(-Math.PI / 2);
}

// the bleachers in the corner between the plaza wall and the bridge: wooden tiers
// against the wall, and on their courtyard side a stair with a landing halfway,
// closed in below by a face of wooden slats
function buildBleachers() {
  const { z0, z1, tiers, stair } = BLEACH;
  const wall = COURT.x1;
  const top = BRIDGE.y;
  const parts = batch();
  for (let k = 0; k < tiers; k++) {
    const zf = z0 + (k * (z1 - z0)) / tiers;
    parts.add(prism([[bleachWest(zf) + stair, zf], [wall, zf], [wall, z1], [bleachWest(z1) + stair, z1]], (top * (k + 1)) / tiers), C.bleacher);
  }
  // the stair: two flights of ten risers with a landing between them
  const n = 20;
  const landing = 1.5;
  const tread = (z1 - z0 - landing) / n;
  const start = (i) => z0 + i * tread + (i > n / 2 ? landing : 0); // where step i begins (i = n: the top)
  for (let i = 0; i < n; i++) {
    const a = start(i);
    const b = start(i + 1);
    parts.add(prism([[bleachWest(a), a], [bleachWest(a) + stair, a], [bleachWest(b) + stair, b], [bleachWest(b), b]], (top * (i + 1)) / n), C.darkPaving);
  }
  // slats standing along the stair's outer face
  const turn = Math.atan2(3.8, 9.5);
  for (let i = 1; i < n; i++) {
    const h = (top * (i + 1)) / n - 0.06;
    for (let z = start(i) + 0.13; z < start(i + 1); z += 0.27) {
      const slat = new THREE.BoxGeometry(0.04, h, 0.19).rotateY(turn);
      parts.add(slat.translate(bleachWest(z) - 0.03, h / 2, z), C.slat);
    }
  }
  parts.addTo(scene, true);
  // a handrail each side: up the first flight, along the landing, up the second
  const mid = start(n / 2);
  const run = [[z0, top * 0.05], [mid, top * 0.55], [mid + landing + tread, top * 0.55], [z1, top]].map(([z, y]) => [z, y + 1.0]);
  for (const dx of [0.05, stair - 0.05]) {
    const pts = run.map(([z, y]) => [bleachWest(z) + dx, y, z]);
    for (let i = 0; i < 3; i++) bar(scene, pts[i], pts[i + 1], 0.05, C.black);
    for (const [x, y, z] of pts) bar(scene, [x, y - 1.0, z], [x, y, z], 0.05, C.black);
  }
}

// a plain block with bands of windows, for the neighbours
function block(parent, x0, x1, z0, z1, floors, floorH, wall, glass) {
  const parts = batch();
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  parts.box(x1 - x0, floors * floorH, z1 - z0, wall, cx, 0, cz);
  parts.box(x1 - x0 + 0.2, floorH * 0.8, z1 - z0 + 0.2, glass, cx, 0, cz);
  for (let f = 1; f < floors; f++) parts.box(x1 - x0 + 0.1, floorH * 0.45, z1 - z0 + 0.1, glass, cx, f * floorH + floorH * 0.3, cz);
  parts.addTo(parent, true);
}

// buildings across the street past the gate (seen in the phone photos, not measured)
function buildNeighbours() {
  const N = layers.neighbours;
  block(N, -6, 22, -60, -46, 5, 3.9, C.siding, C.darkGlass);
  box(N, 28.2, 1.4, 14.2, "#d8d8d4", 8, 19.5, -53);
  box(N, 3.4, 22, 4.5, C.darkGlass, -8, 0, -47); // glass stair tower
  block(N, -30, -9.5, -62, -46, 4, 3.6, "#dcdcd6", "#5d6870");
}

/* ==================================================================
   COURTYARD: bed, trees, hedge, fence, signs
================================================================== */

// a raised bed packed with grass tufts, standing on the floor or (y) on the plaza
function plantedBed(x0, x1, z0, z1, tufts, y = 0) {
  box(layers.plants, x1 - x0, 0.4, z1 - z0, "#4a5a3a", (x0 + x1) / 2, y, (z0 + z1) / 2);
  const grass = batch();
  const colors = [C.grassA, C.grassB, C.grassC, C.grassD];
  for (let i = 0; i < tufts; i++) {
    const x = x0 + 0.2 + rand() * (x1 - x0 - 0.4);
    const z = z0 + 0.2 + rand() * (z1 - z0 - 0.4);
    const h = 0.35 + rand() * 0.45;
    const tuft = new THREE.ConeGeometry(0.25 + rand() * 0.15, h, 5);
    tuft.rotateY(rand() * Math.PI);
    tuft.translate(x, y + 0.4 + h / 2, z);
    grass.add(tuft, colors[Math.floor(rand() * colors.length)]);
  }
  grass.addTo(layers.plants);
}

// young tree: thin trunk, a few leafy blobs; s scales it (s = 1 is about 4 m tall)
function tree(x, z, s = 1, y = 0) {
  const g = place(layers.plants, x, z, rand() * 360, y);
  cyl(g, 0.05 * s, 0.08 * s, 2.4 * s, 5, C.trunk, 0, 0, 0);
  for (const [bx, by, bz, r] of [[0, 2.9, 0, 0.85], [0.55, 2.5, 0.2, 0.55], [-0.45, 2.6, -0.3, 0.6], [0.1, 3.5, 0.1, 0.55]]) {
    const blob = addMesh(g, new THREE.IcosahedronGeometry(r * s, 0), mat(rand() < 0.5 ? C.leaf : "#6d8a42"), bx * s, by * s, bz * s);
    blob.rotation.set(rand() * 3, rand() * 3, 0);
  }
}

function buildCourtyard() {
  // the planted bed in the middle and its tree (top measured at 4.95 m)
  plantedBed(BED.x0, BED.x1, BED.z0, BED.z1, 420);
  tree(1.0, 2.9, 1.3, 0.4);
  blocked(BED.x0, BED.x1, BED.z0, BED.z1);

  // low shrub planters at the foot of the CCA facade
  for (const [z0, z1] of [[13, 21], [-14, -6]]) box(layers.plants, 2.0, 0.8, z1 - z0, C.hedge, CCA.x + 1.4, WALK.top, (z0 + z1) / 2);
  box(layers.plants, 2.0, 0.8, 8, C.hedge, CCA.x + 1.4, 0, -17);
  blocked(CCA.x + 0.4, CCA.x + 2.4, -21, -13);

  // hedge planter at the end of the courtyard, then a row of young trees before the fence
  box(layers.plants, 4.9, 1.1, 1.8, C.hedge, 2.3, 0, -13);
  blocked(2.3 - 2.45, 2.3 + 2.45, -13.9, -12.1);
  for (const x of [-7.5, -3, 1.5, 5.8, 9.0]) {
    tree(x, -21.5, 1.0);
    blocked(x - 0.15, x + 0.15, -21.65, -21.35);
  }

  // the main gate: black picket fence across the courtyard end, taller posts,
  // and a gap for the walk-through gate (built in buildGate)
  const fence = batch();
  const fx0 = COURT.x0;
  const fx1 = TIMBER.x0;
  for (let x = fx0; x <= fx1; x += 0.2) {
    if (x > GATE.x0 - 0.1 && x < GATE.x1 + 0.1) continue;
    fence.box(0.03, 2.4, 0.03, C.black, x, 0, COURT.z0);
  }
  for (const y of [0.1, 2.3]) {
    for (const [a, b] of [[fx0, GATE.x0], [GATE.x1, fx1]]) fence.box(b - a, 0.06, 0.06, C.black, (a + b) / 2, y, COURT.z0);
  }
  for (const x of [fx0, -3.5, fx1]) fence.box(0.2, 3.0, 0.2, C.black, x, 0, COURT.z0);
  fence.addTo(scene, true);
  buildGate();

  // red A-frame sign on the paving
  const sign = place(scene, 3.4, 12.3, 0);
  blocked(3.05, 3.75, 12.0, 12.6);
  for (const s of [-1, 1]) {
    const leaf = box(sign, 0.62, 0.95, 0.03, C.sign, 0, 0, s * 0.17);
    leaf.rotation.x = s * 0.18;
  }
  // banners in front of the plaza wall
  for (const z of [2.5, 4.0, 5.5]) flag(10.3, 0, z);
  blocked(10.2, 10.9, 2.4, 5.6);

  // people
  standingPerson(layers.people, -3.5, 19, 200, "#2c3a52", "#c9b79b");
  standingPerson(layers.people, -2.8, -9, 30, "#3d4a37", "#202226");
  blocked(-3.75, -3.25, 18.75, 19.25);
  blocked(-3.05, -2.55, -9.25, -8.75);
  standingPerson(layers.people, 22, 0, 120, "#6a2f2f", "#33363d").position.y = PLAZA.y;
}

/* ==================================================================
   THE GATE AND THE WALKER
   A small caped figure stands in the courtyard. Click the paving and
   it walks there, around the planters; click the gate (or the street
   beyond it) and it walks out, which ends the visit.
================================================================== */

let gateLeaves = []; // { pivot, side }: hinged on the posts, swinging out toward the street
let gateAngle = 0;

function buildGate() {
  const z = COURT.z0;
  const mid = (GATE.x0 + GATE.x1) / 2;
  const g = new THREE.Group();
  g.userData.action = "leave"; // clicking any part of it walks out
  scene.add(g);

  // two square posts with pyramid caps, and a bar across the top
  for (const x of [GATE.x0, GATE.x1]) {
    box(g, 0.26, 3.2, 0.26, C.black, x, 0, z);
    box(g, 0.36, 0.08, 0.36, C.black, x, 3.2, z);
    const cap = addMesh(g, new THREE.ConeGeometry(0.22, 0.32, 4), mat(C.black), x, 3.44, z);
    cap.rotation.y = Math.PI / 4;
  }
  box(g, GATE.x1 - GATE.x0, 0.08, 0.08, C.black, mid, 2.95, z);

  // two leaves of pickets; their tops rise to an arch where they meet
  const hinge0 = GATE.x0 + 0.15;
  const hinge1 = GATE.x1 - 0.15;
  const w = (hinge1 - hinge0) / 2 - 0.02;
  gateLeaves = [];
  for (const side of [1, -1]) {
    const pivot = place(g, side > 0 ? hinge0 : hinge1, z, 0);
    const leaf = batch();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const u = 0.04 + (i / n) * (w - 0.08);
      const h = 2.15 + 0.35 * Math.sin((Math.PI / 2) * (u / w));
      leaf.box(0.035, h, 0.035, C.black, side * u, 0.05, 0);
    }
    for (const y of [0.1, 1.1, 2.05]) leaf.box(w, 0.06, 0.06, C.black, (side * w) / 2, y, 0);
    leaf.addTo(pivot, true);
    gateLeaves.push({ pivot, side });
  }

  // invisible click target filling the opening
  const target = new THREE.Mesh(
    new THREE.BoxGeometry(GATE.x1 - GATE.x0, 2.8, 0.6),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  target.position.set(mid, 1.4, z);
  g.add(target);
}

// ---------- where the walker can go ----------

const R = 0.4; // how close the walker's centre comes to anything
const blocks = []; // rectangles on the floor [x0, x1, z0, z1], grown by R
function blocked(x0, x1, z0, z1, snap = true) {
  blocks.push({ r: [x0 - R, x1 + R, z0 - R, z1 + R], snap });
}
// the open paving: from the CCA's low planters to the plaza wall, the fence to the bleachers
const BOUNDS = [COURT.x0 + R, COURT.x1 - R, COURT.z0 + R, BLEACH.z0 - R];
// the raised walk and its steps, and the timber building, are walls: a click there is ignored
function blockWalls() {
  blocked(COURT.x0, WALK.x1 + 1.5, WALK.z0, COURT.z1, false);
  blocked(TIMBER.x0, TIMBER.x1, TIMBER.z0, TIMBER.z1, false);
}

const inside = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;
const inBounds = (x, z) => x >= BOUNDS[0] && x <= BOUNDS[1] && z >= BOUNDS[2] && z <= BOUNDS[3];

// does the segment a-b pass through the inside of rectangle r? (Liang-Barsky)
function crosses(ax, az, bx, bz, [x0, x1, z0, z1]) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
    if (p === 0) {
      if (q <= 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return t1 - t0 > 1e-6;
}

// shortest way from a to b around the blocks: a visibility graph over the blocks' corners
function findPath(a, b) {
  const E = 0.03;
  const nodes = [a, b];
  for (const { r } of blocks) {
    for (const x of [r[0] - E, r[1] + E]) {
      for (const z of [r[2] - E, r[3] + E]) {
        if (inBounds(x, z) && !blocks.some((o) => inside(x, z, o.r))) nodes.push({ x, z });
      }
    }
  }
  // a block the walker already stands in can't stop it walking out of it
  const live = blocks.filter((o) => !inside(a.x, a.z, o.r));
  const clear = (p, q) => !live.some((o) => crosses(p.x, p.z, q.x, q.z, o.r));
  const dist = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const done = nodes.map(() => false);
  dist[0] = 0;
  for (;;) {
    let i = -1;
    for (let j = 0; j < nodes.length; j++) if (!done[j] && dist[j] < Infinity && (i < 0 || dist[j] < dist[i])) i = j;
    if (i < 0) return null;
    if (i === 1) break;
    done[i] = true;
    for (let j = 0; j < nodes.length; j++) {
      if (done[j]) continue;
      const d = dist[i] + Math.hypot(nodes[j].x - nodes[i].x, nodes[j].z - nodes[i].z);
      if (d < dist[j] && clear(nodes[i], nodes[j])) {
        dist[j] = d;
        prev[j] = i;
      }
    }
  }
  const path = [];
  for (let i = 1; i !== 0; i = prev[i]) path.unshift({ x: nodes[i].x, z: nodes[i].z });
  return path;
}

// a click inside a small block (the bed, a planter) walks to its nearest edge instead
function walkable(x, z) {
  for (const { r, snap } of blocks) {
    if (!inside(x, z, r)) continue;
    if (!snap) return null;
    const out = [[r[0] - 0.05, z, x - r[0]], [r[1] + 0.05, z, r[1] - x], [x, r[2] - 0.05, z - r[2]], [x, r[3] + 0.05, r[3] - z]];
    out.sort((p, q) => p[2] - q[2]);
    [x, z] = out.find(([px, pz]) => inBounds(px, pz) && !blocks.some((o) => inside(px, pz, o.r))) || [];
    if (x === undefined) return null;
  }
  return inBounds(x, z) ? { x, z } : null;
}

// ---------- the figure: a white cape over a navy robe ----------

const W = { start: { x: 6.5, z: 9.5 }, speed: 2.6, turn: 10 };
const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let walker = null;

// the figure gets its own materials, so the wireframe toggle leaves it solid
function solid(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });
}

function buildWalker() {
  const g = new THREE.Group();
  g.userData.action = "walker";
  const body = new THREE.Group(); // bobs while walking
  g.add(body);
  const navy = solid("#2b3557");
  const sleeve = solid("#3c5286");
  const white = solid("#eef0f2", { side: THREE.DoubleSide });

  const feet = [-1, 1].map((s) => addMesh(body, new THREE.BoxGeometry(0.1, 0.08, 0.2), solid("#1b2036"), s * 0.08, 0.04, 0.02));
  // robe: a six-sided skirt, wider at the hem
  addMesh(body, new THREE.CylinderGeometry(0.13, 0.25, 0.72, 6), navy, 0, 0.42, 0);
  // sleeves poking out under the cape
  for (const s of [-1, 1]) {
    const arm = addMesh(body, new THREE.CylinderGeometry(0.05, 0.085, 0.42, 5), sleeve, s * 0.26, 0.82, 0.02);
    arm.rotation.z = s * 0.45;
  }

  // cape: an open cone hung from the shoulders, its hem cut into points
  const capeGeo = new THREE.CylinderGeometry(0.1, 0.46, 0.62, 9, 1, true);
  const pos = capeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) + (i % 2 ? 0.07 : -0.03));
  }
  capeGeo.translate(0, -0.31, 0); // pivot at the shoulders, so it can sway
  const cape = addMesh(body, capeGeo, white, 0, 1.26, 0);
  addMesh(body, new THREE.CylinderGeometry(0.09, 0.12, 0.1, 6), navy, 0, 1.24, 0); // collar
  addMesh(body, new THREE.OctahedronGeometry(0.035, 0), solid("#e2bd45"), 0, 1.13, 0.17); // gold clasp

  // dark head
  addMesh(body, new THREE.IcosahedronGeometry(0.13, 0), solid("#141519"), 0, 1.38, 0.02);

  scene.add(g);
  walker = { g, body, feet, cape, x: 0, z: 0, heading: 0, face: null, path: [], phase: 0, last: 0, leaving: false, gone: false };
  resetWalker();
}

function resetWalker() {
  Object.assign(walker, { x: W.start.x, z: W.start.z, heading: Math.PI, face: null, path: [], leaving: false, gone: false });
  gateAngle = 0;
}

// a coral ring on the paving where you clicked
let ring = null;
function showRing(x, z) {
  ring ??= new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.34, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#e08a6a", transparent: true, depthWrite: false }),
  );
  scene.add(ring);
  ring.position.set(x, 0.03, z);
  ring.userData.start = performance.now();
}

function walkTo(x, z) {
  const goal = walkable(x, z);
  if (!goal) return;
  const path = findPath({ x: walker.x, z: walker.z }, goal);
  if (!path) return;
  walker.path = path;
  walker.face = null;
  showRing(goal.x, goal.z);
}

// to the gate, through it, and a step onto the sidewalk; then turn back to face the school
function leave() {
  const mid = (GATE.x0 + GATE.x1) / 2;
  const path = findPath({ x: walker.x, z: walker.z }, { x: mid, z: BOUNDS[2] + 0.05 });
  if (!path) return;
  walker.path = [...path, { x: mid, z: COURT.z0 - 1.0 }, { x: mid, z: COURT.z0 - 1.7 }];
  walker.face = 0;
  walker.leaving = true;
  showRing(mid, COURT.z0 - 1.7);
}

// each frame: walk along the path, swing the gate, animate the figure.
// Returns "leave" on the frame the walker steps out through the gate
function stepWalker(now) {
  const w = walker;
  const dt = Math.min((now - (w.last || now)) / 1000, 0.05);
  w.last = now;
  let moving = false;
  let want = w.heading;
  if (w.path.length) {
    const p = w.path[0];
    const dx = p.x - w.x;
    const dz = p.z - w.z;
    const d = Math.hypot(dx, dz);
    const step = W.speed * dt;
    if (d <= step) {
      w.x = p.x;
      w.z = p.z;
      w.path.shift();
    } else {
      w.x += (dx / d) * step;
      w.z += (dz / d) * step;
    }
    if (d > 1e-4) want = Math.atan2(dx, dz);
    moving = true;
  } else if (w.face !== null) {
    want = w.face;
  }
  // turn the short way round
  let da = want - w.heading;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  w.heading += da * Math.min(1, dt * W.turn);

  // walk cycle: bob, feet, cape trailing behind
  w.phase = moving ? w.phase + dt * W.speed * 4.4 : w.phase * Math.max(0, 1 - dt * 6);
  const swing = Math.sin(w.phase);
  const idle = Math.sin(now / 700) * 0.008;
  w.body.position.y = moving ? Math.abs(swing) * 0.05 : idle;
  w.feet.forEach((f, i) => (f.position.z = 0.02 + (i ? swing : -swing) * 0.12));
  w.cape.rotation.x += ((moving ? -0.28 + Math.sin(w.phase * 2) * 0.05 : 0) - w.cape.rotation.x) * Math.min(1, dt * 6);
  w.cape.rotation.z = moving ? swing * 0.04 : 0;
  w.g.position.set(w.x, w.z < COURT.z0 ? 0.12 : 0, w.z);
  w.g.rotation.y = w.heading;

  // the gate swings open as the walker comes near it
  const mid = (GATE.x0 + GATE.x1) / 2;
  const near = w.leaving || Math.hypot(w.x - mid, w.z - COURT.z0) < 3.2;
  gateAngle += ((near ? 1.35 : 0) - gateAngle) * Math.min(1, dt * 2.5);
  for (const { pivot, side } of gateLeaves) pivot.rotation.y = side * gateAngle;

  if (ring) {
    const t = (now - ring.userData.start) / 900;
    ring.visible = t < 1;
    ring.material.opacity = 1 - t;
    ring.scale.setScalar(1 + t * 0.6);
  }

  if (w.leaving && !w.gone && w.z < COURT.z0 - 0.3) {
    w.gone = true;
    return "leave";
  }
  return null;
}

/* ==================================================================
   STREETS: cars past the gate and past the bridge
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
  const g = place(layers.cars, x, z, 0);
  box(g, 1.6, 0.35, 0.25, color, 0, 0.45, 0);
  box(g, 0.5, 0.15, 0.3, C.black, -0.3, 0.8, 0);
  for (const sx of [-0.6, 0.6]) {
    const w = addMesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), mat(C.tyre), sx, 0.3, 0);
    w.rotation.x = Math.PI / 2;
  }
}

function buildStreets() {
  const colors = ["#b3232b", "#e9ebeb", "#a4a8ad", "#1f2328", "#283255", "#c3c6ca"];
  // just past the gate, as in the phone photos: red car, white pickup, red car, motorbikes
  car(-6.5, COURT.z0 - 5.5, 0, "#b3232b");
  car(-0.5, COURT.z0 - 5.5, 0, "#eceeee", 5.2);
  car(5.5, COURT.z0 - 5.5, 0, "#b3232b");
  motorbike(-3.2, COURT.z0 - 3.6, "#c62f3a");
  motorbike(-1.6, COURT.z0 - 3.6, C.black);
  for (let x = -36; x < 36; x += 5.4) {
    if (rand() < 0.3) continue;
    car(x, COURT.z0 - 12.5, 0, colors[Math.floor(rand() * colors.length)]);
  }
  // past the bridge: the cars the drone saw, parked along the street
  for (const [x, color] of [[-3.4, "#e9ebeb"], [-8.6, "#e9ebeb"], [-13.1, "#f2f2f0"], [-18.8, "#e9ebeb"], [-26, "#c3c6ca"], [4, "#a4a8ad"], [10, "#1f2328"]]) {
    car(x, BRIDGE.z1 + 4.6, 0, color, x === -13.1 ? 5.9 : 4.6);
  }
}

function buildLights() {
  scene.add(new THREE.HemisphereLight("#e9f1fa", "#8d8a82", 2.0));
  // afternoon sun, high from behind the bleachers' left, as in the drone video
  const sun = new THREE.DirectionalLight("#fff4e0", 2.6);
  sun.position.set(-30, 55, 45);
  sun.target.position.set(0, 0, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  for (const side of ["left", "bottom"]) sun.shadow.camera[side] = -70;
  for (const side of ["right", "top"]) sun.shadow.camera[side] = 70;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#dfe8ff", 0.7);
  fill.position.set(30, 20, -30);
  scene.add(fill);
}

export default {
  title: "Main Gate",
  // title card shown before the scene opens
  card: { number: "Scene Three", title: "Main Gate", line: "The courtyard at the front of the school." },
  intro: "drone",
  hint: "Click the paving to walk · click the gate to leave · drag to orbit",
  // walking out through the gate: the camera rises behind the walker, the scene turns
  // to wireframe, then the camera pulls back over the courtyard while everything shatters
  // and scatters, from the middle of the courtyard outward; then the goodbye card
  ending: {
    view: { pos: [-2, 10, -6], target: [3.9, 1.2, -26], fov: 45 },
    wide: { pos: [-4, 21, 26], target: [3, 0, -18], fov: 45 },
    from: [(BED.x0 + BED.x1) / 2, 0, (BED.z0 + BED.z1) / 2],
    title: "Goodbye CCA",
    back: "gate", // the view to come back to
  },
  layers: [
    { key: "cars", label: "Cars" },
    { key: "plants", label: "Trees & plants" },
    { key: "people", label: "People & flags" },
    { key: "neighbours", label: "Neighbours" },
  ],
  views: {
    // drone camera as solved for frame 57 s of 1.mp4 (16:9, vertical fov 43.1°)
    drone: {
      label: "Drone",
      pos: [25.102, 17.526, 5.843],
      target: [16.132, 13.215, 4.868],
      photo: { fov: 43.08, aspect: 16 / 9, name: "1.mp4 · 0:57", src: "photos/main_gate_drone.jpg" },
    },
    // iPhone 16 Pro at 2x (47 mm) and 3x (66 mm), from the top of the bleachers;
    // placed by fitting the sign, the bed's tree and the bed's corners
    gate: {
      label: "Courtyard",
      pos: [6.71, 4.27, 31.08],
      target: [4.76, 4.37, 21.27],
      photo: { fov: 30.88, aspect: 4 / 3, name: "IMG_4593", src: "photos/main_gate.jpg" },
    },
    garden: {
      label: "Garden",
      pos: [6.71, 4.27, 31.08],
      target: [3.64, 3.61, 21.59],
      photo: { fov: 22.25, aspect: 4 / 3, name: "IMG_4592", src: "photos/main_gate_garden.jpg" },
    },
    overview: { label: "Overview", pos: [55, 50, 55], target: [2, 0, 2], fov: 45 },
    plan: { label: "Plan", pos: [2, 120, 4.01], target: [2, 0, 4], fov: 45 },
  },

  build() {
    reseed(5);
    scene = new THREE.Scene();
    layers = makeLayers(scene, this.layers);
    buildLights();
    buildGround();
    buildCCA();
    buildTimber();
    buildPlaza();
    buildBridge();
    buildBleachers();
    buildNeighbours();
    buildCourtyard();
    buildStreets();
    blockWalls();
    buildWalker();
    buildStreetEdge();
    // every surface can shatter for the ending
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      shatterable(obj);
      dissolvable(obj.material);
    });
    return scene;
  },

  // a click that didn't hit a scan or a door: `hit` is the first thing under the
  // pointer (or null), `ray` the pointer's ray
  click(hit, ray) {
    if (walker.leaving) return;
    let through = false; // trees, people, cars and the walker: walk to the paving behind them
    for (let o = hit?.object; o; o = o.parent) {
      if (o.userData.action === "leave") return leave();
      if (o.userData.action === "walker" || [layers.plants, layers.people, layers.cars].includes(o)) through = true;
    }
    let p = null;
    if (hit && !through) {
      if (hit.point.y > 0.7) return; // a wall or a roof
      p = hit.point;
    } else {
      p = ray.intersectPlane(FLOOR, new THREE.Vector3());
    }
    if (!p) return;
    // the sidewalk or street past the fence: out through the gate
    if (p.z < COURT.z0 && p.x > COURT.x0 && p.x < TIMBER.x0) return leave();
    walkTo(p.x, p.z);
  },

  // called every frame; returns "leave" when the walker has stepped out of the gate
  update(camera, now) {
    return stepWalker(now);
  },

  // back to the start, after the goodbye
  reset() {
    resetWalker();
    if (ring) ring.visible = false;
  },
};
