// audio.js — every sound is synthesized with WebAudio: no audio files,
// no network, just short oscillators and filtered noise.
let audioCtx = null;
let muted = false;

export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, gain, filterFreq) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq || 1200;
  const amp = ctx.createGain();
  amp.gain.value = gain || 0.15;
  src.connect(filter).connect(amp).connect(ctx.destination);
  src.start(t0);
}

// Named game sounds, one function each so call sites read like the game.
export const sounds = {
  grab() { tone(520, 0.07, 'triangle', 0.10); },
  chop() { noiseBurst(0.08, 0.20, 2400); tone(180, 0.06, 'square', 0.05); },
  sizzle() { noiseBurst(0.25, 0.10, 5200); },
  pour() { tone(340, 0.18, 'sine', 0.10, 0, 620); },
  ding() { tone(880, 0.25, 'sine', 0.14); tone(1318, 0.35, 'sine', 0.10, 0.08); },
  serve() { tone(660, 0.10, 'triangle', 0.12); tone(880, 0.12, 'triangle', 0.12, 0.09); tone(1100, 0.20, 'triangle', 0.12, 0.18); },
  deny() { tone(160, 0.12, 'square', 0.07); },
  walkout() { tone(392, 0.18, 'sawtooth', 0.06); tone(311, 0.28, 'sawtooth', 0.06, 0.14); },
  tick() { tone(1050, 0.04, 'square', 0.05); },
  start() { tone(523, 0.10, 'triangle', 0.12); tone(659, 0.10, 'triangle', 0.12, 0.09); tone(784, 0.22, 'triangle', 0.12, 0.18); },
};
