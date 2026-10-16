let pass = false;
let attempts = 0;

const text = document.querySelector("#text");

function pickUp() {
  pass = true;
  text.innerText = "You got the pass.";
}

function enter() {
  attempts = attempts + 1;
  if (pass == true) {
    text.innerText = "Door opened!";
  }

  if (pass == false) {
    text.innerText = "No pass.";
  }
}

function restart() {
  pass = false;
  attempts = 0;
  text.innerText = "Text Description";
}
