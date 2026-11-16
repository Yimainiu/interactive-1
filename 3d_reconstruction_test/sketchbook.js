// The studio's sketches: using them in the ID Studio lays a few real pages from the
// sketchbook out on the screen. Click the top sheet to slip it under the pile.

const PAGES = [
  { src: "sketches/folding_studies.jpg", title: "Folding studies", date: "Sep 17, 2026" },
  { src: "sketches/flat_glasses.jpg", title: "Flat glasses", date: "Sep 17, 2026" },
  { src: "sketches/pockets.jpg", title: "Pockets", date: "Sep 24, 2026" },
  { src: "sketches/pop_up.jpg", title: "Pop up", date: "Sep 24, 2026" },
  { src: "sketches/sd_card.jpg", title: "A card for SD cards", date: "Sep 24, 2026" },
];
const TURN = 450; // ms a sheet takes to slide off the top, per the CSS

const book = document.querySelector("#sketchbook");
const pile = book.querySelector(".sketch-pile");
const title = book.querySelector(".sketch-title");
const date = book.querySelector(".sketch-date");
const count = book.querySelector(".sketch-count");

// the sheets, built once; the last child of the pile is the one on top
const sheets = PAGES.map((page, i) => {
  const sheet = document.createElement("figure");
  sheet.className = "sketch";
  sheet.style.setProperty("--r", `${[-2.4, 1.8, -1.1, 2.6, -0.4][i % 5]}deg`);
  sheet.style.setProperty("--d", `${(PAGES.length - 1 - i) * 90}ms`);
  const img = document.createElement("img");
  img.alt = `Sketch: ${page.title}`;
  img.loading = "lazy";
  img.decoding = "async";
  img.dataset.src = page.src;
  sheet.append(img);
  sheet.dataset.index = i;
  return sheet;
});

let turning = false;

function top() {
  return pile.lastElementChild;
}

function label() {
  const i = Number(top().dataset.index);
  title.textContent = PAGES[i].title;
  date.textContent = PAGES[i].date;
  count.textContent = `${i + 1} / ${PAGES.length}`;
}

// the first page ends up on top, the rest under it in order
export function showSketches() {
  for (const sheet of sheets) {
    const img = sheet.firstChild;
    if (!img.src) img.src = img.dataset.src;
  }
  pile.replaceChildren(...[...sheets].reverse());
  label();
  book.hidden = false;
  book.classList.remove("open");
  book.getBoundingClientRect();
  book.classList.add("open");
}

export function hideSketches() {
  book.hidden = true;
  book.classList.remove("open");
}

export const sketchesOpen = () => !book.hidden;

// the top sheet slides away and goes to the bottom of the pile
function next() {
  if (turning) return;
  turning = true;
  const sheet = top();
  sheet.classList.add("leaving");
  setTimeout(() => {
    sheet.classList.remove("leaving");
    pile.prepend(sheet);
    label();
    turning = false;
  }, TURN);
}

pile.addEventListener("click", next);
book.querySelector(".sketch-close").addEventListener("click", hideSketches);
// clicking the dim backdrop puts them down too
book.addEventListener("click", (e) => {
  if (e.target === book) hideSketches();
});
window.addEventListener("keydown", (e) => {
  if (!sketchesOpen()) return;
  if (e.key === "Escape") hideSketches();
  else if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
    e.preventDefault();
    next();
  }
});
