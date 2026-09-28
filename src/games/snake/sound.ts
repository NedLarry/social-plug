// Tiny synthesized sound effects; no audio files needed.
let audio: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
}

function ctx() {
  if (!audio) {
    try {
      audio = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

function tone(freq: number, at: number, duration: number, { type = 'square' as OscillatorType, volume = 0.05, slideTo = 0 } = {}) {
  const ac = ctx();
  if (!ac || muted) return;
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export const sounds = {
  start() {
    tone(330, 0, 0.08);
    tone(494, 0.08, 0.08);
    tone(659, 0.16, 0.12);
  },
  /** Pitch climbs with the combo. */
  eat(combo: number) {
    const base = 440 * Math.pow(1.12, combo - 1);
    tone(base, 0, 0.06);
    tone(base * 1.5, 0.05, 0.08);
  },
  bonus() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.06, 0.1, { type: 'triangle', volume: 0.07 }));
  },
  bonusSpawn() {
    tone(1200, 0, 0.05, { type: 'triangle', volume: 0.03 });
    tone(1600, 0.05, 0.05, { type: 'triangle', volume: 0.03 });
  },
  die() {
    tone(300, 0, 0.45, { type: 'sawtooth', volume: 0.06, slideTo: 60 });
  },
  pause() {
    tone(392, 0, 0.06, { type: 'triangle', volume: 0.04 });
  },
};
