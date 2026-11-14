import * as THREE from "three";

/* ------------------------------------------------------------------
   Atmosphere: the look all the scenes share, so they read as pages of
   one poem with different weather. Each scene describes its own air
   in a `mood` (see DEFAULT below for the fields):

     sky    a dome behind the model, washed from the horizon up
     fog    the far parts of the model fade into the horizon's colour
     grade  the finished picture: its tint, how much colour it keeps,
            the ink lines drawn around its shapes, the paper grain
            printed over it, the darkening at its edges

   A scene may change its mood while it is on screen (the studio goes
   from dusk to night); the values are read again every frame.
------------------------------------------------------------------- */

const DEFAULT = {
  sky: { top: "#f6eee9", horizon: "#f6eee9", ground: "#f6eee9" },
  // near/far are tuned for a camera `ref` metres from what it looks at;
  // from further away the fog backs off, so an overview isn't lost in it
  fog: { color: "#f6eee9", near: 1000, far: 2000, ref: 50 },
  // ink is the colour of the hand-drawn outlines, line how strong they are (0: none)
  grade: { tint: "#ffffff", saturation: 1, grain: 0.07, vignette: 0.3, ink: "#2a211d", line: 0.8 },
  dark: false, // true when the picture is dark enough that the page's text should turn pale
};

const NOISE = `
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
`;

// the sky: horizon colour low down, top colour overhead, with an uneven wash
// like watercolour that hasn't dried flat; below the horizon it settles into haze
function makeSky() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uGround: { value: new THREE.Color() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uGround;
        varying vec3 vDir;
        ${NOISE}
        void main() {
          vec3 d = normalize(vDir);
          vec2 p = d.xz / (abs(d.y) + 0.35);
          float wash = noise(p * 1.3) * 0.6 + noise(p * 3.1 + 7.0) * 0.4;
          float up = pow(clamp(d.y, 0.0, 1.0), 0.55);
          vec3 c = mix(uHorizon, uTop, clamp(up * (0.75 + 0.5 * wash), 0.0, 1.0));
          c = mix(c, uGround, smoothstep(0.0, -0.3, d.y));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.renderOrder = -10; // drawn first, behind everything
  sky.frustumCulled = false;
  sky.raycast = () => {}; // never in the way of a click
  return sky;
}

// the finished picture, printed: tint and colour, ink outlines, paper fibres and grain, darker edges
function makePrint(target) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: target.texture },
      tDepth: { value: target.depthTexture },
      uSize: { value: new THREE.Vector2(1, 1) }, // the picture in CSS pixels
      uStep: { value: new THREE.Vector2(1, 1) }, // half a line's width, as a step across the picture
      uClip: { value: new THREE.Vector2(0.1, 400) }, // the camera's near and far
      uFog: { value: new THREE.Vector2(1, 2) }, // where the fog starts and ends: the lines fade with it
      uTint: { value: new THREE.Color() },
      uSaturation: { value: 1 },
      uInk: { value: new THREE.Color() },
      uLine: { value: 0 },
      uGrain: { value: 0 },
      uVignette: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D tScene;
      uniform sampler2D tDepth;
      uniform vec2 uSize;
      uniform vec2 uStep;
      uniform vec2 uClip;
      uniform vec2 uFog;
      uniform vec3 uTint;
      uniform float uSaturation;
      uniform vec3 uInk;
      uniform float uLine;
      uniform float uGrain;
      uniform float uVignette;
      varying vec2 vUv;
      ${NOISE}

      // 1 / distance at a point of the picture. Across any flat face this changes
      // evenly, so where it bends there is a fold, and where it jumps, an outline
      float near(vec2 uv) {
        float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
        return (uClip.y + uClip.x - z * (uClip.y - uClip.x)) / (2.0 * uClip.x * uClip.y);
      }
      // x: how sharply the surface folds or breaks at uv (0 on a flat face); y: how far away it is
      vec2 fold(vec2 uv) {
        float c = near(uv);
        float l = near(uv - vec2(uStep.x, 0.0));
        float r = near(uv + vec2(uStep.x, 0.0));
        float d = near(uv - vec2(0.0, uStep.y));
        float u = near(uv + vec2(0.0, uStep.y));
        float closest = max(c, max(max(l, r), max(d, u)));
        return vec2((abs(l + r - 2.0 * c) + abs(d + u - 2.0 * c)) / (c * uStep.y), 1.0 / closest);
      }
      // one pen stroke: the line is drawn where the surface folds, but a little off true,
      // wandering by a few pixels the way a hand does
      float stroke(vec2 px, float wander, float seed) {
        vec2 off = vec2(noise(px * 0.03 + seed), noise(px * 0.03 + seed + 40.0)) - 0.5;
        off += (vec2(noise(px * 0.11 + seed), noise(px * 0.11 + seed + 9.0)) - 0.5) * 0.4;
        vec2 f = fold(vUv + off * wander / uSize);
        float far = smoothstep(uFog.x, uFog.y, f.y);
        return smoothstep(0.7, 2.2, f.x) * (1.0 - far) * (1.0 - far);
      }

      void main() {
        vec3 c = texture2D(tScene, vUv).rgb;
        float grey = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(grey), c, uSaturation) * uTint;
        vec2 px = vUv * uSize;

        // ink: a firm stroke and a fainter second one beside it; the pen presses unevenly
        if (uLine > 0.0) {
          float line = max(stroke(px, 2.6, 0.0), stroke(px, 5.0, 23.0) * 0.4);
          float press = 0.6 + 0.4 * noise(px * 0.05 + 3.0);
          c = mix(c, uInk, line * press * uLine);
        }

        // paper: long fibres both ways, blotches, and fine tooth
        float fibre = noise(px * vec2(0.55, 0.06)) + noise(px * vec2(0.07, 0.6) + 31.0);
        float blotch = noise(px * 0.012 + 5.0);
        float tooth = hash(floor(px));
        float paper = (fibre - 1.0) * 0.5 + (blotch - 0.5) * 0.8 + (tooth - 0.5) * 0.7;
        c *= 1.0 + paper * uGrain;

        vec2 q = (vUv - 0.5) * vec2(1.0, 0.9);
        c *= 1.0 - uVignette * smoothstep(0.32, 0.85, length(q));

        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    depthTest: false,
    depthWrite: false,
  });
}

export function createAtmosphere(renderer) {
  // the scene is drawn into this first (smoothed, in linear light), then printed to the screen;
  // its depth is kept too, to find the edges the ink lines follow
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1) });
  const print = makePrint(target);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), print);
  sheet.frustumCulled = false;
  const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new THREE.Vector2();

  return {
    // call once for each built scene: gives it its sky and fog
    attach(scene, mood = {}) {
      scene.userData.mood = {
        sky: { ...DEFAULT.sky, ...mood.sky },
        fog: { ...DEFAULT.fog, ...mood.fog },
        grade: { ...DEFAULT.grade, ...mood.grade },
        dark: mood.dark ?? DEFAULT.dark,
      };
      scene.userData.live = mood; // the scene's own object: it may change it as time passes
      scene.userData.sky = makeSky();
      scene.add(scene.userData.sky);
      scene.fog = new THREE.Fog("#ffffff", 1, 2);
    },

    resize() {
      renderer.getDrawingBufferSize(size);
      target.setSize(size.x, size.y);
      print.uniforms.uSize.value.copy(size).divideScalar(renderer.getPixelRatio());
      // a line is about two CSS pixels wide, and never thinner than two of the screen's own
      const half = Math.max(1, 0.9 * renderer.getPixelRatio());
      print.uniforms.uStep.value.set(half / size.x, half / size.y);
    },

    // `focus` is how far the camera is from what it looks at; `lines` turns the ink on
    // (it is off for the wireframe, which is all lines already)
    render(scene, camera, focus, lines = true) {
      const m = scene.userData.mood;
      // pick up whatever the scene changed since the last frame
      const live = scene.userData.live;
      for (const part of ["sky", "fog", "grade"]) Object.assign(m[part], live[part]);
      m.dark = live.dark ?? m.dark;

      const sky = scene.userData.sky;
      sky.position.copy(camera.position);
      sky.material.uniforms.uTop.value.set(m.sky.top);
      sky.material.uniforms.uHorizon.value.set(m.sky.horizon);
      sky.material.uniforms.uGround.value.set(m.sky.ground);

      const back = Math.max(0, focus - m.fog.ref);
      scene.fog.color.set(m.fog.color);
      scene.fog.near = m.fog.near + back;
      scene.fog.far = m.fog.far + back;

      print.uniforms.uTint.value.set(m.grade.tint);
      print.uniforms.uSaturation.value = m.grade.saturation;
      print.uniforms.uInk.value.set(m.grade.ink);
      print.uniforms.uLine.value = lines ? m.grade.line : 0;
      print.uniforms.uClip.value.set(camera.near, camera.far);
      print.uniforms.uFog.value.set(scene.fog.near, scene.fog.far);
      print.uniforms.uGrain.value = m.grade.grain;
      print.uniforms.uVignette.value = m.grade.vignette;

      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(sheet, flat);
      return m;
    },
  };
}
