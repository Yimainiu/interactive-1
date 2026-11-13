/* ------------------------------------------------------------------
   Ambient sound, made in the browser (no audio files): rain is a loop
   of soft noise with hundreds of tiny drop ticks in it, filtered so it
   sounds like rain on pavement, plus a low rumble underneath.
   Browsers only allow sound after a click or a key press, so the page
   calls unlockSound() from one; until then everything stays silent.
------------------------------------------------------------------- */

let ctx = null;
let master = null;
let playing = null; // the sound that is on, or null

// a few seconds of rain, two channels so it feels wide
function rainBuffer() {
  const rate = ctx.sampleRate;
  const len = rate * 6;
  const buffer = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    // soft hiss: white noise, lightly smoothed
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.55 + (Math.random() * 2 - 1) * 0.45;
      data[i] = last * 0.35;
    }
    // drops: short bright ticks that die away in a few milliseconds
    for (let d = 0; d < 1400; d++) {
      const start = Math.floor(Math.random() * len);
      const amp = 0.15 + Math.random() * 0.5;
      const decay = rate * (0.002 + Math.random() * 0.006);
      for (let i = 0; i < decay * 5 && start + i < len; i++) {
        data[start + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / decay);
      }
    }
  }
  return buffer;
}

function build() {
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const src = ctx.createBufferSource();
  src.buffer = rainBuffer();
  src.loop = true;

  // the patter: no boom, no harsh top
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 350;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 7000;
  src.connect(high).connect(low).connect(master);

  // the rumble: the same noise, only its lows, quieter
  const rumble = ctx.createBiquadFilter();
  rumble.type = "lowpass";
  rumble.frequency.value = 260;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.9;
  src.connect(rumble).connect(rumbleGain).connect(master);

  src.start();
}

// call from a click or key press
export function unlockSound() {
  if (!ctx) build();
  if (ctx.state === "suspended") ctx.resume();
}

// fade a sound in, or everything out (null). Only "rain" exists so far
export function setAmbience(name) {
  if (!ctx || name === playing) return;
  playing = name;
  master.gain.setTargetAtTime(name === "rain" ? 0.55 : 0, ctx.currentTime, name ? 0.9 : 0.5);
}
