/* ------------------------------------------------------------------
   Deep Sea: the scene sunk under water and made of ink, after the
   animated film. Cold currents run from blue to green, warm ones
   from purple to orange to gold, and everything takes the colour of
   the current it stands in. The water is never still: shapes trail
   off down the current like ink let into it, bright things glow, and
   the whole picture is grains of light, with specks drifting up
   through it and shafts of light coming down.
------------------------------------------------------------------- */

export default {
  key: "sea",
  label: "Deep Sea",
  dark: true,
  // you can't see far under water, and what is far off is lost in the blue
  fog: { near: 0.55, far: 0.65, color: "#0b2a66", strength: 0.8 },

  shared: `
    // the colours of ink let into the sea, from its darkest to its lightest:
    // cold currents run blue to green, warm ones purple to orange to gold
    vec3 ink(float l, float warm) {
      vec3 cold = mix(RGB(5.0, 12.0, 58.0), RGB(0.0, 92.0, 156.0), smoothstep(0.0, 0.42, l));
      cold = mix(cold, RGB(60.0, 214.0, 206.0), smoothstep(0.36, 0.78, l));
      cold = mix(cold, RGB(232.0, 255.0, 236.0), smoothstep(0.78, 1.1, l));
      vec3 hot = mix(RGB(28.0, 8.0, 72.0), RGB(176.0, 22.0, 116.0), smoothstep(0.0, 0.42, l));
      hot = mix(hot, RGB(255.0, 122.0, 44.0), smoothstep(0.36, 0.74, l));
      hot = mix(hot, RGB(255.0, 236.0, 170.0), smoothstep(0.74, 1.1, l));
      return mix(cold, hot, warm);
    }
    // a colour of the scene, under water: part its own colour (far stronger), part the ink of the
    // current it is in. Things that were warm to begin with lean to the warm inks
    vec3 tone(vec3 c, float warm) {
      float l = luma(c);
      vec3 own = max(mix(vec3(l), c, 1.9), 0.0);
      float heat = clamp((c.r - c.b) / (l + 0.04) * 0.9, 0.0, 1.0) * smoothstep(0.02, 0.22, l);
      // what is in the light is warm, what is in the shade is cold: lit faces stand out of the blue
      float lit = pow(l, 0.62);
      warm = clamp(warm * 0.55 + heat * 0.8 + (lit - 0.5) * 1.1, 0.0, 1.0);
      // (and warm things keep their own light, like lanterns down there)
      return mix(own * mix(vec3(0.6, 0.82, 1.0), vec3(1.3, 1.0, 0.7), heat), ink(lit, warm), 0.6);
    }
    // the water: slow eddies, turning over as time passes. It runs along the lines where eddy() is level
    float eddy(vec2 p, float t) {
      return noise(p + vec2(0.0, t)) + 0.5 * noise(p * 2.1 - vec2(t, 0.0) + 7.0);
    }
    vec2 current(vec2 p, float t) {
      float n = eddy(p, t);
      return vec2(eddy(p + vec2(0.0, 0.3), t) - n, n - eddy(p + vec2(0.3, 0.0), t)) / 0.3;
    }
    #define WATER 0.0042 // from CSS pixels to the scale of the eddies
    #define TIDE (uTime * 0.045)
  `,

  // the sea all around: ink folded over and over by slow water, lighter toward the surface
  sky: `
    vec3 sky(vec3 d) {
      float day = clamp(luma(uTop) * 2.0, 0.0, 1.0); // how light the scene's own sky is
      float t = uTime * 0.02;
      vec3 q = d * vec3(1.6, 2.6, 1.6);
      vec3 fold = vec3(noise3(q * 1.2 + vec3(0.0, t, 3.0)), noise3(q * 1.2 + vec3(5.2, 1.3 - t, 0.0)), noise3(q * 1.2 + vec3(t, 9.1, 2.7))) - 0.5;
      vec3 fold2 = vec3(noise3(q * 2.3 + fold * 3.0 + 11.0), noise3(q * 2.3 + fold * 3.0 + 23.0), noise3(q * 2.3 + fold * 3.0 + 37.0)) - 0.5;
      float f = noise3(q * 1.5 + fold * 3.2 + fold2 * 1.4);
      float warm = smoothstep(0.42, 0.6, noise3(q * 0.8 + fold * 1.6 + 20.0));
      float up = smoothstep(-0.25, 0.9, d.y);
      float light = (0.12 + 0.78 * f) * mix(0.55, 1.0, day) * (0.6 + 0.6 * up);
      vec3 c = ink(light, warm);
      // bright threads where the ink folds over on itself
      float thread = pow(1.0 - abs(2.0 * fract(f * 5.0 + fold2.x) - 1.0), 14.0);
      c += ink(0.95, warm) * thread * 0.35 * (0.4 + 0.6 * f);
      // far-off things fade into the water: along the horizon the sea takes the colour they fade to
      vec3 low = tone(uFog, warm);
      c = mix(c, low, (1.0 - smoothstep(0.0, 0.16, abs(d.y + 0.02 + fold.y * 0.1))) * 0.65);
      return mix(c, tone(uGround, warm) * 0.6, 1.0 - smoothstep(-0.35, 0.0, d.y));
    }`,

  paint: `
    // glitter carried along by the water: dots on a grid that slides down the current, then fades
    // and starts again. Two such grids take turns, so there is always one in full flow
    vec3 glitter(vec2 px, vec2 run, float turn) {
      float phase = fract(uTime * 0.07 + turn);
      vec2 g = (px - run * (phase - 0.5) * 70.0) / 8.0;
      vec3 h = hash3(floor(g) + turn * 91.0);
      vec2 d = fract(g) - 0.3 - 0.4 * h.xy;
      float speck = (1.0 - smoothstep(0.04, 0.1 + 0.12 * h.x, length(d))) * step(0.62, h.z);
      return speck * (1.0 - abs(2.0 * phase - 1.0)) * mix(RGB(255.0, 220.0, 140.0), RGB(150.0, 245.0, 235.0), step(0.5, h.y));
    }

    vec4 paint(vec2 uv) {
      vec2 px = uv * uSize;
      vec2 p = px * WATER;
      // everything is ink let into moving water, and sways with it. Every grain of it has been carried
      // some way down the current from where it began: most hardly at all, a few a long way, so
      // shapes keep their edge but trail off in a spray of their own colour
      vec3 grain = hash3(px);
      float reach = (3.0 + 30.0 * smoothstep(0.3, 0.75, noise(p * 1.3 + vec2(TIDE, 5.0)))) * grain.x * grain.x * grain.x;
      vec2 run = current(p, TIDE);
      run *= min(1.0, 1.4 / (length(run) + 0.001)); // however fast the water, a grain only goes so far
      vec2 sway = current(p * 0.6 + 40.0, TIDE) * 5.0;
      // (a ghost of the thing itself stays where it was, so that small things can still be made out)
      // (textureLod: left to itself the sampler would see how the grains jump about and hand back a blur)
      vec4 src = mix(textureLod(tScene, uv + sway / uSize, 0.0), textureLod(tScene, uv + (sway - run * reach) / uSize, 0.0), 0.72);

      // warm currents and cold ones, wandering slowly across the picture
      float warm = smoothstep(0.35, 0.7, noise(p * 0.7 + vec2(TIDE * 0.5, 31.0)) * 0.65 + noise(p * 1.9 - vec2(0.0, TIDE) + 3.0) * 0.35);
      vec3 c = mix(src.rgb, tone(src.rgb, warm), src.a);

      // bright things glow through the water
      vec4 close = texture2D(tSoft, uv);
      vec4 wide = textureLod(tSoft, uv, 2.5);
      vec3 glow = mix(close.rgb, tone(close.rgb, warm), close.a) * 0.45 + mix(wide.rgb, tone(wide.rgb, warm), wide.a) * 0.55;
      c += glow * glow * 0.6;
      // a wireframe's thin lines would be lost down here: they shine a little, like threads of something living
      c += uWire * src.a * (c + ink(0.8, warm) * 0.5);

      // ribbons of glitter streaming down the currents
      float ribbon = smoothstep(0.55, 0.95, 0.5 + 0.5 * sin(eddy(p, TIDE) * 26.0 + noise(p * 2.0) * 3.0));
      c *= 1.0 + 0.12 * ribbon;
      c += (glitter(px, run, 0.0) + glitter(px, run, 0.5)) * (0.12 + 0.88 * ribbon) * 0.75;
      return vec4(c, warm);
    }`,

  finish: `
    // specks drifting up through the water: one to a cell of a grid that rises as time passes, and slides
    // across as the camera turns. The grid goes right round, round cells of it, so a full turn brings it back to itself
    vec3 specks(vec2 px, vec2 looking, float cell, float round, float rise, float seed) {
      px += looking * cell * round / TAU;
      vec2 g = (px + vec2(sin(uTime * 0.3 + seed) * 6.0, -uTime * rise)) / cell;
      vec3 h = hash3(vec2(mod(floor(g.x), round), floor(g.y)) + seed);
      vec2 d = fract(g) - 0.25 - 0.5 * h.xy;
      float r = (0.05 + 0.13 * h.z * h.z) * (0.75 + 0.25 * sin(uTime * (0.8 + h.x) + h.y * TAU));
      float speck = (1.0 - smoothstep(r * 0.4, r, length(d))) * step(0.45, h.z);
      return speck * mix(RGB(130.0, 240.0, 230.0), RGB(255.0, 214.0, 130.0), step(0.6, h.x)) * (0.3 + 0.7 * h.y);
    }
    vec3 finish(vec2 uv) {
      vec2 px = uv * uSize;
      vec4 src = texture2D(tPaint, uv);
      vec3 c = src.rgb;
      float l = luma(c);

      // the picture is made of grains of light: some lit, some not, a few of them glinting
      vec3 h = hash3(px / 1.5);
      float cloud = noise(px * 0.16) * 0.6 + noise(px * 0.45 + 9.0) * 0.4; // the grains drift in thicker and thinner clouds
      c *= 0.8 + 0.4 * smoothstep(0.25, 0.75, h.x * 0.55 + cloud * 0.45);
      float glint = step(0.986 - 0.02 * l, h.y) * pow(0.5 + 0.5 * sin(uTime * (1.0 + 3.0 * h.z) + h.x * TAU), 6.0);
      c += ink(0.98, src.a) * glint * (0.25 + 1.6 * l);

      // shafts of light from the surface, standing all round and swaying
      vec3 ray = normalize(uRay * vec3(uv * 2.0 - 1.0, 1.0));
      float bearing = atan(ray.z, ray.x) + ray.y * 0.9 + uTime * 0.01;
      vec2 ring = vec2(cos(bearing), sin(bearing));
      float shaft = noise(ring * 4.2 + vec2(0.0, uTime * 0.1)) * 0.6 + noise(ring * 9.5 + 20.0 - vec2(uTime * 0.06, 0.0)) * 0.4;
      c += RGB(120.0, 230.0, 235.0) * smoothstep(0.45, 0.8, shaft) * smoothstep(-0.25, 0.5, ray.y) * 0.2;

      // the nearer specks are larger and pass faster as the camera turns
      vec3 ahead = normalize(uRay[2]);
      vec2 looking = vec2(atan(ahead.z, ahead.x), asin(clamp(ahead.y, -1.0, 1.0)));
      c += specks(px, looking, 46.0, 60.0, 9.0, 3.0) * 0.8 + specks(px, looking, 110.0, 40.0, 16.0, 17.0) * 0.55;

      // the dark of the deep water closing in round the edges
      vec2 q = (uv - 0.5) * vec2(1.0, 0.9);
      return mix(c, RGB(4.0, 8.0, 40.0) * 0.6, smoothstep(0.3, 0.9, length(q)) * 0.7);
    }`,
};
