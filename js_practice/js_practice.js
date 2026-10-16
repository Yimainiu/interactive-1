let pass = false;
let attempts = 0;

const text = document.querySelector("#text");

function pickUp() {
  pass = true;
  text.innerText = "You got the pass.";
}

function enter() {
  attempts++;
  text.innerText = pass ? "Door opened!" : `No pass. Attempts: ${attempts}`;
}

function restart() {
  pass = false;
  attempts = 0;
  text.innerText = "Text Description";
}
