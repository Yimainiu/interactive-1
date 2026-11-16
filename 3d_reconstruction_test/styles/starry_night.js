/* ------------------------------------------------------------------
   Starry Night: the scene in thick oil paint, after Van Gogh. The sky
   is wound up into whirls, with ringed stars and a moon; everything is
   laid down in strokes of the brush that follow the shapes in the
   picture: long ones over the plain parts, smaller ones wherever
   there is something to draw. The paint stands up off the canvas.
------------------------------------------------------------------- */

// What is where in the sky. Angles are in degrees: round from the scenes' x axis (toward z;
// the other way for negative numbers) and up from the horizon. The scenes' views mostly see the lowest 20°.
// whirls: [round, up, size, which way the air is wound up: 1 or -1]
const WHIRLS = [
  [39.5, 15.7, 12.1, 1],
  [96.7, 15.8, 13.5, -1],
  [163.9, 13.5, 10.4, -1],
  [-99.3, 15.8, 10.6, 1], // over the main gate's courtyard
  [-57.3, 19.3, 10.7, -1],
];
// stars: [round, up, size of its bright middle, how orange (0..1)]
const STARS = [
  [-91.6, 13.8, 4.6, 0.6], // over the main gate's courtyard
  [179, 8.5, 1.9, 0.3], // at the far end of the studio's aisle
  [4.1, 11.4, 3.7, 0.4],
  [27.4, 46.7, 2.6, 0.9],
  [39.9, 11.4, 2.0, 0.4],
  [51.9, 32.8, 4.2, 0.5],
  [68.3, 11.6, 2.9, 0.4],
  [89.1, 25.9, 3.4, 0.2],
  [110.9, 14.9, 3.3, 0.7],
  [127.4, 19.6, 2.0, 0.0],
  [141.5, 15.5, 4.7, 0.8],
  [150.0, 32.6, 3.4, 0.5],
  [-168.3, 23.6, 2.4, 0.1],
  [-156.9, 10.6, 2.2, 0.3],
  [-136.2, 28.4, 2.5, 0.3],
  [-106.5, 21.0, 2.4, 0.1],
  [-68.3, 27.0, 3.2, 0.3],
  [-57.9, 11.6, 4.2, 0.4],
  [-43.9, 36.0, 3.9, 0.6],
  [-30.0, 15.1, 3.3, 0.7],
  [-5.8, 41.2, 2.4, 0.8],
  [160, 56, 3.0, 0.5],
];
const MOON = [-117.5, 11.5, 2.06]; // low on the left over the main gate's courtyard

// a list of those for the shader: each one's direction (xyz) and its last number or two
const rad = (deg) => (deg * Math.PI) / 180;
const num = (n) => n.toFixed(5);
const direction = (round, up) => [Math.cos(rad(round)) * Math.cos(rad(up)), Math.sin(rad(up)), Math.sin(rad(round)) * Math.cos(rad(up))].map(num).join(", ");
const listed = (rows, last) => `vec4[${rows.length}](${rows.map((r) => `vec4(${direction(r[0], r[1])}, ${num(last(r))})`).join(", ")})`;

export default {
  key: "starry",
  label: "Starry Night",

  shared: `
    // the scene's colours pushed toward the painting's: more colour everywhere,
    // deep blue in the shade, straw yellow in the light
    vec3 tone(vec3 c) {
      float l = luma(c);
      c = max(mix(vec3(l), c, 1.55), 0.0);
      vec3 shade = c * vec3(0.5, 0.72, 1.35) + vec3(0.003, 0.01, 0.045);
      vec3 light = c * vec3(1.16, 1.04, 0.7);
      return mix(shade, light, smoothstep(0.04, 0.5, l));
    }
    // a colour turned round the colour wheel by a (radians)
    vec3 hueTurn(vec3 c, float a) {
      vec3 k = vec3(0.57735);
      return c * cos(a) + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - cos(a));
    }
  `,

  sky: `
    // each whirl's middle, and its size (radians) times the way it turns
    const vec4 WHIRLS[${WHIRLS.length}] = ${listed(WHIRLS, (w) => rad(w[2]) * w[3])};
    // each star's place, and the size of its bright middle (radians) plus how orange it is (0..0.9)
    const vec4 STARS[${STARS.length}] = ${listed(STARS, (s) => Math.round(rad(s[2]) * 1000) + s[3] * 0.9)};
    const vec4 MOON = vec4(${direction(MOON[0], MOON[1])}, ${num(rad(MOON[2]))});
    const vec3 MOON_SHADE = vec3(${direction(MOON[0] + 1.7, MOON[1] + 0.45)}); // the dark part of the moon is a second disc, a little to one side

    vec3 turn(vec3 d, vec3 axis, float a) {
      return d * cos(a) + cross(axis, d) * sin(a) + axis * dot(axis, d) * (1.0 - cos(a));
    }
    // how far apart two directions are, in radians
    float apart(vec3 a, vec3 b) {
      return acos(clamp(dot(a, b), -1.0, 1.0));
    }

    vec3 sky(vec3 d) {
      float day = clamp(luma(uTop) * 2.0, 0.0, 1.0); // how light the scene's own sky is

      // whirls: the air is wound up around a few points low in the sky
      vec3 q = d;
      for (int i = 0; i < ${WHIRLS.length}; i++) {
        vec4 w = WHIRLS[i];
        q = turn(q, w.xyz, sign(w.w) * 5.0 * exp(-1.2 * apart(q, w.xyz) / abs(w.w)));
      }
      // currents: long streaks running round the horizon, drifting, which the whirls have caught
      float drift = uTime * 0.008;
      vec3 s = vec3(q.x * cos(drift) - q.z * sin(drift), q.y * 5.5, q.x * sin(drift) + q.z * cos(drift));
      float flow = noise3(s * 3.1) * 0.55 + noise3(s * 7.3 + 9.0) * 0.3 + noise3(s * 15.0 + 31.0) * 0.15;
      flow = smoothstep(0.22, 0.78, flow);

      vec3 c = mix(mix(RGB(9.0, 18.0, 62.0), RGB(20.0, 50.0, 120.0), day), mix(RGB(26.0, 60.0, 142.0), RGB(46.0, 104.0, 186.0), day), smoothstep(0.0, 0.45, flow));
      c = mix(c, mix(RGB(80.0, 136.0, 200.0), RGB(128.0, 186.0, 222.0), day), smoothstep(0.42, 0.72, flow));
      c = mix(c, RGB(204.0, 228.0, 212.0), smoothstep(0.78, 1.0, flow) * 0.8);

      // stars: a hot middle in its own bright air, and rings of light going out from it
      for (int i = 0; i < ${STARS.length}; i++) {
        vec4 star = STARS[i];
        float size = floor(star.w) / 1000.0;
        float near = dot(d, star.xyz);
        if (1.0 - near > 6.5 * size * size) continue; // too far from this one to be touched by it
        float r = acos(min(near, 1.0)) / size;
        float rings = 0.5 + 0.5 * cos(r * 7.5 - uTime * 0.7 + float(i) * 2.4);
        c = mix(c, mix(RGB(150.0, 200.0, 215.0), RGB(255.0, 232.0, 120.0), rings), exp(-r * 0.95) * 0.85);
        c = mix(c, RGB(255.0, 226.0, 96.0) * 1.15, exp(-r * r * 1.5));
        c = mix(c, mix(RGB(255.0, 246.0, 200.0), RGB(255.0, 170.0, 50.0), fract(star.w)) * 1.25, 1.0 - smoothstep(0.24, 0.44, r));
      }
      // the moon: a crescent in a wide bright air of its own
      float r = apart(d, MOON.xyz) / MOON.w;
      if (r < 6.0) {
        float rings = 0.5 + 0.5 * cos(r * 4.6 - uTime * 0.5);
        c = mix(c, mix(RGB(170.0, 205.0, 190.0), RGB(250.0, 226.0, 110.0), rings), exp(-r * 0.6) * 0.9);
        c = mix(c, RGB(252.0, 224.0, 104.0), exp(-r * r * 0.3));
        float crescent = (1.0 - smoothstep(0.9, 1.0, r)) * smoothstep(0.78, 0.9, apart(d, MOON_SHADE) / MOON.w);
        c = mix(c, RGB(255.0, 168.0, 34.0) * 1.2, crescent);
      }

      // the light lying along the horizon, in the scene's own colour, and under it the haze
      vec3 low = tone(uHorizon) * 1.05 + vec3(0.03, 0.03, 0.0);
      c = mix(c, low, (1.0 - smoothstep(0.0, 0.11, d.y + (flow - 0.5) * 0.1)) * 0.9);
      return mix(tone(uGround), c, smoothstep(-0.3, 0.0, d.y));
    }`,

  // which way the brush goes at each point of the picture, and how much there is to draw there.
  // xy: the direction, as (cos 2a, sin 2a) so that two can be blended; z: an edge is near; w: small things here.
  // All of it changes slowly, a little each frame: otherwise every stroke would twitch with every drop of rain
  field: `
    float bright(vec2 uv) {
      return sqrt(luma(textureLod(tSoft, uv, 0.0).rgb));
    }
    vec2 doubled(vec2 v) {
      return vec2(v.x * v.x - v.y * v.y, 2.0 * v.x * v.y);
    }
    vec4 field(vec2 uv) {
      vec2 px = uv * uSize;
      vec2 t = 4.0 / uSize; // one step across tSoft
      // the slope of the brightness close by ...
      vec2 close = vec2(bright(uv + vec2(t.x, 0.0)) - bright(uv - vec2(t.x, 0.0)), bright(uv + vec2(0.0, t.y)) - bright(uv - vec2(0.0, t.y))) / 2.0;
      // ... and over a wider ring, so that strokes far from any edge still echo the shapes around them
      vec2 wide = vec2(0.0);
      for (int i = 0; i < 8; i++) {
        float a = float(i) * TAU / 8.0;
        vec2 o = vec2(cos(a), sin(a));
        wide += o * bright(uv + o * t * 7.0);
      }
      wide /= 28.0;
      vec2 slope = close + wide * 0.7;
      float steep = length(slope);
      // strokes run along an edge, not across it
      vec2 along = vec2(-slope.y, slope.x) / max(steep, 0.00001);
      // where the picture is flat the brush follows slow currents of its own
      vec2 p = px * 0.0032;
      float n = fbm(p + 3.0);
      vec2 current = normalize(vec2(n - fbm(p + vec2(0.0, 0.2) + 3.0), fbm(p + vec2(0.2, 0.0) + 3.0) - n) + 0.00001);
      float sure = smoothstep(0.0015, 0.01, steep);
      vec2 dir = mix(doubled(current), doubled(along), sure);

      float small = abs(sqrt(luma(textureLod(tScene, uv, 2.0).rgb)) - bright(uv));
      vec4 now = vec4(dir, smoothstep(0.004, 0.028, length(close)), smoothstep(0.015, 0.1, small));
      vec4 before = texture2D(tField, uv);
      return length(before.xy) > 0.001 ? mix(before, now, 1.0 - exp(-6.0 * uTick)) : now;
    }`,

  paint: `
    // The stroke on top at px, among strokes about cell px apart, each size (length, width) px and lying
    // along dir. Each has three random numbers; the third is the order they were laid in (later ones cover
    // earlier ones), and only strokes for which it is under keep are there at all.
    // Returns the stroke's middle (xy) and where px is across it (z: -1..1; 9 if nothing covers px) and along it (w).
    vec4 stroke(vec2 px, vec2 dir, float cell, vec2 size, float keep, float seed, inout vec3 rnd) {
      vec2 side = vec2(-dir.y, dir.x);
      // strokes are long and thin, so only the grid cells in a band along dir can hold one that reaches px:
      // walk that band a cell at a time along whichever axis dir mostly runs on, with a cell to either side
      bool sideways = abs(dir.x) > abs(dir.y);
      vec2 along = dir / (sideways ? abs(dir.x) : abs(dir.y));
      vec2 beside = sideways ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
      vec4 top = vec4(0.0, 0.0, 9.0, 0.0);
      float last = -1.0;
      for (int i = -3; i <= 3; i++) {
        vec2 here = floor(px / cell + along * float(i));
        for (int j = -1; j <= 1; j++) {
          vec2 id = here + beside * float(j);
          vec3 h = hash3(id + seed);
          if (h.z > keep || h.z < last) continue;
          vec2 d = px - (id + 0.5 + (h.xy - 0.5) * 0.9) * cell;
          float lean = (h.x + h.y - 1.0) * 0.12; // no stroke lies quite true
          float u = dot(d, dir + side * lean) / (0.5 * size.x * (0.55 + 0.6 * h.y));
          float v = dot(d, side - dir * lean) / (0.5 * size.y * (0.7 + 0.6 * h.x));
          if (max(abs(u), abs(v)) < 1.0) {
            last = h.z;
            top = vec4(px - d, v, u);
            rnd = h;
          }
        }
      }
      return top;
    }

    vec4 paint(vec2 uv) {
      vec2 px = uv * uSize;
      vec4 f = texture2D(tField, uv);
      float a = 0.5 * atan(f.y, f.x + 0.000001);
      vec2 dir = vec2(cos(a), sin(a));
      // the bristles leave the canvas at different places: a ragged edge on every stroke
      vec2 at = px + (vec2(noise(px * 0.5), noise(px * 0.5 + 17.0)) - 0.5) * 2.2;

      // the smallest strokes that are there win: small ones where there are small things, middling ones
      // near any edge, long ones everywhere else
      vec3 rnd = vec3(0.5);
      vec4 s = vec4(0.0, 0.0, 9.0, 0.0);
      float level = 0.0;
      if (f.w > 0.03) s = stroke(at, dir, 4.0, vec2(13.0, 4.0), f.w * 1.3, 5.0, rnd);
      if (s.z > 2.0 && f.z > 0.03) {
        s = stroke(at, dir, 7.0, vec2(30.0, 7.0), f.z * 1.3, 3.0, rnd);
        level = 1.0;
      }
      if (s.z > 2.0) {
        s = stroke(at, dir, 13.0, vec2(74.0, 12.0), 2.0, 1.0, rnd);
        level = 2.0;
      }

      // each stroke is one load of paint, the colour of the scene under its middle
      vec4 src = s.z > 2.0 ? texture2D(tSoft, uv) : textureLod(tScene, s.xy / uSize, 0.5 + level);
      vec3 c = mix(src.rgb, tone(src.rgb), src.a);
      float height = 0.3;
      if (s.z < 2.0) {
        // strokes of lighter and darker, warmer and cooler paint side by side
        float l = luma(c);
        c = hueTurn(c, (rnd.y - 0.5) * 0.45) * (0.8 + 0.4 * rnd.x);
        c += mix(vec3(-0.05, 0.0, 0.07), vec3(0.07, 0.035, -0.06), rnd.y) * l;
        // the bristles leave streaks down its length; the paint is pushed up at its sides and where the brush lifts off
        float streak = noise(vec2(s.z * 2.6 + rnd.x * 61.0, s.w * 0.5 + rnd.y * 23.0));
        c *= 0.9 + 0.2 * streak;
        height = (0.25 + 0.4 * streak + 0.25 * smoothstep(0.45, 0.95, abs(s.z)) + 0.2 * smoothstep(0.5, 1.0, s.w)) * (0.7 + 0.6 * rnd.z);
      }
      // the thinnest things (lettering, railings, rain) are finer than any stroke: a small brush goes over them last
      vec4 fine = texture2D(tScene, uv);
      c += (fine.rgb - textureLod(tScene, uv, 1.6).rgb) * 0.8;
      // a wireframe is all thin lines, which strokes this size would break up:
      // its lines are drawn in as they are, over the painted sky
      if (uWire > 0.5) c = mix(c, tone(fine.rgb), fine.a);
      return vec4(max(c, 0.0), height);
    }`,

  finish: `
    vec3 finish(vec2 uv) {
      vec2 px = uv * uSize;
      vec2 e = 1.0 / uSize;
      vec3 c = texture2D(tPaint, uv).rgb;
      // lit from the upper left, the ridges of paint catch the light and throw a little shade
      float dx = texture2D(tPaint, uv + vec2(e.x, 0.0)).a - texture2D(tPaint, uv - vec2(e.x, 0.0)).a;
      float dy = texture2D(tPaint, uv + vec2(0.0, e.y)).a - texture2D(tPaint, uv - vec2(0.0, e.y)).a;
      float relief = dot(vec2(dx, dy), vec2(0.7071, -0.7071));
      c *= 1.0 + clamp(relief, -0.5, 0.5) * 0.9;
      c += pow(max(relief, 0.0), 2.0) * 0.5;
      // the weave of the canvas showing through, and its grain
      float weave = noise(px * vec2(1.1, 0.14)) + noise(px * vec2(0.14, 1.1) + 31.0) - 1.0;
      c *= 1.0 + weave * 0.05 + (hash(floor(px * 2.0)) - 0.5) * 0.04;
      vec2 q = (uv - 0.5) * vec2(1.0, 0.9);
      return c * (1.0 - 0.3 * smoothstep(0.35, 0.9, length(q)));
    }`,
};
