import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ------------------------------------------------------------------
   3D scans: any object in a scene with userData.scan = { src, title,
   note } gets a pulsing marker and can be clicked. A click opens a
   pop-up that loads the scan (a .glb file) and spins it slowly; it
   can still be dragged to look around and scrolled to zoom.
------------------------------------------------------------------- */

const viewer = document.querySelector("#viewer");
const viewerCanvas = document.querySelector("#viewer-canvas");
const viewerTitle = document.querySelector("#viewer-title");
const viewerNote = document.querySelector("#viewer-note");
const viewerStatus = document.querySelector("#viewer-status");

const loader = new GLTFLoader();
const cache = new Map(); // src -> promise of the loaded scene

// ---------- the pop-up's own little 3D view ----------

const renderer = new THREE.WebGLRenderer({ canvas: viewerCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const stage = new THREE.Scene();
stage.add(new THREE.HemisphereLight("#ffffff", "#8d8a82", 2.4));
const key = new THREE.DirectionalLight("#ffffff", 1.6);
key.position.set(2, 3, 4);
stage.add(key);
const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
const controls = new OrbitControls(camera, viewerCanvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 3; // one turn every 20 s, whatever the frame rate
let shown = null; // the model on the stage

function sizeViewer() {
  const { width, height } = viewerCanvas.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height || 1;
  camera.updateProjectionMatrix();
}

// centre the model on the origin and back the camera off until it fits
function frameModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  model.position.sub(centre);
  const radius = size.length() / 2;
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.1;
  camera.position.set(0, radius * 0.35, dist);
  camera.near = dist / 100;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.minDistance = radius * 1.2;
  controls.maxDistance = dist * 3;
  controls.update();
}

function load(src) {
  if (!cache.has(src)) {
    cache.set(
      src,
      new Promise((done, fail) =>
        loader.load(src, (gltf) => done(gltf.scene), (e) => {
          if (e.total) viewerStatus.textContent = `Loading ${Math.round((100 * e.loaded) / e.total)}%`;
        }, fail),
      ),
    );
  }
  return cache.get(src);
}

let opening = null;

export async function openScan(scan) {
  const run = {};
  opening = run;
  viewerTitle.textContent = scan.title;
  viewerNote.textContent = scan.note || "";
  viewerStatus.textContent = "Loading…";
  viewer.hidden = false;
  sizeViewer();
  if (shown) stage.remove(shown);
  shown = null;
  try {
    const model = await load(scan.src);
    if (opening !== run) return;
    shown = model;
    shown.position.set(0, 0, 0);
    stage.add(shown);
    frameModel(shown);
    viewerStatus.textContent = "";
  } catch {
    if (opening === run) viewerStatus.textContent = "Couldn't load this scan.";
  }
}

export function closeScan() {
  opening = null;
  viewer.hidden = true;
}

export const isOpen = () => !viewer.hidden;

document.querySelector("#viewer-close").addEventListener("click", closeScan);
// clicking the dark backdrop (not the box) closes it too
viewer.addEventListener("click", (e) => {
  if (e.target === viewer) closeScan();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isOpen()) closeScan();
});
window.addEventListener("resize", () => isOpen() && sizeViewer());

// ---------- markers and picking in the main scene ----------

// a soft coral dot that pulses, so people know the object can be clicked
function markerTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, "rgba(224, 138, 106, 1)");
  grad.addColorStop(0.45, "rgba(224, 138, 106, 0.9)");
  grad.addColorStop(1, "rgba(224, 138, 106, 0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(64, 64, 14, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
let markerMat = null;

// call once per built scene: finds its scan objects and puts a marker beside each
export function addMarkers(scene) {
  markerMat ??= new THREE.SpriteMaterial({ map: markerTexture(), depthTest: false, transparent: true });
  const found = [];
  scene.traverse((obj) => obj.userData.scan && found.push(obj));
  scene.userData.markers = found.map((obj) => {
    const box = new THREE.Box3().setFromObject(obj);
    const sprite = new THREE.Sprite(markerMat);
    sprite.position.set((box.min.x + box.max.x) / 2, box.max.y + 0.25, box.max.z + 0.1);
    sprite.userData.scanOwner = obj;
    sprite.renderOrder = 10;
    scene.add(sprite);
    return sprite;
  });
}

export function pulseMarkers(scene, now) {
  const s = 0.34 * (1 + 0.18 * Math.sin(now / 280));
  for (const m of scene.userData.markers || []) m.scale.set(s, s, s);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// the scan under a screen point, or null
export function pick(scene, cam, clientX, clientY, canvas) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, cam);
  for (const hit of raycaster.intersectObjects(scene.children, true)) {
    if (!hit.object.visible) continue;
    for (let o = hit.object; o; o = o.parent) {
      if (o.userData.scanOwner) return o.userData.scanOwner.userData.scan;
      if (o.userData.scan) return o.userData.scan;
    }
    // the first visible thing hit is not a scan: something is in front of it
    if (!hit.object.isSprite) return null;
  }
  return null;
}

let last = 0;
export function renderViewer(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!isOpen()) return;
  controls.update(dt);
  renderer.render(stage, camera);
}
