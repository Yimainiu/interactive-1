/* ------------------------------------------------------------------
   The poem: the whole text of the piece, in one place.

   Each scene is a stanza: its hour and stage (the small line on its
   title card), its place (the card's title), an opening line (on the
   card; a stanza may leave it out), then lines that come as you do
   things in the scene. A scene asks for one of those with
   { verse: "<key>" } from its update(); the
   page shows it at the foot of the screen with its time, and adds it
   to the poem in the panel at the top left, so the poem fills in as
   you go. A scene can pass its own time ({ verse, time }) when the
   hour depends on the order you do things in, and { silent: true }
   for a line it shows itself (it then only goes into the panel).
------------------------------------------------------------------- */

export const POEM = {
  title: "Before the Sun Rises",
  subtitle: "An Interactive Poem — Documenting an Industrial Design Student’s Life at CCA",

  gate: {
    number: "I.",
    stage: "Afternoon – Arrival & First Day",
    place: "Old Entrance",
    // no line on this card: the stanza starts at the door
    lines: {
      first: { time: "1:40 pm", text: "The first time, I came in through this door." }, // the door's dot, the first time
      hello: { time: "1:42 pm", text: "“Hello, CCA.”" }, // above the ID card, as its pop-up opens
      door: { time: "1:45 pm", text: "I did not know yet how long the afternoon would be." }, // the door again: then in
    },
  },

  studio: {
    number: "II.",
    stage: "Night – The Middle Years",
    place: "ID Studio",
    open: "In the cold, silent studio, we were ravens deep in the night.",
    lines: {
      sketches: { time: "6:50 pm", text: "We drew one more sketch. Then another." },
      monitor: { time: "9:15 pm", text: "We rebuilt the model, again." },
      printer: { time: "11:40 pm", text: "The printer hummed through a long job. We waited." },
      lamp: { time: "2:10 am", text: "We were the last light on the floor." },
    },
  },

  main: {
    number: "III.",
    stage: "Morning – Leave & Graduation",
    place: "Main Gate",
    open: "Morning. The ravens had gone; soon, so would I.",
    lines: {
      letgo: { time: "6:05 am", text: "I let it go. The scars would heal." }, // the walker's first steps
      rising: { time: "6:15 am", text: "Behind us, something new was already rising." }, // the timber building comes up
      marks: { time: "6:25 am", text: "The marks we left would fade, a little more each year." }, // well on toward the fence
      leave: { time: "6:30 am", text: "Before the sun rose, it was time to leave." }, // at the gate
    },
    goodbye: "Goodbye, CCA.", // the last card, and the poem's last line
  },
};
