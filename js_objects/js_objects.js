let rooms = {
  studio: {
    text: "You are in the studio alone.",
    choices: {
      "Go to door": "door",
      "Go to sleep": "sleep",
    },
  },
  door: {
    text: "The door is locked.",
    choices: {
      "Go back": "studio",
      "Pick up keycard": "haveKeycard",
      "Leave it alone": "exit",
    },
  },
  sleep: {
    text: "You fall asleep.",
    choices: {
      "Wake up": "studio",
    },
  },
};

function goTo(name) {
  let room = rooms[name];
  let story = document.querySelector("#story");
  let choices = document.querySelector("#choices");

  story.textContent = room.text;
  choices.innerHTML = "";
  for (let words in room.choices) {
    let button = document.createElement("button");
    button.textContent = words;
    button.onclick = function () {
      goTo(room.choices[words]);
    };
    choices.appendChild(button);
  }
}

goTo("studio");
