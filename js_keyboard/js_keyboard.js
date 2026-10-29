const square = document.querySelector("#square");

const xPosText = document.querySelector("#x-pos");
const yPosText = document.querySelector("#y-pos");

const stepSize = 25;
const startX = 200;
const startY = 200;

let xPos = startX;
let yPos = startY;

function moveSquare() {
  square.style.left = `${xPos}px`;
  square.style.top = `${yPos}px`;
  xPosText.textContent = xPos;
  yPosText.textContent = yPos;
}

document.addEventListener("keydown", function (event) {
  let key = event.key;
  console.log(key);

  if (key === "ArrowLeft") {
    xPos -= stepSize;
  } else if (key === "ArrowRight") {
    xPos += stepSize;
  } else if (key === "ArrowUp") {
    yPos -= stepSize;
  } else if (key === "ArrowDown") {
    yPos += stepSize;
  } else {
    return;
  }

  moveSquare();
});
