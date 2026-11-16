/* ------------------------------------------------------------------
   Paper: the plain style. The scene as it is, under a washed sky,
   printed on paper: tinted, a little drained of colour, with fibres
   and grain, darker toward the corners. How much of each is up to the
   scene's mood.
------------------------------------------------------------------- */

export default {
  key: "paper",
  label: "Paper",

  // horizon colour low down, top colour overhead, with an uneven wash
  // like watercolour that hasn't dried flat; below the horizon it settles into haze
  sky: `
    vec3 sky(vec3 d) {
      vec2 p = d.xz / (abs(d.y) + 0.35);
      float wash = noise(p * 1.3) * 0.6 + noise(p * 3.1 + 7.0) * 0.4;
      float up = pow(clamp(d.y, 0.0, 1.0), 0.55);
      vec3 c = mix(uHorizon, uTop, clamp(up * (0.75 + 0.5 * wash), 0.0, 1.0));
      return mix(c, uGround, smoothstep(0.0, -0.3, d.y));
    }`,

  // the finished picture, printed: tint and colour, paper fibres and grain, darker edges
  finish: `
    vec3 finish(vec2 uv) {
      vec3 c = texture2D(tSharp, uv).rgb;
      float grey = luma(c);
      c = mix(vec3(grey), c, uSaturation) * uTint;
      vec2 px = uv * uSize;

      // paper: long fibres both ways, blotches, and fine tooth
      float fibre = noise(px * vec2(0.55, 0.06)) + noise(px * vec2(0.07, 0.6) + 31.0);
      float blotch = noise(px * 0.012 + 5.0);
      float tooth = hash(floor(px));
      float paper = (fibre - 1.0) * 0.5 + (blotch - 0.5) * 0.8 + (tooth - 0.5) * 0.7;
      c *= 1.0 + paper * uGrain;

      vec2 q = (uv - 0.5) * vec2(1.0, 0.9);
      c *= 1.0 - uVignette * smoothstep(0.32, 0.85, length(q));
      return c;
    }`,
};
