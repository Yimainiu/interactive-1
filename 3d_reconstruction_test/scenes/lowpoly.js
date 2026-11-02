import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/* ------------------------------------------------------------------
   Shared helpers for building low-poly scenes out of simple shapes.
   Positions are in metres; most shapes take the y of their bottom.
------------------------------------------------------------------- */

// seeded random, so the "messy" bits look the same on every visit
let seed = 11;
export function reseed(n) {
  seed = n;
}
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

// one material per colour, shared by every scene (also used by the wireframe toggle)
export const materials = new Map();
export function mat(color, extra = {}) {
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

export function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// box whose bottom sits at y (handy for furniture)
export function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
  return addMesh(parent, new THREE.BoxGeometry(w, h, d), mat(color), x, y + h / 2, z);
}

// cylinder whose bottom sits at y; few sides = low-poly
export function cyl(parent, rTop, rBottom, h, sides, color, x = 0, y = 0, z = 0) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, sides);
  return addMesh(parent, geo, mat(color), x, y + h / 2, z);
}

// box with a smaller top face (car cabins); shiftTop slides the top along x
export function taperedBox(parent, w, h, d, topW, topD, color, x = 0, y = 0, z = 0, shiftTop = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * (topW / w) + shiftTop);
      pos.setZ(i, pos.getZ(i) * (topD / d));
    }
  }
  return addMesh(parent, geo, mat(color), x, y + h / 2, z);
}

// thin square bar between two points (frames, trusses, cables)
const UP = new THREE.Vector3(0, 1, 0);
export function bar(parent, a, b, size, color) {
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
export function place(parent, x, z, turnDeg = 0, y = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = THREE.MathUtils.degToRad(turnDeg);
  parent.add(g);
  return g;
}

// collects lots of small boxes (window frames, joints) into one mesh per colour,
// so a facade with hundreds of bars is still only a few draw calls
export function batch() {
  const parts = new Map();
  return {
    box(w, h, d, color, x, y, z) {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate(x, y + h / 2, z);
      if (!parts.has(color)) parts.set(color, []);
      parts.get(color).push(geo);
    },
    addTo(parent, castShadow = false) {
      for (const [color, geos] of parts) {
        const mesh = new THREE.Mesh(mergeGeometries(geos), mat(color));
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        parent.add(mesh);
      }
    },
  };
}

// flat ground made of irregular triangles, one shade per triangle
export function facetedGround(parent, w, d, color, x, z, cells = 1.2, spread = 0.2) {
  const geo = new THREE.PlaneGeometry(w, d, Math.round(w / cells), Math.round(d / cells));
  geo.rotateX(-Math.PI / 2);

  // nudge the inner points around so the triangles look hand-cut
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    if (Math.abs(px) < w / 2 - 0.01 && Math.abs(pz) < d / 2 - 0.01) {
      pos.setX(i, px + (rand() - 0.5) * cells * 0.33);
      pos.setZ(i, pz + (rand() - 0.5) * cells * 0.33);
    }
  }

  const flat = geo.toNonIndexed();
  const colors = [];
  const base = new THREE.Color(color);
  const tint = new THREE.Color();
  for (let i = 0; i < flat.attributes.position.count; i += 3) {
    tint.copy(base).multiplyScalar(1 - spread * 0.7 + rand() * spread);
    for (let k = 0; k < 3; k++) colors.push(tint.r, tint.g, tint.b);
  }
  flat.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  flat.computeVertexNormals();

  const key = `ground ${color}`;
  if (!materials.has(key)) {
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 }),
    );
  }
  const ground = new THREE.Mesh(flat, materials.get(key));
  ground.position.set(x, 0, z);
  ground.receiveShadow = true;
  parent.add(ground);
  return ground;
}

// simple low-poly people, kept anonymous on purpose
export function standingPerson(parent, x, z, turnDeg, shirt = "#2f3440", pants = "#4d6a94") {
  const g = place(parent, x, z, turnDeg);
  bar(g, [0.09, 0, 0], [0.09, 0.85, 0], 0.12, pants);
  bar(g, [-0.09, 0, 0], [-0.09, 0.85, 0], 0.12, pants);
  cyl(g, 0.17, 0.19, 0.6, 6, shirt, 0, 0.85, 0);
  bar(g, [0.21, 1.42, 0], [0.24, 0.95, 0.04], 0.08, shirt);
  bar(g, [-0.21, 1.42, 0], [-0.24, 0.95, -0.04], 0.08, shirt);
  addMesh(g, new THREE.IcosahedronGeometry(0.11, 0), mat("#d9a383"), 0, 1.6, 0);
  addMesh(g, new THREE.IcosahedronGeometry(0.115, 0), mat("#3a2a22"), 0, 1.64, -0.02);
  return g;
}
