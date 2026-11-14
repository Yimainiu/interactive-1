/* ------------------------------------------------------------------
   Ambient sound, made in the browser (no audio files), one for each
   scene's weather and hour:

     rain     soft noise with hundreds of tiny drop ticks in it, filtered
              so it sounds like rain on pavement, over a low rumble
     room     the hum of an empty building in the evening: ventilation
              and a faint mains tone
     morning  small birds calling now and then, and a little moving air

   Browsers only allow sound after a click or a key press, so the page
   calls unlockSound() from one; until then everything stays silent.
   Each sound is built the first time it is asked for.
------------------------------------------------------------------- */

let ctx = null;
let playing = null; // name of the sound that is on, or null
const sounds = {}; // name -> { gain, level }

const white = () => Math.random() * 2 - 1;

// a looping buffer filled one channel at a time by fill(data, rate)
function loop(seconds, channels, fill) {
  const buffer = ctx.createBuffer(channels, ctx.sampleRate * seconds, ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) fill(buffer.getChannelData(ch), ctx.sampleRate, ch);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start();
  return src;
}

function filter(type, frequency, Q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

function gain(value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

const MAKE = {
  rain(out) {
    // a few seconds of rain, two channels so it feels wide
    const src = loop(6, 2, (data, rate) => {
      // soft hiss: white noise, lightly smoothed
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = last * 0.55 + white() * 0.45;
        data[i] = last * 0.35;
      }
      // drops: short bright ticks that die away in a few milliseconds
      for (let d = 0; d < 1400; d++) {
        const start = Math.floor(Math.random() * data.length);
        const amp = 0.15 + Math.random() * 0.5;
        const decay = rate * (0.002 + Math.random() * 0.006);
        for (let i = 0; i < decay * 5 && start + i < data.length; i++) {
          data[start + i] += white() * amp * Math.exp(-i / decay);
        }
      }
    });
    // the patter: no boom, no harsh top
    src.connect(filter("highpass", 350)).connect(filter("lowpass", 7000)).connect(out);
    // the rumble: the same noise, only its lows, quieter
    src.connect(filter("lowpass", 260)).connect(gain(0.9)).connect(out);
    return 0.55;
  },

  room(out) {
    // ventilation: slow, dark noise
    const air = loop(5, 2, (data) => {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * white()) / 1.02;
        data[i] = last * 3.2;
      }
    });
    air.connect(filter("lowpass", 240)).connect(gain(0.9)).connect(out);
    // the mains tone and its octave, barely there
    for (const [hz, level] of [[60, 0.035], [120, 0.014]]) {
      const tone = ctx.createOscillator();
      tone.frequency.value = hz;
      tone.connect(gain(level)).connect(out);
      tone.start();
    }
    return 0.5;
  },

  morning(out) {
    // birds: each call is a few quick notes that slide up or down, somewhere left or right
    const seconds = 26;
    const calls = Array.from({ length: 30 }, () => ({
      at: Math.random() * (seconds - 1.5),
      pitch: 2300 + Math.random() * 2900,
      notes: 1 + Math.floor(Math.random() * 5),
      note: 0.05 + Math.random() * 0.09,
      gap: 0.03 + Math.random() * 0.07,
      slide: 0.72 + Math.random() * 0.6,
      loud: 0.04 + Math.random() * 0.16,
      side: Math.random(),
    }));
    const birds = loop(seconds, 2, (data, rate, ch) => {
      for (const c of calls) {
        const pan = ch ? c.side : 1 - c.side;
        for (let n = 0; n < c.notes; n++) {
          const start = Math.floor((c.at + n * (c.note + c.gap)) * rate);
          const len = Math.floor(c.note * rate);
          let phase = 0;
          for (let i = 0; i < len && start + i < data.length; i++) {
            const u = i / len;
            phase += (2 * Math.PI * c.pitch * (1 + (c.slide - 1) * u) * (1 + 0.04 * n)) / rate;
            data[start + i] += Math.sin(phase) * Math.sin(Math.PI * u) ** 1.5 * c.loud * (0.35 + 0.65 * pan);
          }
        }
      }
    });
    birds.connect(filter("lowpass", 6500)).connect(out);
    // air: a breath of noise that swells and fades
    const air = loop(7, 2, (data, rate) => {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = last * 0.9 + white() * 0.1;
        data[i] = last * (0.6 + 0.4 * Math.sin((2 * Math.PI * i) / data.length));
      }
    });
    air.connect(filter("bandpass", 700, 0.5)).connect(gain(0.5)).connect(out);
    return 0.6;
  },
};

// call from a click or key press
export function unlockSound() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
}

// fade one sound in and the rest out; null fades everything out
export function setAmbience(name) {
  if (!ctx || name === playing) return;
  playing = name;
  if (name && !sounds[name]) {
    const out = gain(0);
    out.connect(ctx.destination);
    sounds[name] = { gain: out, level: MAKE[name](out) };
  }
  for (const [key, s] of Object.entries(sounds)) {
    s.gain.gain.setTargetAtTime(key === name ? s.level : 0, ctx.currentTime, key === name ? 0.9 : 0.5);
  }
}
