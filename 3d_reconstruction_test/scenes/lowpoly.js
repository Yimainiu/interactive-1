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
      this.add(geo, color);
    },
    // any shape, already moved into place
    add(geo, color) {
      if (!parts.has(color)) parts.set(color, []);
      parts.get(color).push(geo.index ? geo.toNonIndexed() : geo);
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

// one group per entry in a scene's `layers` list, so the panel can hide them
export function makeLayers(scene, list) {
  const layers = {};
  for (const { key } of list) {
    layers[key] = new THREE.Group();
    scene.add(layers[key]);
  }
  scene.userData.layers = layers;
  return layers;
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

// ---------- dissolve: lets a whole scene shatter and scatter ----------

// shared by every material that has been made dissolvable. amount runs 0 -> 1:
// at 0 nothing moves; at 1 everything is gone. Every triangle is a shard: shards
// break loose nearest `from` first, so the scene shatters outward from that point.
// Each shard bursts out and up, tumbles, shrinks, and vanishes partway through
export const dissolve = {
  amount: { value: 0 },
  from: { value: new THREE.Vector3() },
  radius: { value: 55 },
};

const SHARD = `
uniform float uDissolve;
uniform vec3 uDissolveFrom;
uniform float uDissolveRadius;
attribute vec4 aCenter; // xyz: the triangle's centre, w: its size
varying float vShatter;
varying float vShard;
vec3 shardHash(vec3 p) {
  return fract(sin(vec3(dot(p, vec3(12.9898, 78.233, 45.164)), dot(p, vec3(39.346, 11.135, 83.155)), dot(p, vec3(73.156, 52.235, 9.151)))) * 43758.5453);
}
vec3 spin(vec3 v, vec3 axis, float a) {
  return v * cos(a) + cross(axis, v) * sin(a) + axis * dot(axis, v) * (1.0 - cos(a));
}
`;

// moves each vertex with its triangle's shard; runs after three.js has placed it
const SHATTER = `
vShatter = 0.0;
vShard = 0.0;
if (uDissolve > 0.0) {
  vec3 centre = (modelMatrix * vec4(aCenter.xyz, 1.0)).xyz;
  vec3 h = shardHash(floor(centre * 7.0) + aCenter.xyz);
  float big = clamp(aCenter.w / 6.0, 0.0, 1.0); // big shards (walls, ground) tumble slower and shrink sooner
  float far = clamp(distance(centre.xz, uDissolveFrom.xz) / uDissolveRadius, 0.0, 1.0);
  float start = far * 0.72 + h.x * 0.28;
  float p = clamp((uDissolve * 1.4 - start) / 0.4, 0.0, 1.0);
  vShatter = p;
  vShard = h.y;
  if (p > 0.0) {
    vec3 world = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vec2 out2 = centre.xz - uDissolveFrom.xz;
    out2 = length(out2) > 0.01 ? normalize(out2) : vec2(h.y - 0.5, h.z - 0.5);
    float burst = 1.0 - (1.0 - p) * (1.0 - p);
    vec3 drift = vec3(out2.x * (3.0 + h.z * 7.0) + (h.y - 0.5) * 4.0,
                      2.0 + h.y * 6.0 - p * p * 3.0,
                      out2.y * (3.0 + h.z * 7.0) + (h.x - 0.5) * 4.0) * burst;
    vec3 axis = normalize(h - 0.5 + vec3(0.001));
    vec3 piece = spin(world - centre, axis, p * (2.0 + h.z * 6.0) * (1.0 - 0.85 * big)) * (1.0 - p * (0.6 + 0.4 * big));
    mvPosition = viewMatrix * vec4(centre + drift + piece, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
}
`;

export function dissolvable(material) {
  if (material.userData.dissolve) return material;
  material.userData.dissolve = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDissolve = dissolve.amount;
    shader.uniforms.uDissolveFrom = dissolve.from;
    shader.uniforms.uDissolveRadius = dissolve.radius;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", `${SHARD}\nvoid main() {`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${SHATTER}`);
    // each shard vanishes at its own moment on the way out
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `varying float vShatter;
varying float vShard;
void main() {
  if (vShatter > 0.45 + 0.55 * vShard) discard;`,
    );
  };
  material.customProgramCacheKey = () => "shatter";
  material.needsUpdate = true;
  return material;
}

// gives a mesh one set of vertices per triangle, each knowing its triangle's centre,
// so the dissolve can fling the triangles apart separately
export function shatterable(mesh) {
  let geo = mesh.geometry;
  if (geo.userData.shatter) return;
  if (geo.index) geo = geo.toNonIndexed();
  const pos = geo.attributes.position;
  const centre = new Float32Array(pos.count * 4);
  const a = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    c.set(0, 0, 0);
    for (let j = 0; j < 3; j++) c.add(a.fromBufferAttribute(pos, i + j));
    c.divideScalar(3);
    let size = 0;
    for (let j = 0; j < 3; j++) size = Math.max(size, a.fromBufferAttribute(pos, i + j).distanceTo(c));
    for (let j = 0; j < 3; j++) centre.set([c.x, c.y, c.z, size], (i + j) * 4);
  }
  geo.setAttribute("aCenter", new THREE.BufferAttribute(centre, 4));
  geo.userData.shatter = true;
  mesh.geometry = geo;
}
