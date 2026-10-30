const square = document.querySelector("#square");
const xPosText = document.querySelector("#x-pos");
const yPosText = document.querySelector("#y-pos");
const story = document.querySelector("#story");

const stepSize = 25;
const startX = 200;
const startY = 200;

let xPos = startX;
let yPos = startY;

function updateStory() {
  if (xPos >= 350 && xPos <= 500 && yPos >= 400 && yPos <= 550) {
    square.style.backgroundColor = "yellow";
    story.textContent = "Text A";
  } else if (xPos >= 750 && xPos <= 850 && yPos >= 350 && yPos <= 450) {
    square.style.backgroundColor = "blueviolet";
    story.textContent = "Hey, what is up!";
  } else {
    story.textContent = "";
    square.style.backgroundColor = "black";
  }
}

function moveSquare() {
  square.style.left = `${xPos}px`;
  square.style.top = `${yPos}px`;
  xPosText.textContent = xPos;
  yPosText.textContent = yPos;
}

document.addEventListener("keydown", function (event) {
  let key = event.key;
  console.log(key);

  if (event.key.length === 1) {
    key = event.key.toLowerCase();
  }

  if (key === "ArrowLeft" || key === "a") {
    xPos -= stepSize;
  } else if (key === "ArrowRight" || key === "d") {
    xPos += stepSize;
  } else if (key === "ArrowUp" || key === "w") {
    yPos -= stepSize;
  } else if (key === "ArrowDown" || key === "s") {
    yPos += stepSize;
  } else {
    return;
  }

  moveSquare();
  updateStory();
});
