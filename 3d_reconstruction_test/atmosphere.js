import * as THREE from "three";
import paper from "./styles/paper.js";
import littlePrince from "./styles/little_prince.js";
import starryNight from "./styles/starry_night.js";
import deepSea from "./styles/deep_sea.js";
import mosaic from "./styles/mosaic.js";

/* ------------------------------------------------------------------
   Atmosphere: the look all the scenes share, so they read as pages of
   one poem with different weather. Each scene describes its own air
   in a `mood` (see DEFAULT below for the fields):

     sky    a dome behind the model, washed from the horizon up
     fog    the far parts of the model fade into the horizon's colour
     grade  the finished picture: its tint, how much colour it keeps,
            the paper grain printed over it, the darkening at its edges

   A scene may change its mood while it is on screen (the studio goes
   from dusk to night); the values are read again every frame.

   How the picture is made from that is a `style` (styles/*.js): paper
   is the plain one; the others repaint the same scene and the same
   weather as a watercolour, in thick oil paint, or under water.
   A style is a handful of pieces of shader code:

     sky     vec3 sky(vec3 d)       the sky's colour in direction d
     field   vec4 field(vec2 uv)    optional, small: anything paint() wants worked out first
                                    (while it runs, tField still holds its result of the frame before)
     paint   vec4 paint(vec2 uv)    optional: the picture repainted, one value per CSS pixel
     finish  vec3 finish(vec2 uv)   the last touch, at the screen's full sharpness
     shared  code that all of the above can use

   The pieces can call the helpers in COMMON and read the values in
   UNIFORMS below. Without paint(), finish() works straight from the
   scene as it was drawn (tSharp).
------------------------------------------------------------------- */

const STYLES = [paper, littlePrince, starryNight, deepSea, mosaic];

const DEFAULT = {
  sky: { top: "#f6eee9", horizon: "#f6eee9", ground: "#f6eee9" },
  // near/far are tuned for a camera `ref` metres from what it looks at;
  // from further away the fog backs off, so an overview isn't lost in it
  fog: { color: "#f6eee9", near: 1000, far: 2000, ref: 50 },
  grade: { tint: "#ffffff", saturation: 1, grain: 0.07, vignette: 0.3 },
  dark: false, // true when the picture is dark enough that the page's text should turn pale
};

const UNIFORMS = `
uniform sampler2D tSharp; // the scene as it was drawn, at the screen's full sharpness, in linear light
uniform sampler2D tScene; // the same at one texel per CSS pixel, with smaller copies of itself (textureLod); alpha 0 where there is only sky
uniform sampler2D tSoft; // the same, a quarter that size and blurred
uniform sampler2D tField; // what the style's field() worked out, a quarter the size
uniform sampler2D tPaint; // what the style's paint() painted
uniform vec2 uSize; // the picture in CSS pixels
uniform float uTime; // seconds
uniform float uTick; // seconds since the frame before
uniform float uWire; // 1 when the model is shown as a wireframe
uniform mat3 uRay; // from a point of the picture (-1..1 both ways, then 1) to its direction in the world
uniform vec3 uTop; // the mood's sky
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uFog; // what the far parts of the model fade into
uniform vec3 uTint; // the mood's grade
uniform float uSaturation;
uniform float uGrain;
uniform float uVignette;
`;

const COMMON = `
#define TAU 6.2831853
// a colour written the way a colour picker shows it (0..255)
#define RGB(r, g, b) pow(vec3(r, g, b) / 255.0, vec3(2.2))

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// a few layers of noise, each finer and fainter: clouds, stains, currents
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + 17.3;
    amp *= 0.5;
  }
  return sum / 0.9375;
}
// three random numbers for a grid cell, worked out in whole numbers so every screen gets the same ones
uint scramble(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352dU;
  x ^= x >> 15;
  x *= 0x846ca68bU;
  x ^= x >> 16;
  return x;
}
vec3 hash3(vec2 cell) {
  ivec2 i = ivec2(floor(cell));
  uint n = scramble(uint(i.x) + scramble(uint(i.y)));
  return vec3(float(n & 1023u), float((n >> 10) & 1023u), float((n >> 20) & 1023u)) / 1023.0;
}
// noise in space, for patterns on the dome of the sky (nothing wraps or pinches)
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 o = i.xy + i.z * vec2(37.0, 17.0);
  vec2 a = mix(vec2(hash(o), hash(o + vec2(37.0, 17.0))), vec2(hash(o + vec2(1.0, 0.0)), hash(o + vec2(38.0, 17.0))), f.x);
  vec2 b = mix(vec2(hash(o + vec2(0.0, 1.0)), hash(o + vec2(37.0, 18.0))), vec2(hash(o + vec2(1.0, 1.0)), hash(o + vec2(38.0, 18.0))), f.x);
  vec2 c = mix(a, b, f.y);
  return mix(c.x, c.y, f.z);
}
`;

const FLAT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// makes tScene from tSharp: each CSS pixel is the average of the screen pixels under it. Now and then a
// pixel of the scene comes out broken (not a number); here it is left out, because in the smaller copies
// and the blur it would spread into a black blot
const TIDY = `
uniform sampler2D tSharp;
uniform vec2 uSize;
varying vec2 vUv;
void main() {
  ivec2 size = textureSize(tSharp, 0);
  vec2 at = vUv * vec2(size);
  vec2 reach = 0.25 * vec2(size) / uSize;
  vec4 sum = vec4(0.0);
  float count = 0.0;
  for (int j = -1; j <= 1; j += 2) {
    for (int i = -1; i <= 1; i += 2) {
      vec4 c = texelFetch(tSharp, clamp(ivec2(at + reach * vec2(float(i), float(j))), ivec2(0), size - 1), 0);
      if (any(isnan(c)) || any(isinf(c))) continue;
      sum += c;
      count += 1.0;
    }
  }
  gl_FragColor = count > 0.0 ? min(vec4(64.0), max(vec4(0.0), sum / count)) : vec4(0.0, 0.0, 0.0, 1.0);
}`;

// the blur that makes tSoft: one pass across, one pass down
const BLUR = `
uniform sampler2D tSource;
uniform vec2 uStep;
uniform float uLevel;
varying vec2 vUv;
void main() {
  vec4 c = textureLod(tSource, vUv, uLevel) * 0.227027;
  c += (textureLod(tSource, vUv + uStep * 1.384615, uLevel) + textureLod(tSource, vUv - uStep * 1.384615, uLevel)) * 0.316216;
  c += (textureLod(tSource, vUv + uStep * 3.230769, uLevel) + textureLod(tSource, vUv - uStep * 3.230769, uLevel)) * 0.070270;
  gl_FragColor = c;
}`;

export function createAtmosphere(renderer) {
  // the scene is drawn into this first (smoothed, in linear light)
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
  // what the styles work in on the way from there to the screen
  const sheetOf = (options) => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, ...options });
  const copies = { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }; // keeps smaller copies of itself
  const tidied = sheetOf(copies);
  const blurred = sheetOf();
  const soft = sheetOf(copies);
  const fields = [sheetOf(), sheetOf()]; // this frame's field() and the last one's, taking turns
  const paint = sheetOf();

  const uniforms = {
    tSharp: { value: target.texture },
    tScene: { value: tidied.texture },
    tSoft: { value: soft.texture },
    tField: { value: fields[0].texture },
    tPaint: { value: paint.texture },
    uSize: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uTick: { value: 0 },
    uWire: { value: 0 },
    uRay: { value: new THREE.Matrix3() },
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() },
    uTint: { value: new THREE.Color() },
    uSaturation: { value: 1 },
    uGrain: { value: 0 },
    uVignette: { value: 0 },
  };

  const tidy = new THREE.ShaderMaterial({
    uniforms: { tSharp: uniforms.tSharp, uSize: uniforms.uSize },
    vertexShader: FLAT,
    fragmentShader: TIDY,
    depthTest: false,
    depthWrite: false,
  });
  const blur = new THREE.ShaderMaterial({
    uniforms: { tSource: { value: null }, uStep: { value: new THREE.Vector2() }, uLevel: { value: 0 } },
    vertexShader: FLAT,
    fragmentShader: BLUR,
    depthTest: false,
    depthWrite: false,
  });

  // one of a style's pieces as a full-screen pass; `screen` for the one that ends on the screen
  function piece(style, name, out, screen = false) {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: FLAT,
      fragmentShader: `
        ${UNIFORMS}
        varying vec2 vUv;
        ${COMMON}
        ${style.shared || ""}
        ${style[name]}
        void main() {
          gl_FragColor = ${out};
          ${screen ? "#include <colorspace_fragment>" : ""}
        }`,
      depthTest: false,
      depthWrite: false,
    });
  }

  // the sky: a dome that travels with the camera, painted by the style
  function skyOf(style) {
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        ${UNIFORMS}
        varying vec3 vDir;
        ${COMMON}
        ${style.shared || ""}
        ${style.sky}
        void main() {
          gl_FragColor = vec4(sky(normalize(vDir)), 0.0);
        }`,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
    });
  }

  // a style's shaders are put together the first time it is used
  const made = new Map();
  function materialsOf(style) {
    if (!made.has(style.key)) {
      made.set(style.key, {
        sky: skyOf(style),
        field: style.field && piece(style, "field", "field(vUv)"),
        paint: style.paint && piece(style, "paint", "paint(vUv)"),
        finish: piece(style, "finish", "vec4(finish(vUv), 1.0)", true),
      });
    }
    return made.get(style.key);
  }

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  sheet.frustumCulled = false;
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function pass(material, to) {
    sheet.material = material;
    renderer.setRenderTarget(to);
    renderer.render(sheet, flat);
  }

  const size = new THREE.Vector2();
  const small = new THREE.Vector2();
  const tint = new THREE.Color();
  let style = STYLES[0];

  return {
    styles: STYLES.map(({ key, label }) => ({ key, label })),

    setStyle(key) {
      style = STYLES.find((s) => s.key === key) || STYLES[0];
    },

    // call once for each built scene: gives it its sky and fog
    attach(scene, mood = {}) {
      scene.userData.mood = {
        sky: { ...DEFAULT.sky, ...mood.sky },
        fog: { ...DEFAULT.fog, ...mood.fog },
        grade: { ...DEFAULT.grade, ...mood.grade },
        dark: mood.dark ?? DEFAULT.dark,
      };
      scene.userData.live = mood; // the scene's own object: it may change it as time passes
      const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16));
      sky.renderOrder = -10; // drawn first, behind everything
      sky.frustumCulled = false;
      sky.raycast = () => {}; // never in the way of a click
      scene.userData.sky = sky;
      scene.add(sky);
      scene.fog = new THREE.Fog("#ffffff", 1, 2);
    },

    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
      const ratio = renderer.getPixelRatio();
      size.divideScalar(ratio).round(); // from here on in CSS pixels
      uniforms.uSize.value.copy(size);
      for (const t of [tidied, paint]) t.setSize(size.x, size.y);
      small.copy(size).divideScalar(4).ceil();
      for (const t of [blurred, soft, ...fields]) t.setSize(small.x, small.y);
    },

    // `focus` is how far the camera is from what it looks at; `wire` says the model is shown as a wireframe
    render(scene, camera, focus, wire = false) {
      const m = scene.userData.mood;
      // pick up whatever the scene changed since the last frame
      const live = scene.userData.live;
      for (const part of ["sky", "fog", "grade"]) Object.assign(m[part], live[part]);
      m.dark = live.dark ?? m.dark;

      const parts = materialsOf(style);
      const sky = scene.userData.sky;
      sky.material = parts.sky;
      sky.position.copy(camera.position);

      // the style may thicken the air and colour it (under water you can't see far)
      const air = style.fog || {};
      const back = Math.max(0, focus - m.fog.ref);
      scene.fog.color.set(m.fog.color);
      if (air.color) scene.fog.color.lerp(tint.set(air.color), air.strength ?? 1);
      scene.fog.near = (m.fog.near + back) * (air.near ?? 1);
      scene.fog.far = (m.fog.far + back) * (air.far ?? 1);

      const u = uniforms;
      u.uFog.value.copy(scene.fog.color);
      const now = performance.now() / 1000;
      u.uTick.value = Math.min(now - u.uTime.value, 0.25);
      u.uTime.value = now;
      u.uWire.value = wire ? 1 : 0;
      u.uTop.value.set(m.sky.top);
      u.uHorizon.value.set(m.sky.horizon);
      u.uGround.value.set(m.sky.ground);
      u.uTint.value.set(m.grade.tint);
      u.uSaturation.value = m.grade.saturation;
      u.uGrain.value = m.grade.grain;
      u.uVignette.value = m.grade.vignette;

      renderer.setRenderTarget(target);
      renderer.render(scene, camera);

      // which way each point of the picture looks, for styles that paint things in the air
      const e = camera.matrixWorld.elements;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const w = tan * camera.aspect;
      u.uRay.value.set(e[0] * w, e[4] * tan, -e[8], e[1] * w, e[5] * tan, -e[9], e[2] * w, e[6] * tan, -e[10]);

      if (parts.paint) {
        pass(tidy, tidied);
        // tSoft: across (from a quarter-size copy of the scene), then down
        blur.uniforms.tSource.value = tidied.texture;
        blur.uniforms.uLevel.value = 2;
        blur.uniforms.uStep.value.set(1 / small.x, 0);
        pass(blur, blurred);
        blur.uniforms.tSource.value = blurred.texture;
        blur.uniforms.uLevel.value = 0;
        blur.uniforms.uStep.value.set(0, 1 / small.y);
        pass(blur, soft);
        if (parts.field) {
          u.tField.value = fields[0].texture; // the frame before's, for field() to read
          pass(parts.field, fields[1]);
          u.tField.value = fields[1].texture;
          fields.reverse();
        }
        pass(parts.paint, paint);
      }
      pass(parts.finish, null);
      return { dark: style.dark ?? m.dark };
    },
  };
}
