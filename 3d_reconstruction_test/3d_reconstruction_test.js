import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { materials } from "./scenes/lowpoly.js";
import oldGate from "./scenes/old_gate.js";
import idStudio from "./scenes/id_studio.js";
import mainGate from "./scenes/main_gate.js";
import { addMarkers, pulseMarkers, pick, openScan, isOpen, renderViewer } from "./scans.js";

/* ------------------------------------------------------------------
   3D Reconstruction Test
   Low-poly scenes rebuilt from photos. Switching scenes first shows
   the photo, then fades it away to reveal the model from the same
   camera position. The panel switches between the photo, the
   low-poly model and its wireframe, and hides groups of objects.
------------------------------------------------------------------- */

// scene 1, scene 2, ... in button order
const SCENES = { gate: oldGate, studio: idStudio, main: mainGate };

const PHOTO_HOLD = 1600; // ms the photo stays up before the model shows
// keep these two in sync with #photo's transitions in the CSS
const FADE_IN = 500;
const FADE_OUT = 1200;

// ---------- renderer, camera ----------

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxDistance = 160;

// ---------- page elements ----------

const frame = document.querySelector("#frame");
const frameLabel = document.querySelector("#frame-label");
const photo = document.querySelector("#photo");
const photoImg = photo.querySelector("img");
const photoLabel = document.querySelector("#photo-label");
const sceneButtons = document.querySelectorAll("#scenes button");
const modeButtons = document.querySelectorAll("#modes button");
const viewBox = document.querySelector("#views");
const layerBox = document.querySelector("#layers");

const built = {}; // each scene is built the first time it's shown
let active = null; // key of the scene on screen
let current = null; // key of the view the camera sits at
let tween = null;
let intro = null; // the photo-then-model sequence that is running, if any
let mode = "lowpoly"; // what the panel shows as picked: photo, lowpoly or wire
let modelMode = "lowpoly"; // the model look to return to after a photo

// ---------- views ----------

// field of view that fits a photo's frame inside the window
function photoFov(spec) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fh = Math.min(h, w / spec.aspect) * 0.92;
  for (const el of [frame, photo]) {
    el.style.width = `${fh * spec.aspect}px`;
    el.style.height = `${fh}px`;
  }
  const half = Math.tan(THREE.MathUtils.degToRad(spec.fov / 2)) * (h / fh);
  return THREE.MathUtils.radToDeg(2 * Math.atan(half));
}

// other views: on tall phone screens, widen so the sides don't get cut off
function viewFov(view) {
  if (view.photo) return photoFov(view.photo);
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect >= 4 / 3) return view.fov;
  const half = (Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) * (4 / 3)) / aspect;
  return Math.min(THREE.MathUtils.radToDeg(2 * Math.atan(half)), 75);
}

function goTo(name, instant = false) {
  const view = SCENES[active].views[name];
  current = name;
  viewBox.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  frame.hidden = !view.photo;
  frameLabel.textContent = view.photo ? `Model · ${view.photo.name}` : "";

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
    tween = null;
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

// ---------- display: photo, low-poly or wireframe ----------

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

function setModeButtons(name) {
  mode = name;
  modeButtons.forEach((b) => b.classList.toggle("active", b.dataset.mode === name));
}

// fades the real photo in over the frame; resolves once it's loaded
async function showPhoto(spec) {
  photoImg.src = spec.src;
  photoLabel.textContent = `Photo · ${spec.name}`;
  try {
    await photoImg.decode();
  } catch {
    // photo failed to load: the model stays visible
  }
  photoFov(spec);
  photo.hidden = false;
  photo.getBoundingClientRect(); // start the fade from opacity 0
  photo.classList.add("show");
}

function hidePhoto() {
  photo.classList.remove("show");
  setTimeout(() => {
    if (!photo.classList.contains("show")) photo.hidden = true;
  }, FADE_OUT);
}

function setModel(name) {
  modelMode = name;
  materials.forEach((m) => (m.wireframe = name === "wire"));
  setModeButtons(name);
  hidePhoto();
}

// photo mode: stand where a photo was taken and show it
function photoMode() {
  const views = SCENES[active].views;
  if (!current || !views[current].photo) {
    current = Object.keys(views).find((name) => views[name].photo);
  }
  goTo(current, true);
  setModeButtons("photo");
  showPhoto(views[current].photo);
}

modeButtons.forEach((b) =>
  b.addEventListener("click", () => {
    stopIntro();
    if (b.dataset.mode === "photo") photoMode();
    else setModel(b.dataset.mode);
  }),
);

// ---------- scenes ----------

function showScene(key) {
  const def = SCENES[key];
  if (!built[key]) {
    built[key] = def.build();
    built[key].background = new THREE.Color("#f6eee9");
    addMarkers(built[key]);
    materials.forEach((m) => (m.wireframe = modelMode === "wire"));
  }
  active = key;
  sceneButtons.forEach((b) => b.classList.toggle("active", b.dataset.scene === key));

  viewBox.replaceChildren(
    ...Object.entries(def.views).map(([name, view]) => {
      const b = document.createElement("button");
      b.textContent = view.label;
      b.dataset.view = name;
      b.addEventListener("click", () => {
        stopIntro();
        if (!SCENES[active].views[name]) return;
        // in photo mode, photo views show their photo; other views go back to the model
        if (mode === "photo" && view.photo) {
          goTo(name, true);
          showPhoto(view.photo);
        } else {
          if (mode === "photo") setModel(modelMode);
          goTo(name);
        }
      });
      return b;
    }),
  );

  // one checkbox per group of objects the scene can hide
  const groups = built[key].userData.layers;
  layerBox.replaceChildren(
    ...def.layers.map(({ key: name, label }) => {
      const row = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = groups[name].visible;
      box.addEventListener("change", () => (groups[name].visible = box.checked));
      row.append(box, ` ${label}`);
      return row;
    }),
  );
}

// photo first, then the model: the photo fades in over whatever is on
// screen, the new scene is swapped in behind it, and the photo fades away
async function switchScene(key) {
  const def = SCENES[key];
  const run = { key };
  intro = run;

  const spec = def.views[def.intro].photo;
  setModeButtons("photo");
  await showPhoto(spec);
  if (intro !== run) return;
  await wait(FADE_IN);
  if (intro !== run) return;

  showScene(key);
  goTo(def.intro, true);
  await wait(PHOTO_HOLD);
  if (intro !== run) return;

  stopIntro();
}

// ends the sequence early (a click or a drag); the new scene still shows
function stopIntro() {
  if (!intro) return;
  if (active !== intro.key) {
    showScene(intro.key);
    goTo(SCENES[intro.key].intro, true);
  }
  intro = null;
  setModel(modelMode);
}

sceneButtons.forEach((b) => b.addEventListener("click", () => switchScene(b.dataset.scene)));

// once you drag, you're no longer standing where the photo was taken
controls.addEventListener("start", () => {
  stopIntro();
  if (mode === "photo") setModel(modelMode);
  tween = null;
  frame.hidden = true;
  viewBox.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  current = null;
});

// ---------- doors: a title card, then the next scene ----------

const slate = document.querySelector("#slate");
const SLATE_IN = 700; // keep in sync with #slate's transition in the CSS
const SLATE_HOLD = 2200;
const SLATE_OUT = 1100;
let crossing = false;

// walk toward the door, cut to a white card with the scene's name, then open on the new scene
async function enterPortal(portal, point) {
  if (crossing) return;
  crossing = true;
  canvas.style.cursor = "";
  slate.querySelector(".slate-number").textContent = portal.number;
  slate.querySelector(".slate-title").textContent = portal.title;
  slate.querySelector(".slate-line").textContent = portal.line || "";
  // the next scene's photo, washed out behind the type; wait for it so it fades in with the card
  const def = SCENES[portal.to];
  const src = def.views[def.intro].photo?.src;
  const bg = slate.querySelector(".slate-photo");
  bg.style.backgroundImage = "";
  if (src) {
    const img = new Image();
    img.src = src;
    try {
      await img.decode();
      bg.style.backgroundImage = `url("${src}")`;
    } catch {
      // no photo: plain white card
    }
  }

  // a short dolly toward the door while the card fades in
  const dir = point.clone().sub(camera.position);
  tween = {
    start: performance.now(),
    from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov },
    to: { pos: camera.position.clone().addScaledVector(dir, 0.6), target: point.clone(), fov: camera.fov },
  };
  slate.hidden = false;
  slate.getBoundingClientRect(); // start the fade from transparent
  slate.classList.add("show");
  await wait(SLATE_IN + SLATE_HOLD);

  showScene(portal.to);
  goTo(def.intro, true);
  setModel(modelMode);
  slate.classList.remove("show");
  await wait(SLATE_OUT);
  slate.hidden = true;
  crossing = false;
}

// ---------- clicking 3D-scanned objects ----------

// a click is a press and release without dragging the view
let downAt = null;
canvas.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
canvas.addEventListener("pointerup", (e) => {
  const moved = downAt ? Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) : 99;
  downAt = null;
  if (moved > 5 || !active || intro || crossing || mode === "photo" || isOpen()) return;
  const hit = pick(built[active], camera, e.clientX, e.clientY, canvas);
  if (hit?.scan) openScan(hit.scan);
  if (hit?.portal) enterPortal(hit.portal, hitPoint(e));
});

// the world point under the pointer, for the dolly toward a door
const ray = new THREE.Raycaster();
function hitPoint(e) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hits = ray.intersectObjects(built[active].children, true);
  return hits.length ? hits[0].point : controls.target.clone();
}
// a pointing hand over anything that opens a scan
canvas.addEventListener("pointermove", (e) => {
  if (e.buttons || !active || crossing || e.pointerType !== "mouse") return;
  canvas.style.cursor = pick(built[active], camera, e.clientX, e.clientY, canvas) ? "pointer" : "";
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (current && !tween) camera.fov = viewFov(SCENES[active].views[current]);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// the page opens on scene 1 with its photo. A link can pick a scene,
// e.g. #studio, or go straight to one view of it, e.g. #studio/aisle
const [startScene, startView] = location.hash.slice(1).split("/");
if (SCENES[startScene] && SCENES[startScene].views[startView]) {
  showScene(startScene);
  goTo(startView, true);
} else {
  switchScene(SCENES[startScene] ? startScene : Object.keys(SCENES)[0]);
}

renderer.setAnimationLoop((now) => {
  if (!active) return;
  updateTween(now);
  controls.update();
  SCENES[active].update?.(camera);
  pulseMarkers(built[active], now);
  controls.enabled = !isOpen();
  renderer.render(built[active], camera);
  renderViewer(now);
});
