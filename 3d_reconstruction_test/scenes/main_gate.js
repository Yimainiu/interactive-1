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
const BLEACH = { z0: 22.6, z1: 34.9, x1: 10.6, tiers: 10 };
const WALK = { x1: -5.6, z0: -3, top: 0.5 }; // raised walk along the CCA facade, with 3 steps
const BED = { x0: -1.48, x1: 4.6, z0: -2.29, z1: 8.07 };
const SITE = { x0: -42, x1: 42, z0: -64, z1: 66 };

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
  // the street past the bridge end, where the drone saw parked cars
  box(scene, w, 0.02, 12, C.asphalt, (SITE.x0 + SITE.x1) / 2, 0, 59);

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
  for (let z = z0 + 3; z < z1 - 6; z += 7) {
    front.box(0.05, 2.4, 3.6, C.darkGlass, x0 - 0.03, 0.4, z + 1.8);
    front.box(0.06, 0.12, 3.8, "#8f9396", x0 - 0.04, 2.8, z + 1.8);
  }
  for (const z of [-4.2, 9.8, 23.8]) front.box(0.05, 2.5, 1.8, "#3a4048", x0 - 0.035, 0, z);
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
  box(layers.plants, 11, 0.5, 21.5, C.lawn, 23.5, y, 24);

  // railing along the courtyard edge: steel panels between concrete blocks
  const rail = batch();
  for (let z = z0 + 0.5; z < z1 - 0.5; z += 2.0) {
    rail.box(0.05, 1.0, 0.05, "#9aa0a3", x0 + 0.15, y, z);
    rail.box(0.04, 0.04, 2.0, "#9aa0a3", x0 + 0.15, y + 1.0, z + 1.0);
  }
  for (let z = z0 + 4; z < z1; z += 9) rail.box(0.5, 1.0, 1.4, C.concrete, x0 + 0.25, y, z);
  rail.addTo(scene, true);

  // tall black light poles on the plaza edge, with clusters of lamp heads
  for (const z of [-10, 2.5, 12.5, 27]) {
    cyl(layers.lamps, 0.08, 0.11, 9.8 - y, 6, C.black, 12.9, y, z);
    for (let i = 0; i < 4; i++) cyl(layers.lamps, 0.14, 0.14, 0.3, 8, C.black, 12.9 + (i % 2 ? 0.25 : -0.25), 8.4 + i * 0.35, z);
  }
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
  box(scene, x1 - x0, 1.0, 0.25, C.concrete, (x0 + x1) / 2, y, z0 + 0.15); // parapet
  box(scene, 2.6, 0.9, 0.05, C.trim, 1.5, y - 1.5, z0 - 0.03); // red sign on the fascia
  // dark back wall of the passage, then a low building beyond it
  box(scene, x1 - x0, y - 0.6, 0.3, "#3d3f43", (x0 + x1) / 2, 0, z1 - 1);
  box(layers.neighbours, 50, 6.5, 8, "#3f4145", -4, 0, z1 + 4.5);
  box(layers.neighbours, 50, 0.4, 8.2, C.trim, -4, 5.0, z1 + 4.5);
}

// the bleachers rising from the courtyard to the bridge, and the stair beside them
function buildBleachers() {
  const { z0, z1, x1, tiers } = BLEACH;
  const depth = (z1 - z0) / tiers;
  const rise = BRIDGE.y / tiers;
  const parts = batch();
  for (let k = 0; k < tiers; k++) {
    const zf = z0 + k * depth;
    // the west edge runs on a diagonal, from (2.0, 24.5) to (5.8, 34)
    const xw = Math.max(2.0, 2.0 + ((zf - 24.5) * 3.8) / 9.5);
    parts.box(x1 - xw, rise * (k + 1), z1 - zf, C.bleacher, (xw + x1) / 2, 0, (zf + z1) / 2);
  }
  // stair at the east end: twice the risers, a handrail each side
  const n = tiers * 2;
  for (let k = 0; k < n; k++) {
    const zf = z0 + (k * (z1 - z0)) / n;
    parts.box(COURT.x1 - x1, (BRIDGE.y * (k + 1)) / n, z1 - zf, C.concrete, (x1 + COURT.x1) / 2, 0, (zf + z1) / 2);
  }
  parts.addTo(scene, true);
  for (const x of [x1 + 0.05, COURT.x1 - 0.1]) bar(scene, [x, 1.0, z0], [x, BRIDGE.y + 1.0, z1], 0.05, C.black);
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
   COURTYARD: bed, trees, hedge, fence, lamps, signs
================================================================== */

// a raised bed packed with grass tufts
function plantedBed(x0, x1, z0, z1, tufts) {
  box(layers.plants, x1 - x0, 0.4, z1 - z0, "#4a5a3a", (x0 + x1) / 2, 0, (z0 + z1) / 2);
  const grass = batch();
  const colors = [C.grassA, C.grassB, C.grassC, C.grassD];
  for (let i = 0; i < tufts; i++) {
    const x = x0 + 0.2 + rand() * (x1 - x0 - 0.4);
    const z = z0 + 0.2 + rand() * (z1 - z0 - 0.4);
    const h = 0.35 + rand() * 0.45;
    const tuft = new THREE.ConeGeometry(0.25 + rand() * 0.15, h, 5);
    tuft.rotateY(rand() * Math.PI);
    tuft.translate(x, 0.4 + h / 2, z);
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

  // low shrub planters at the foot of the CCA facade
  for (const [z0, z1] of [[13, 21], [-14, -6]]) box(layers.plants, 2.0, 0.8, z1 - z0, C.hedge, CCA.x + 1.4, WALK.top, (z0 + z1) / 2);
  box(layers.plants, 2.0, 0.8, 8, C.hedge, CCA.x + 1.4, 0, -17);

  // hedge planter at the end of the courtyard, then a row of young trees before the fence
  box(layers.plants, 4.9, 1.1, 1.8, C.hedge, 2.3, 0, -13);
  for (const x of [-7.5, -3, 1.5, 5.8, 9.0]) tree(x, -21.5, 1.0);

  // the main gate: black picket fence across the courtyard end, taller gate posts
  const fence = batch();
  const fx0 = COURT.x0;
  const fx1 = TIMBER.x0;
  for (let x = fx0; x <= fx1; x += 0.2) fence.box(0.03, 2.4, 0.03, C.black, x, 0, COURT.z0);
  for (const y of [0.1, 2.3]) fence.box(fx1 - fx0, 0.06, 0.06, C.black, (fx0 + fx1) / 2, y, COURT.z0);
  for (const x of [fx0, -3.5, 2.5, fx1]) fence.box(0.2, 3.0, 0.2, C.black, x, 0, COURT.z0);
  fence.addTo(scene, true);

  // red A-frame sign on the paving
  const sign = place(scene, 3.4, 12.3, 0);
  for (const s of [-1, 1]) {
    const leaf = box(sign, 0.62, 0.95, 0.03, C.sign, 0, 0, s * 0.17);
    leaf.rotation.x = s * 0.18;
  }
  // banners in front of the plaza wall
  for (const z of [2.5, 4.0, 5.5]) flag(10.3, 0, z);

  // black bell lamps on cables strung from the plaza poles to the CCA facade
  for (const [z, zf] of [[2.5, -6], [12.5, 6], [27, 20]]) {
    const a = [12.9, 9.2, z];
    const b = [CCA.x + 0.1, 7.6, zf];
    bar(layers.lamps, a, b, 0.02, C.black).castShadow = false;
    for (const t of [0.3, 0.55, 0.8]) {
      const p = a.map((v, i) => v + (b[i] - v) * t);
      bar(layers.lamps, p, [p[0], p[1] - 0.8, p[2]], 0.015, C.black);
      cyl(layers.lamps, 0.12, 0.32, 0.45, 8, C.black, p[0], p[1] - 1.25, p[2]);
    }
  }

  // people
  standingPerson(layers.people, -3.5, 19, 200, "#2c3a52", "#c9b79b");
  standingPerson(layers.people, -2.8, -9, 30, "#3d4a37", "#202226");
  standingPerson(layers.people, 22, 0, 120, "#6a2f2f", "#33363d").position.y = PLAZA.y;
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
    car(x, 61, 0, color, x === -13.1 ? 5.9 : 4.6);
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
  layers: [
    { key: "cars", label: "Cars" },
    { key: "plants", label: "Trees & plants" },
    { key: "lamps", label: "Lamps & cables" },
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
    return scene;
  },
};
