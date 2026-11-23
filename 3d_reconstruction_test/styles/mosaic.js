/* ------------------------------------------------------------------
   Mosaic: a watercolour made of small dabs, after the look of a
   storybook planet floating at night. Everything solid is laid in as
   little irregular touches of the brush, each a slightly different
   shade, with the pigment pooled at its rim and a hair of bare paper
   between them; where a dab reaches past the edge of a thing, the
   silhouette comes out soft and clumpy. Behind it, whatever the hour,
   is a deep navy sky washed on wet paper, with gold four-pointed stars
   that glow and slowly twinkle.
------------------------------------------------------------------- */

const DAB = 7.0; // how far apart the dabs are, in CSS pixels

export default {
  key: "mosaic",
  label: "Mosaic",
  dark: true, // a night sky behind everything: the page's text turns pale
  // the far parts of the model sink into the navy, but less fog than the scene asks for
  fog: { near: 1.3, far: 1.4, color: "#1c2650", strength: 0.75 },

  shared: `
    #define PAPER RGB(247.0, 240.0, 222.0)
    #define NAVY RGB(18.0, 27.0, 62.0)
    #define GOLD RGB(242.0, 200.0, 102.0)

    // the scene's colour in this paintbox: clear and warm in the light, blue-violet in the shade.
    // Greens lean to yellow-green, greys come out cream where lit and lilac where dark
    vec3 tone(vec3 c) {
      c = clamp(c, 0.0, 1.0);
      float l = luma(c);
      c = pow(c, vec3(0.7));
      float plain = 1.0 - clamp((max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b))) * 4.0, 0.0, 1.0);
      vec3 grey = mix(vec3(0.82, 0.84, 1.08), vec3(1.08, 1.02, 0.86), smoothstep(0.2, 0.7, luma(c)));
      c *= mix(vec3(1.0), grey, plain * 0.7);
      // a green warms toward the yellow of new grass
      float green = clamp((c.g - max(c.r, c.b)) * 5.0, 0.0, 1.0);
      c = mix(c, c * vec3(1.12, 1.04, 0.8), green * 0.6);
      // the shade turns blue-violet instead of going dull
      c = mix(c, c * vec3(0.78, 0.82, 1.25), (1.0 - smoothstep(0.02, 0.3, l)) * 0.7);
      c = max(mix(vec3(luma(c)), c, 1.3), 0.0);
      return c;
    }
    // more pigment (density > 1) or less
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
    // a four-pointed star at p (in units of its size): a bright core, two long thin rays, a soft glow
    float sparkle(vec2 p) {
      vec2 a = abs(p);
      float rays = exp(-a.x * 14.0 - a.y * 1.7) + exp(-a.y * 14.0 - a.x * 1.7);
      return rays + exp(-dot(p, p) * 30.0) + exp(-length(p) * 3.5) * 0.25;
    }

    vec3 sky(vec3 d) {
      float pixel = length(fwidth(d));
      // navy laid on wet paper: darker pools, paler clouds where the water lifted the colour
      float pools = noise3(d * 3.0) * 0.6 + noise3(d * 7.0 + 11.0) * 0.3 + noise3(d * 19.0 + 3.0) * 0.1;
      float cloud = smoothstep(0.55, 0.85, noise3(d * 1.6 + 5.0) * 0.7 + noise3(d * 5.0) * 0.3);
      vec3 c = NAVY * (0.7 + 0.65 * pools);
      c = mix(c, RGB(64.0, 78.0, 120.0), cloud * 0.55);
      // a little paler toward the horizon, and the ground below it darker still
      c = mix(c, RGB(44.0, 58.0, 104.0), (1.0 - smoothstep(0.0, 0.35, abs(d.y))) * 0.5);
      c *= mix(0.7, 1.0, smoothstep(-0.25, 0.0, d.y));

      // gold stars, one to a patch of sky or none, low enough to be seen from the scenes' views
      float az = atan(d.z, d.x);
      float el = asin(clamp(d.y, -1.0, 1.0));
      vec2 cell = floor(vec2(az / TAU * 48.0, el / TAU * 48.0));
      vec3 h = hash3(vec2(mod(cell.x, 48.0), cell.y) + 17.0);
      if (h.z < 0.5 && el > 0.02 && el < 1.0) {
        vec3 at = toward((cell.x + 0.25 + 0.5 * h.x) / 48.0 * TAU, (cell.y + 0.25 + 0.5 * h.y) / 48.0 * TAU);
        float size = max(0.01 + 0.024 * h.z, pixel * 2.0);
        vec2 s = around(d, at) / size;
        float twinkle = 0.75 + 0.25 * sin(uTime * (0.6 + h.x) + h.y * 40.0);
        c += GOLD * sparkle(s) * twinkle * (0.6 + 0.8 * h.y);
      }
      // and a dust of faint ones: a round point in some squares of a fine grid, a pixel or so across
      vec2 grid = vec2(az / TAU * 900.0, el / TAU * 900.0);
      vec3 f = hash3(vec2(mod(floor(grid.x), 900.0), floor(grid.y)) + 91.0);
      if (f.z > 0.985 && el > 0.0) {
        vec3 at = toward((floor(grid.x) + 0.2 + 0.6 * f.x) / 900.0 * TAU, (floor(grid.y) + 0.2 + 0.6 * f.y) / 900.0 * TAU);
        float r = length(around(d, at)) / max(pixel, 1e-5);
        c += mix(PAPER, GOLD, f.x) * (1.0 - smoothstep(0.4, 1.3, r)) * (0.25 + 0.35 * f.y);
      }
      return c;
    }`,

  paint: `
    vec4 paint(vec2 uv) {
      vec2 px = uv * uSize;
      vec4 here = textureLod(tScene, uv, 0.0);
      // the wireframe: no dabs, which would swallow the lines; they are lifted toward the paper to show on the navy
      if (uWire > 0.5) {
        vec3 lines = mix(tone(here.rgb), PAPER, 0.35);
        return vec4(mix(here.rgb, lines, here.a), 1.0);
      }

      // the dab under this pixel: the nearest of a scatter of points, one to each square of the grid.
      // The grid is bent a little, so the dabs come out round and uneven rather than as tiles
      vec2 g = px / ${DAB.toFixed(1)};
      g += (vec2(noise(px * 0.05 + 3.0), noise(px * 0.05 + 17.0)) - 0.5) * 0.7;
      vec2 base = floor(g);
      float near1 = 9.0;
      float near2 = 9.0;
      vec2 centre = vec2(0.0);
      vec3 id = vec3(0.0);
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 cell = base + vec2(float(i), float(j));
          vec3 h = hash3(cell + 7.0);
          vec2 o = cell + 0.5 + (h.xy - 0.5) * 0.9;
          float dist = length((g - o) * vec2(1.0, 0.85 + 0.3 * h.z));
          if (dist < near1) {
            near2 = near1;
            near1 = dist;
            centre = o;
            id = h;
          } else if (dist < near2) {
            near2 = dist;
          }
        }
      }

      // the dab takes one colour, from the scene at its middle. A dab whose middle is sky leaves
      // the pixel as it was; one whose middle is solid covers its whole patch, past the thing's edge
      vec2 mid = (centre * ${DAB.toFixed(1)}) / uSize;
      vec4 src = textureLod(tScene, clamp(mid, vec2(0.0), vec2(1.0)), 0.5);
      if (src.a < 0.5) {
        if (here.a < 0.5) return vec4(here.rgb, 1.0);
        src = here;
      }
      // where the scene has fine detail of its own (lettering, thin frames), the dab gives way to it
      float detail = smoothstep(0.05, 0.25, length(here.rgb - texture2D(tSoft, uv).rgb)) * here.a;
      src.rgb = mix(src.rgb, here.rgb, detail * 0.75);
      vec3 c = tone(src.rgb);
      // no two dabs quite the same: a little lighter or darker, a little warmer or cooler
      c *= 0.86 + 0.28 * id.z;
      c *= mix(vec3(0.94, 0.98, 1.08), vec3(1.07, 1.0, 0.9), id.x);
      // a brush lays more pigment where it first touches: one side of the dab is fuller
      vec2 lean = normalize(vec2(id.y - 0.5, 0.6));
      c = pigment(c, 1.0 + 0.25 * dot(g - centre, lean));
      // the pigment pools at the rim as it dries, and a hair of paper shows between dabs
      float gap = near2 - near1;
      c = pigment(c, 1.0 + 0.45 * (1.0 - smoothstep(0.0, 0.22, gap)));
      c = mix(c, PAPER * 0.92, (1.0 - smoothstep(0.0, 0.05, gap)) * 0.4);

      // warm light glows a little into what is around it
      vec3 glow = max(texture2D(tSoft, uv).rgb - 0.55, 0.0);
      c += tone(glow) * 0.35;
      return vec4(c, 1.0);
    }`,

  finish: `
    vec3 finish(vec2 uv) {
      vec2 px = uv * uSize;
      vec3 c = texture2D(tPaint, uv).rgb;
      // cold-pressed paper: a tooth the pigment settles into, and faint fibres
      float tooth = noise(px * 0.45) * 0.55 + noise(px * 1.3 + 7.0) * 0.45 - 0.5;
      float fibre = noise(px * vec2(0.5, 0.06)) + noise(px * vec2(0.06, 0.5) + 31.0) - 1.0;
      c = pigment(c, 1.0 + tooth * 0.5 + fibre * 0.08);
      // the corners sink into the night
      vec2 q = uv - 0.5;
      c = mix(c, NAVY * 0.6, smoothstep(0.35, 0.85, length(q * vec2(1.0, 0.8))) * 0.55);
      return c * (1.0 + (hash(floor(px)) - 0.5) * 0.04);
    }`,
};
