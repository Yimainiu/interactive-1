/* ------------------------------------------------------------------
   Little Prince: the scene as a watercolour in a storybook. Thin,
   clear washes on white paper, laid by a hand that never draws a line
   quite straight: the colour runs where the paper was wet, gathers in
   a darker rim where it dried, and stops short of the edge of the
   sheet. Yellow stars and a few small planets are drawn into the sky,
   whatever the hour.
------------------------------------------------------------------- */

// The planets. Angles are in degrees: round from the scenes' x axis (toward z; the other way for
// negative numbers) and up from the horizon. The scenes' views mostly see the lowest 20° of the sky.
// [round, up, size, colour, 1 if it has a ring]
const PLANETS = [
  [-114.6, 10.9, 2.1, "228.0, 150.0, 96.0", 1], // over the main gate's courtyard
  [177.6, 11.5, 1.7, "150.0, 186.0, 150.0", 0], // at the far end of the studio's aisle
  [51.6, 20.6, 2.6, "196.0, 160.0, 206.0", 1],
];
const rad = (deg) => (deg * Math.PI) / 180;
const num = (n) => n.toFixed(5);
const direction = (round, up) => [Math.cos(rad(round)) * Math.cos(rad(up)), Math.sin(rad(up)), Math.sin(rad(round)) * Math.cos(rad(up))].map(num).join(", ");

export default {
  key: "prince",
  label: "Little Prince",
  dark: false, // the margin is bare paper, whatever the hour: the page's text stays dark

  shared: `
    #define PAPER RGB(246.0, 238.0, 233.0)

    // thinned with water: everything lifts toward the paper and keeps its colour. Nothing is
    // black or brown with dirt: what is dark in the scene is a clear wash of night blue here
    vec3 tone(vec3 c) {
      c = clamp(c, 0.0, 1.0);
      float l = luma(c);
      c = mix(RGB(52.0, 74.0, 150.0) * (0.35 + 6.0 * l), c, smoothstep(0.0, 0.07, l));
      c = pow(c, vec3(0.62));
      // nothing in a paintbox is plain grey: grey things come out sand where they are light, lilac where they are dark
      float plain = 1.0 - clamp((max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b))) * 4.0, 0.0, 1.0);
      c *= mix(vec3(1.0), mix(vec3(0.86, 0.9, 1.1), vec3(1.07, 1.0, 0.86), smoothstep(0.25, 0.75, luma(c))), plain * 0.6);
      c = max(mix(vec3(luma(c)), c, 1.5), 0.0);
      return mix(c, vec3(1.0), 0.1);
    }
    // more pigment (density > 1) or less: the colour deepens or thins, but stays itself
    vec3 pigment(vec3 c, float density) {
      return clamp(c - (c - c * c) * (density - 1.0), 0.0, 1.0);
    }
  `,

  sky: `
    vec3 toward(float az, float el) {
      return vec3(cos(az) * cos(el), sin(el), sin(az) * cos(el));
    }
    // where d is on a flat sheet held up facing the direction c: x to the right, y up
    vec2 around(vec3 d, vec3 c) {
      vec3 right = normalize(vec3(-c.z, 0.0, c.x));
      return vec2(dot(d, right), dot(d, cross(right, c))) / max(dot(d, c), 0.01);
    }
    // a five-pointed star, each point one unit long, the first pointing up: below 0 inside
    float star(vec2 p) {
      float a = abs(mod(atan(p.x, p.y) + 0.6283, 1.2566) - 0.6283);
      vec2 q = length(p) * vec2(cos(a), sin(a));
      return dot(q - vec2(1.0, 0.0), vec2(0.384, 0.923));
    }
    // a small planet at c, r across (radians): its own colour, a shaded side, bands or craters, perhaps a ring.
    // pixel is how much of the sky one pixel of the screen covers (radians), to keep its edges smooth
    vec3 planet(vec3 col, vec3 d, vec3 c, float r, vec3 body, float ring, float pixel) {
      if (dot(d, c) < 0.98) return col; // nowhere near it
      vec2 p = around(d, c) / r;
      float l = length(p);
      float edge = pixel / r;
      // the ring: an ellipse tipped over, passing behind the planet at the top
      vec2 t = vec2(p.x * 0.94 + p.y * 0.34, (p.y * 0.94 - p.x * 0.34) * 3.2);
      float band = (1.0 - smoothstep(0.16, 0.16 + edge * 2.0, abs(length(t) - 1.75))) * ring * 0.9;
      vec3 ringed = body * 0.7 + 0.2;
      col = mix(col, ringed, band * step(0.0, t.y)); // the far half of the ring, behind the planet

      float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, l);
      vec3 b = body * (0.82 + 0.3 * noise(p * vec2(1.2, 5.0) + c.xz * 40.0)); // bands
      b = mix(b, body * 0.55, smoothstep(0.1, 0.9, dot(p, vec2(0.6, -0.8)) * 0.5 + 0.35)); // its shaded side
      float crater = 2.0 - smoothstep(0.14, 0.2, length(p - vec2(-0.3, 0.25))) - smoothstep(0.09, 0.13, length(p - vec2(0.25, -0.1)));
      b = mix(b, body * 0.6, crater * (1.0 - ring) * 0.7);
      col = mix(col, b, disc);
      return mix(col, ringed, band * step(t.y, 0.0)); // the near half, in front
    }

    vec3 sky(vec3 d) {
      float pixel = length(fwidth(d));
      // a wash of the scene's own sky: laid on wet, so it pools here and thins there
      vec2 p = d.xz / (abs(d.y) + 0.35);
      float wash = noise(p * 1.3) * 0.6 + noise(p * 3.1 + 7.0) * 0.4;
      float up = pow(clamp(d.y, 0.0, 1.0), 0.55);
      vec3 c = mix(uHorizon, uTop, clamp(up * (0.75 + 0.5 * wash), 0.0, 1.0));
      c = tone(mix(uGround, c, smoothstep(-0.3, 0.0, d.y)));
      // and gaps where the brush left the paper bare
      float bare = smoothstep(0.56, 0.72, fbm(p * 1.7 + 4.0)) * smoothstep(-0.05, 0.15, d.y);
      c = mix(c, vec3(1.0), bare * 0.7);

      // stars: one to a patch of sky, or none, each a different size and tipped its own way
      float az = atan(d.z, d.x);
      float el = asin(clamp(d.y, -1.0, 1.0));
      vec2 cell = floor(vec2(az / TAU * 40.0, el / TAU * 40.0));
      vec3 h = hash3(vec2(mod(cell.x, 40.0), cell.y) + 5.0);
      if (h.z < 0.5 && el > 0.05 && el < 0.9) {
        vec3 at = toward((cell.x + 0.3 + 0.4 * h.x) / 40.0 * TAU, (cell.y + 0.3 + 0.4 * h.y) / 40.0 * TAU);
        float size = (0.016 + 0.028 * h.z * 2.0) * cos(el);
        vec2 s = around(d, at) / size;
        float turn = h.x * 1.3;
        s = vec2(s.x * cos(turn) - s.y * sin(turn), s.x * sin(turn) + s.y * cos(turn));
        s += (vec2(noise(s * 2.0 + h.xy * 30.0), noise(s * 2.0 + 9.0)) - 0.5) * 0.22; // drawn by hand
        float inside = 1.0 - smoothstep(-pixel / size * 1.5 - 0.02, 0.0, star(s));
        c = mix(c, mix(RGB(252.0, 214.0, 72.0), RGB(246.0, 178.0, 48.0), h.y), inside);
      }

      // a few small planets
      ${PLANETS.map(([round, up, size, colour, ring]) => `c = planet(c, d, vec3(${direction(round, up)}), ${num(rad(size))}, RGB(${colour}), ${num(ring)}, pixel);`).join("\n      ")}
      return c;
    }`,

  paint: `
    vec4 paint(vec2 uv) {
      vec2 px = uv * uSize;
      // a hand never draws a line quite straight: everything sits a little off its place
      vec2 slip = (vec2(noise(px * 0.011 + 3.0), noise(px * 0.011 + 19.0)) - 0.5) * 7.0;
      slip += (vec2(noise(px * 0.06 + 7.0), noise(px * 0.06 + 41.0)) - 0.5) * 2.4;
      // wet paper lets the colour run, in little fingers; dry paper keeps its edge. There is some of each across the sheet
      float wet = smoothstep(0.38, 0.7, fbm(px * 0.006 + 11.0));
      slip += (vec2(noise(px * 0.21 + 5.0), noise(px * 0.21 + 27.0)) - 0.5) * 7.0 * wet;
      vec2 at = uv + slip / uSize;
      vec4 src = mix(textureLod(tScene, at, 0.0), texture2D(tSoft, at), 0.1 + 0.4 * wet);
      vec3 c = mix(src.rgb, tone(src.rgb), src.a);

      // as a wash dries its pigment gathers along its edge
      vec2 e = 1.5 / uSize;
      vec3 across = textureLod(tScene, at + vec2(e.x, 0.0), 0.0).rgb - textureLod(tScene, at - vec2(e.x, 0.0), 0.0).rgb;
      vec3 down = textureLod(tScene, at + vec2(0.0, e.y), 0.0).rgb - textureLod(tScene, at - vec2(0.0, e.y), 0.0).rgb;
      float rim = smoothstep(0.04, 0.35, length(across) + length(down)) * (1.0 - 0.75 * wet);

      // more pigment here, less there: in slow tides across the sheet, and in small blooms
      float density = 1.0 + 0.9 * (fbm(px * 0.007 + 23.0) - 0.5) + 0.4 * (fbm(px * 0.045 + 5.0) - 0.5) + 1.1 * rim;
      c = pigment(c, density);

      // the wash stops short of the edge of the sheet, in an uneven line with a darker rim of its own
      float inset = min(min(px.x, uSize.x - px.x), min(px.y, uSize.y - px.y)) / min(uSize.x, uSize.y);
      float reach = inset - 0.028 + (fbm(px * 0.01 + 50.0) - 0.5) * 0.085;
      c = pigment(c, 1.0 + 0.55 * (1.0 - smoothstep(0.0, 0.016, abs(reach - 0.008))));
      // (and the brush runs dry just before it stops: it skips over the grain, leaving specks of paper)
      float dry = (1.0 - smoothstep(0.0, 0.035, reach)) * smoothstep(0.5, 0.62, noise(px * vec2(0.09, 0.5)) * 0.6 + noise(px * 0.6 + 3.0) * 0.4);
      c = mix(vec3(1.0), c, smoothstep(0.0, 0.004, reach) * (1.0 - dry));
      return vec4(c, 1.0);
    }`,

  finish: `
    vec3 finish(vec2 uv) {
      vec2 px = uv * uSize;
      vec3 c = texture2D(tPaint, uv).rgb;
      // the paper: long fibres both ways, and a tooth that the pigment settles into
      float fibre = noise(px * vec2(0.55, 0.06)) + noise(px * vec2(0.07, 0.6) + 31.0) - 1.0;
      float tooth = noise(px * 0.7) * 0.6 + noise(px * 1.9 + 7.0) * 0.4 - 0.5;
      c = pigment(c, 1.0 + tooth * 0.9 + fibre * 0.12);
      return c * PAPER * (1.0 + fibre * 0.03 + (hash(floor(px)) - 0.5) * 0.03);
    }`,
};
