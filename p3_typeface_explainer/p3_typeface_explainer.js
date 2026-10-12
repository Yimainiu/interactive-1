// P3 Typeface explainer
// Part 1 is copied unchanged from ../p3_css_typeface/p3_css_typeface.js
// (only what the letter B needs), so every number on the page comes from
// the real functions. Part 2 builds the demos and highlights the code boxes.

// ======== Part 1: copied from p3_css_typeface.js ========

function R(x, y, w, h, radius = "pill") {
  return { cx: x + w / 2, cy: y + h / 2, w, h, rot: 0, radius };
}

function C(x, y, d) {
  return R(x, y, d, d, d / 2);
}

const GLYPHS = {
  B: [
    [R(3, 0, 1, 8), R(3, 0, 1, 8)],
    [C(4, 4, 4), C(4, 0, 4)],
    [C(4, 4, 4), C(4, 4, 4)],
  ],
};

const TILE_TOP = -1; // first visible row of the grid

function radiusCss(shape) {
  let corners = shape.radius;
  if (corners === "pill") corners = Math.min(shape.w, shape.h) / 2;
  if (!Array.isArray(corners)) corners = [corners, corners, corners, corners];
  const pairs = corners.map((c) => (Array.isArray(c) ? c : [c, c]));
  const xs = pairs.map((p) => `${p[0]}em`).join(" ");
  const ys = pairs.map((p) => `${p[1]}em`).join(" ");
  return `${xs} / ${ys}`;
}

function extentOf(shapes) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of shapes) {
    if (s.hidden) continue;
    const a = (s.rot * Math.PI) / 180;
    const half = Math.abs((s.w / 2) * Math.cos(a)) + Math.abs((s.h / 2) * Math.sin(a));
    min = Math.min(min, s.cx - half);
    max = Math.max(max, s.cx + half);
  }
  return [min, max];
}

function centreOf(shapes) {
  const [min, max] = extentOf(shapes);
  return (min + max) / 2;
}

function setState(el, prefix, shape, shiftX) {
  el.style.setProperty(`--${prefix}x`, shape.cx - shape.w / 2 + shiftX);
  el.style.setProperty(`--${prefix}y`, shape.cy - shape.h / 2 - TILE_TOP);
  el.style.setProperty(`--${prefix}w`, shape.w);
  el.style.setProperty(`--${prefix}h`, shape.h);
  el.style.setProperty(`--${prefix}rot`, `${shape.rot}deg`);
  el.style.setProperty(`--${prefix}radius`, radiusCss(shape));
  el.style.setProperty(`--${prefix}opacity`, shape.hidden ? 0 : 1);
}

function createLetter(letter, width, className, standalone = true) {
  const parts = GLYPHS[letter];
  const [lowerWidth, upperWidth] = Array.isArray(width) ? width : [width, width];
  const lowerShift = lowerWidth / 2 - centreOf(parts.map((p) => p[0]));
  const upperShift = upperWidth / 2 - centreOf(parts.map((p) => p[1]));

  const el = document.createElement(standalone ? "button" : "span");
  el.className = `letter ${className}`;
  if (standalone) {
    el.type = "button";
    el.setAttribute("aria-label", `Letter ${letter}`);
  }

  const glyph = document.createElement("span");
  glyph.className = "glyph";
  glyph.setAttribute("aria-hidden", "true");

  for (const [lower, upper] of parts) {
    const part = document.createElement("span");
    part.className = "part";
    setState(part, "l", lower, lowerShift);
    setState(part, "u", upper, upperShift);
    const clip = lower.clip || upper.clip;
    if (clip) part.style.clipPath = clip;
    glyph.append(part);
  }

  el.style.setProperty("--lbox", lowerWidth);
  el.style.setProperty("--ubox", upperWidth);
  el.append(glyph);
  return el;
}

function renderSpecimen(container) {
  for (const letter of Object.keys(GLYPHS)) {
    const tile = createLetter(letter, 9, "tile");
    const label = document.createElement("span");
    label.className = "tile-label";
    label.setAttribute("aria-hidden", "true");
    label.textContent = letter + letter.toLowerCase();
    tile.prepend(label);
    container.append(tile);
  }
}

// ======== Part 2: explainer ========

const B = GLYPHS.B;
const LOWER = B.map((p) => p[0]);
const UPPER = B.map((p) => p[1]);
const TILE_WIDTH = 9;

// Source text for each part of B, matching GLYPHS.B above.
const PARTS = [
  { name: "Stem", source: ["R(3, 0, 1, 8)", "R(3, 0, 1, 8)"] },
  { name: "Upper bowl", source: ["C(4, 4, 4)", "C(4, 0, 4)"] },
  { name: "Lower bowl", source: ["C(4, 4, 4)", "C(4, 4, 4)"] },
];

const GUIDES = [
  [0, "cap line"],
  [3, "x-height"],
  [8, "baseline"],
  [10, "descender"],
];

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Numbers as they read in the prose: a real minus sign, no float noise.
function fmt(n) {
  return String(Math.round(n * 1000) / 1000).replace("-", "−");
}

function formatShape(shape) {
  const fields = Object.entries(shape).map(
    ([key, value]) => `${key}: ${typeof value === "string" ? `"${value}"` : value}`,
  );
  return `{ ${fields.join(", ")} }`;
}

// A static B for diagrams. Unlike createLetter, the shift is passed in,
// so the uncentred raw coordinates can be shown too.
function makeFrame({ shift = 0, upper = false, coloured = false, grid = null } = {}) {
  const frame = make("div", "letter frame");
  frame.classList.toggle("is-upper", upper);
  frame.classList.toggle("coloured", coloured);
  if (grid) frame.append(makeGrid(grid));

  const glyph = make("span", "glyph");
  for (const [lo, up] of B) {
    const part = make("span", "part");
    setState(part, "l", lo, shift);
    setState(part, "u", up, shift);
    glyph.append(part);
  }
  frame.append(glyph);
  return frame;
}

function makeGrid({ numbers = false, guides = false } = {}) {
  const grid = make("span", "grid");
  grid.setAttribute("aria-hidden", "true");
  if (numbers) {
    // x along the top row, y down the first column; rows start at TILE_TOP
    for (let col = 1; col < TILE_WIDTH; col++) grid.append(gridNumber(col, 0, col));
    for (let row = 1; row < 12; row++) grid.append(gridNumber(0, row, row + TILE_TOP));
  }
  if (guides) {
    for (const [y, name] of GUIDES) {
      const line = make("span", "guide");
      line.style.setProperty("--row", y - TILE_TOP);
      line.dataset.label = `y = ${y}  ${name}`;
      grid.append(line);
    }
  }
  return grid;
}

function gridNumber(col, row, value) {
  const label = make("span", "grid-number", fmt(value));
  label.style.setProperty("--col", col);
  label.style.setProperty("--row", row);
  return label;
}

function wrapFrame(frame, withGuides = false) {
  const wrap = make("div", withGuides ? "frame-wrap has-guides" : "frame-wrap");
  wrap.append(frame);
  return wrap;
}

function segmented(labels, onSelect) {
  const group = make("div", "segmented");
  group.setAttribute("role", "group");
  const buttons = labels.map((text, i) => {
    const button = make("button", null, text);
    button.type = "button";
    button.setAttribute("aria-pressed", String(i === 0));
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      onSelect(i);
    });
    return button;
  });
  group.append(...buttons);
  return group;
}

function slider(labelText, { min, max, value, step = 1, unit = "" }) {
  const label = make("label", "slider");
  const input = make("input");
  Object.assign(input, { type: "range", min, max, value, step });
  const output = make("output", null, value + unit);
  input.addEventListener("input", () => {
    output.textContent = input.value + unit;
  });
  label.append(make("span", null, labelText), input, output);
  return { label, input };
}

function checkbox(labelText) {
  const label = make("label", "check");
  const input = make("input");
  input.type = "checkbox";
  label.append(input, make("span", null, labelText));
  return { label, input };
}

function swatch(i) {
  const s = make("span", "swatch");
  s.style.setProperty("--swatch", `var(--part-${i + 1})`);
  return s;
}

function readout(lines) {
  return make("pre", "readout", lines.join("\n"));
}

const DEMOS = {
  // Step 0: the finished tile, exactly as the P3 page renders it.
  overview(stage) {
    const specimen = make("div", "specimen");
    renderSpecimen(specimen);
    stage.append(specimen, make("p", "demo-note", "Hover over the letter, or press Tab to focus it."));
  },

  // Step 1: raw coordinates on the grid, with the guide lines.
  grid(stage) {
    const frame = makeFrame({ grid: { numbers: true, guides: true } });
    const controls = make("div", "controls");
    controls.append(
      segmented(["Lowercase b", "Uppercase B"], (i) => frame.classList.toggle("is-upper", i === 1)),
    );
    stage.append(wrapFrame(frame, true), controls);
    stage.append(
      make("p", "demo-note", "x runs along the top row and y down the first column. The tile starts at y = −1, so the top row is empty."),
    );
  },

  // Step 2: the shape functions on their own, one shape at a time, so it is
  // clear that nothing is assembled into a letter yet.
  shapes(stage) {
    const FUNCTIONS = {
      R: {
        params: [["x", 0, 8], ["y", -1, 10], ["w", 1, 9], ["h", 1, 11]],
        values: { x: 2, y: 2, w: 5, h: 2 },
        build: (v) => R(v.x, v.y, v.w, v.h),
      },
      C: {
        params: [["x", 0, 8], ["y", -1, 10], ["d", 1, 9]],
        values: { x: 3, y: 4, d: 3 },
        build: (v) => C(v.x, v.y, v.d),
      },
    };
    let mode = "R";

    const frame = make("div", "letter frame playground");
    const glyph = make("span", "glyph");
    const part = make("span", "part");
    glyph.append(part);

    // markers sit above the shape: the box and corner you pass in, the centre R returns
    const marks = make("span", "marks");
    marks.setAttribute("aria-hidden", "true");
    const box = make("span", "mark-box");
    const corner = make("span", "mark-dot mark-corner");
    const centre = make("span", "mark-dot mark-centre");
    marks.append(box, corner, centre);
    frame.append(makeGrid({ numbers: true }), glyph, marks);

    const place = (el, x, y) => {
      el.style.setProperty("--x", x);
      el.style.setProperty("--y", y - TILE_TOP);
    };

    const out = readout([""]);
    const draw = () => {
      const fn = FUNCTIONS[mode];
      const v = fn.values;
      const shape = fn.build(v);
      setState(part, "l", shape, 0);
      setState(part, "u", shape, 0);
      place(box, v.x, v.y);
      box.style.setProperty("--w", shape.w);
      box.style.setProperty("--h", shape.h);
      place(corner, v.x, v.y);
      place(centre, shape.cx, shape.cy);
      const args = fn.params.map(([name]) => fmt(v[name])).join(", ");
      out.textContent = `${mode}(${args})\n→ ${formatShape(shape)}`;
    };

    const sliders = make("div", "controls");
    const buildSliders = () => {
      const fn = FUNCTIONS[mode];
      sliders.replaceChildren(
        ...fn.params.map(([name, min, max]) => {
          const s = slider(name, { min, max, value: fn.values[name] });
          s.input.addEventListener("input", () => {
            fn.values[name] = Number(s.input.value);
            draw();
          });
          return s.label;
        }),
      );
    };

    const switcher = make("div", "controls");
    switcher.append(
      segmented(["R(x, y, w, h)", "C(x, y, d)"], (i) => {
        mode = i === 0 ? "R" : "C";
        buildSliders();
        draw();
      }),
    );

    const key = make("p", "key");
    key.append(
      make("span", "key-extent", "○ dashed box: what you pass in (top-left at x, y)"),
      make("span", "key-extent", "● centre (cx, cy) it returns"),
    );

    buildSliders();
    draw();
    stage.append(switcher, wrapFrame(frame), key, sliders, out);
  },

  // Step 3: the same three parts in both states.
  pairs(stage) {
    const pair = make("div", "pair");
    for (const [upper, caption] of [
      [false, "Lowercase b: first of each pair"],
      [true, "Uppercase B: second of each pair"],
    ]) {
      const figure = make("figure");
      figure.append(makeFrame({ upper, coloured: true, grid: {} }), make("figcaption", null, caption));
      pair.append(figure);
    }

    const legend = make("ul", "legend");
    PARTS.forEach((info, i) => {
      const same = JSON.stringify(LOWER[i]) === JSON.stringify(UPPER[i]);
      const item = make("li", "legend-item");
      const text = make("code", null, `${info.name}  [${info.source[0]}, ${info.source[1]}]`);
      const badge = make("span", same ? "badge" : "badge is-diff", same ? "same" : "differs");
      item.append(swatch(i), text);
      text.append(badge);
      legend.append(item);
    });

    stage.append(pair, legend);
  },

  // Step 4: a copy of P3's <main> in the DOM, before and after renderSpecimen
  // builds B, plus what the screen shows in each state.
  dom(stage) {
    const main = make("main");
    // id before class, so the attributes print in the same order as P3's HTML
    const specimen = make("div");
    specimen.id = "specimen";
    specimen.className = "specimen";
    main.append(specimen);

    const listing = make("figure", "dom-listing");
    const title = make("figcaption", "listing-title");
    const pre = make("pre");
    pre.dataset.lang = "html";
    listing.append(title, pre);

    const show = (after) => {
      specimen.replaceChildren();
      if (after) renderSpecimen(specimen);
      title.textContent = after
        ? "DOM after JS runs (highlighted: added by JS)"
        : "DOM before JS runs (same as the HTML file)";
      // everything nested deeper than #specimen was added by JS
      const lines = describe(main).split("\n");
      pre.dataset.hl = lines
        .map((line, i) => (line.startsWith("    ") ? i + 1 : null))
        .filter(Boolean)
        .join(",");
      pre.textContent = lines.join("\n");
      renderCode(pre);
    };

    const switcher = make("div", "controls");
    switcher.append(segmented(["Before JS", "After JS"], (i) => show(i === 1)));
    show(false);

    const screen = make("div", "dom-screen");
    screen.append(main);

    stage.append(switcher, listing, make("p", "demo-sub", "What the screen shows"), screen);
    stage.append(
      make("p", "demo-note", "Each .part has 14 variables in its style (7 lowercase, 7 uppercase). Step 6 lists them all."),
    );
  },

  // Extra: 26 tiles in P3's grid, scaled to a third. Only B has shape data
  // on this page, so the other tiles show a grey placeholder letter.
  layout(stage) {
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const grid = make("div", "specimen layout-grid");
    for (const letter of ALPHABET) {
      let tile;
      if (GLYPHS[letter]) {
        tile = createLetter(letter, TILE_WIDTH, "tile");
      } else {
        tile = make("div", "letter tile placeholder");
        tile.dataset.letter = letter;
        tile.setAttribute("aria-hidden", "true");
      }
      const label = make("span", "tile-label", letter + letter.toLowerCase());
      label.setAttribute("aria-hidden", "true");
      tile.prepend(label);
      grid.append(tile);
    }

    const size = slider("Container width", { min: 100, max: 384, value: 384, step: 4, unit: "px" });
    const out = readout([""]);
    const update = () => {
      grid.style.width = `${size.input.value}px`;
      const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      const rows = [];
      for (let left = ALPHABET.length; left > 0; left -= cols) rows.push(Math.min(cols, left));
      out.textContent = [
        `columns = ${cols}   (each column at least 3rem = 48px)`,
        `26 tiles = ${rows.join(" + ")}  →  ${rows.length} rows`,
      ].join("\n");
    };
    size.input.addEventListener("input", update);
    new ResizeObserver(update).observe(grid);

    const controls = make("div", "controls");
    controls.append(size.label);
    stage.append(grid, controls, out);
  },

  // Step 5: the glyph's extent against the tile's centre, with and without shift.
  centre(stage) {
    const [min, max] = extentOf(LOWER);
    const centre = centreOf(LOWER);
    const shift = TILE_WIDTH / 2 - centre;
    const upperShift = TILE_WIDTH / 2 - centreOf(UPPER);
    const [upperMin, upperMax] = extentOf(UPPER);

    const frame = makeFrame({ grid: {} });
    const grid = frame.querySelector(".grid");
    const extent = make("span", "extent");
    extent.style.setProperty("--size", max - min);
    grid.append(make("span", "centre-line"), extent);

    const parts = frame.querySelectorAll(".part");
    const apply = (on) => {
      const s = on ? shift : 0;
      parts.forEach((part, i) => {
        setState(part, "l", LOWER[i], s);
        setState(part, "u", UPPER[i], s);
      });
      extent.style.setProperty("--from", min + s);
    };
    apply(false);

    const toggle = checkbox(`Apply shift (moves every part ${fmt(shift)} on x)`);
    toggle.input.addEventListener("change", () => apply(toggle.input.checked));
    const controls = make("div", "controls");
    controls.append(toggle.label);

    const key = make("p", "key");
    key.append(
      make("span", "key-centre", "┆ Dashed line: tile centre, x = 4.5"),
      make("span", "key-extent", "⊥ Blue bracket: glyph extent and centre"),
    );

    stage.append(
      wrapFrame(frame),
      key,
      controls,
      readout([
        `extentOf(lowercase) = [${fmt(min)}, ${fmt(max)}]`,
        `centreOf(lowercase) = (${fmt(min)} + ${fmt(max)}) / 2 = ${fmt(centre)}`,
        `tile centre         = ${TILE_WIDTH} / 2 = ${fmt(TILE_WIDTH / 2)}`,
        `lowerShift          = ${fmt(TILE_WIDTH / 2)} − ${fmt(centre)} = ${fmt(shift)}`,
        ``,
        `uppercase: extentOf = [${fmt(upperMin)}, ${fmt(upperMax)}], upperShift = ${fmt(upperShift)}`,
      ]),
    );
  },

  // Step 6: the variables setState wrote onto each part.
  vars(stage) {
    const tile = createLetter("B", TILE_WIDTH, "tile");
    const parts = [...tile.querySelectorAll(".part")];
    const keys = ["x", "y", "w", "h", "radius"];

    const table = make("table", "vars");
    const head = make("tr");
    for (const text of ["Part", "State", "x", "y", "w", "h", "radius"]) head.append(make("th", null, text));
    table.appendChild(make("thead")).append(head);
    const body = table.appendChild(make("tbody"));

    parts.forEach((part, i) => {
      const read = (prefix, key) => part.style.getPropertyValue(`--${prefix}${key}`).trim();
      for (const [prefix, state] of [
        ["l", "lower --l…"],
        ["u", "upper --u…"],
      ]) {
        const row = make("tr");
        if (prefix === "l") {
          const name = make("td", "name");
          name.rowSpan = 2;
          name.append(swatch(i), PARTS[i].name);
          row.append(name);
        }
        row.append(make("td", "state", state));
        for (const key of keys) {
          const value = read(prefix, key);
          const cell = make("td", null, key === "radius" ? shortRadius(value) : fmt(parseFloat(value)));
          if (read("l", key) !== read("u", key)) cell.classList.add("is-diff");
          row.append(cell);
        }
        body.append(row);
      }
    });

    const shift = TILE_WIDTH / 2 - centreOf(LOWER);
    const [lo, up] = B[1];
    const wrap = make("div", "table-wrap");
    wrap.append(table);

    stage.append(
      wrap,
      readout([
        `Upper bowl, lowercase ${PARTS[1].source[0]} → cx ${fmt(lo.cx)}, cy ${fmt(lo.cy)}, w ${fmt(lo.w)}, h ${fmt(lo.h)}`,
        `--lx = cx − w/2 + shift    = ${fmt(lo.cx)} − ${fmt(lo.w / 2)} + (${fmt(shift)}) = ${fmt(lo.cx - lo.w / 2 + shift)}`,
        `--ly = cy − h/2 − TILE_TOP = ${fmt(lo.cy)} − ${fmt(lo.h / 2)} − (${fmt(TILE_TOP)}) = ${fmt(lo.cy - lo.h / 2 - TILE_TOP)}`,
        ``,
        `Upper bowl, uppercase ${PARTS[1].source[1]} → cy ${fmt(up.cy)}`,
        `--uy = ${fmt(up.cy)} − ${fmt(up.h / 2)} − (${fmt(TILE_TOP)}) = ${fmt(up.cy - up.h / 2 - TILE_TOP)}`,
        ``,
        `Stem radius "pill" → radiusCss gives:`,
        `--lradius: ${parts[0].style.getPropertyValue("--lradius").trim()}`,
      ]),
    );
  },

  // Step 7: resize the tile and watch 1em follow.
  em(stage) {
    const specimen = make("div", "specimen");
    renderSpecimen(specimen);
    const tile = specimen.firstElementChild;
    const glyph = tile.querySelector(".glyph");

    const size = slider("Tile width", { min: 120, max: 360, value: 240, step: 10, unit: "px" });
    const out = readout([""]);
    const update = () => {
      specimen.style.width = `${size.input.value}px`;
      const width = tile.clientWidth;
      const unit = parseFloat(getComputedStyle(glyph).fontSize);
      out.textContent = [
        `100cqw = tile inner width = ${fmt(width)}px`,
        `1em    = ${fmt(width)}px / 9 = ${unit.toFixed(2)}px`,
        `upper bowl top (lowercase) = --ly × 1em = 5 × ${unit.toFixed(2)} = ${(5 * unit).toFixed(1)}px`,
      ].join("\n");
    };
    size.input.addEventListener("input", update);
    new ResizeObserver(update).observe(tile);

    const controls = make("div", "controls");
    controls.append(size.label);
    stage.append(specimen, controls, out);
  },

  // Step 8: hover, focus or the button switches which set of variables is read.
  hover(stage) {
    const specimen = make("div", "specimen speed");
    renderSpecimen(specimen);
    const tile = specimen.firstElementChild;

    const status = readout([""]);
    let hovering = false;
    let focused = false;
    const update = () => {
      const upper = hovering || focused || tile.classList.contains("is-upper");
      status.textContent = upper
        ? "Uppercase: CSS reads --ux, --uy, --uw, --uh …\nupper bowl top = --uy × 1em = 1em"
        : "Lowercase: CSS reads --lx, --ly, --lw, --lh …\nupper bowl top = --ly × 1em = 5em";
    };
    tile.addEventListener("pointerenter", () => {
      hovering = true;
      update();
    });
    tile.addEventListener("pointerleave", () => {
      hovering = false;
      update();
    });
    tile.addEventListener("focus", () => {
      focused = tile.matches(":focus-visible");
      update();
    });
    tile.addEventListener("blur", () => {
      focused = false;
      update();
    });

    const toggle = make("button", "btn", "Force uppercase");
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", "false");
    toggle.addEventListener("click", () => {
      const upper = tile.classList.toggle("is-upper");
      toggle.setAttribute("aria-pressed", String(upper));
      update();
    });

    const speed = slider("Duration", { min: 200, max: 3000, value: 500, step: 100, unit: "ms" });
    speed.input.addEventListener("input", () => {
      specimen.style.setProperty("--speed", `${speed.input.value}ms`);
    });

    const controls = make("div", "controls");
    controls.append(toggle, speed.label);
    update();
    stage.append(specimen, controls, status);
  },

  // Step 9: the upper bowl slides because only its top changes.
  motion(stage) {
    const shift = TILE_WIDTH / 2 - centreOf(LOWER);
    const frame = makeFrame({ shift, coloured: true, grid: {} });
    const wrap = make("div", "frame-wrap speed");
    wrap.append(frame);
    wrap.style.setProperty("--speed", "1500ms");

    const bowl = frame.querySelectorAll(".part")[1];
    const glyph = frame.querySelector(".glyph");
    const out = readout([""]);
    const show = () => {
      const unit = parseFloat(getComputedStyle(glyph).fontSize);
      const style = getComputedStyle(bowl);
      const top = parseFloat(style.top) / unit;
      const left = parseFloat(style.left) / unit;
      out.textContent = [
        `upper bowl top     = ${top.toFixed(2)}em`,
        `upper bowl left    = ${left.toFixed(2)}em   (unchanged)`,
        `upper bowl opacity = ${style.opacity}        (unchanged)`,
      ].join("\n");
    };

    // read the computed values every frame while the transition runs
    let running = false;
    const watch = () => {
      if (running) return;
      running = true;
      const until = performance.now() + Number(speed.input.value) + 100;
      const tick = (now) => {
        show();
        if (now < until) requestAnimationFrame(tick);
        else running = false;
      };
      requestAnimationFrame(tick);
    };

    const toggle = make("button", "btn", "Switch to uppercase");
    toggle.type = "button";
    toggle.setAttribute("aria-pressed", "false");
    toggle.addEventListener("click", () => {
      const upper = toggle.getAttribute("aria-pressed") !== "true";
      toggle.setAttribute("aria-pressed", String(upper));
      toggle.textContent = upper ? "Switch to lowercase" : "Switch to uppercase";
      frame.classList.toggle("is-upper", upper);
      watch();
    });

    const speed = slider("Duration", { min: 200, max: 3000, value: 1500, step: 100, unit: "ms" });
    speed.input.addEventListener("input", () => {
      wrap.style.setProperty("--speed", `${speed.input.value}ms`);
    });

    const controls = make("div", "controls");
    controls.append(toggle, speed.label);
    stage.append(wrap, controls, out);
    requestAnimationFrame(show);
  },

  // Step 10: the same toggle button as the P3 page.
  final(stage) {
    const button = make("button", "case-toggle", "Show uppercase");
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    const specimen = make("div", "specimen");
    renderSpecimen(specimen);

    button.addEventListener("click", () => {
      const upper = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(upper));
      button.textContent = upper ? "Show lowercase" : "Show uppercase";
      specimen.classList.toggle("is-upper", upper);
    });

    const wrap = make("div", "final");
    wrap.append(button, specimen);
    stage.append(wrap);
  },
};

// "2em 2em 2em 2em / 2em 2em 2em 2em" → "2em" when every corner matches.
function shortRadius(value) {
  const tokens = value.split(/[\s/]+/).filter(Boolean);
  return tokens.every((t) => t === tokens[0]) ? tokens[0] : value;
}

// Element → indented HTML text. Long style attributes are abbreviated.
function describe(node, depth = 0) {
  const pad = "  ".repeat(depth);
  const attrs = [...node.attributes]
    .map((a) => ` ${a.name}="${a.name === "style" ? describeStyle(node.style) : a.value}"`)
    .join("");
  const open = `${pad}<${node.localName}${attrs}>`;
  const close = `</${node.localName}>`;
  if (!node.children.length) return open + node.textContent + close;
  return [open, ...[...node.children].map((child) => describe(child, depth + 1)), pad + close].join("\n");
}

function describeStyle(style) {
  const decls = [...style].map((name) => `${name}: ${style.getPropertyValue(name).trim()}`);
  if (decls.length <= 2) return decls.join("; ");
  return `${decls.slice(0, 2).join("; ")}; … ${decls.length} variables in total`;
}

// ---- code highlighting ----

const SYNTAX = {
  js: [
    ["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
    ["string", /"[^"\n]*"|'[^'\n]*'|`[^`]*`/],
    ["keyword", /\b(?:function|return|const|let|if|else|for|of|new|true|false|null|continue)\b/],
    ["number", /\b\d+(?:\.\d+)?\b/],
  ],
  css: [
    ["comment", /\/\*[\s\S]*?\*\//],
    ["string", /"[^"\n]*"/],
    ["property", /--[\w-]+|[a-z-]+(?=:\s)/],
    ["number", /\b\d+(?:\.\d+)?(?:ms|px|em|rem|deg|cqw|%)?/],
  ],
  html: [
    ["comment", /<!--[\s\S]*?-->/],
    ["string", /"[^"]*"/],
    ["tag", /<\/?[a-z][\w-]*|\/?>/],
    ["attr", /[\w-]+(?==)/],
  ],
};

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function highlight(code, lang) {
  const rules = SYNTAX[lang];
  const pattern = new RegExp(rules.map(([, re]) => `(${re.source})`).join("|"), "g");
  let html = "";
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    const kind = rules[match.slice(1).findIndex((group) => group !== undefined)][0];
    const open = `<span class="tok-${kind}">`;
    // close and reopen at line breaks so the result can be split into lines
    const token = escapeHtml(match[0]).replaceAll("\n", `</span>\n${open}`);
    html += escapeHtml(code.slice(last, match.index)) + open + token + "</span>";
    last = match.index + match[0].length;
  }
  return html + escapeHtml(code.slice(last));
}

// data-hl="2,5-7" marks lines 2, 5, 6 and 7.
function parseLines(spec = "") {
  const lines = new Set();
  for (const range of spec.split(",").filter(Boolean)) {
    const [from, to = from] = range.split("-").map(Number);
    for (let n = from; n <= to; n++) lines.add(n);
  }
  return lines;
}

function renderCode(pre) {
  const marked = parseLines(pre.dataset.hl);
  const lines = highlight(pre.textContent.trimEnd(), pre.dataset.lang).split("\n");
  const code = make("code");
  code.innerHTML = lines
    .map((line, i) => {
      const cls = marked.has(i + 1) ? "line is-marked" : "line";
      return `<span class="${cls}">${line || " "}</span>`;
    })
    .join("");
  pre.replaceChildren(code);
}

// ---- start ----

document.querySelectorAll(".code pre").forEach(renderCode);
document.querySelectorAll("[data-demo]").forEach((stage) => DEMOS[stage.dataset.demo](stage));

// Same as P3: enable transitions only after the first paint.
requestAnimationFrame(() => {
  requestAnimationFrame(() => document.body.classList.add("is-ready"));
});
