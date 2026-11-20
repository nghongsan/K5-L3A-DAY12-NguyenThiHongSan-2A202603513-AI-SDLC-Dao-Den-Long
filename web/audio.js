// Âm thanh tổng hợp bằng WebAudio (không dùng file ngoài): nhạc nền đêm + hiệu ứng.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.7;
    this.music = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  tone(freq, dur, { type = 'sine', gain = 0.25, to = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, { gain = 0.2, freq = 1200, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'pickup': this.tone(1320, 0.08, { type: 'triangle', gain: 0.18 }); this.tone(1760, 0.07, { type: 'triangle', gain: 0.12, delay: 0.05 }); break;
      case 'charm': [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', gain: 0.16, delay: i * 0.06 })); break;
      case 'lit': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.9, { gain: 0.16, delay: i * 0.07 })); break;
      case 'pulse': this.tone(300, 0.35, { type: 'sine', gain: 0.3, to: 900 }); this.noise(0.3, { gain: 0.12, freq: 2500 }); break;
      case 'hit': this.tone(140, 0.3, { type: 'square', gain: 0.18, to: 60 }); this.noise(0.15, { gain: 0.15, freq: 400 }); break;
      case 'jump': this.tone(420, 0.14, { type: 'triangle', gain: 0.15, to: 700 }); break;
      case 'pad': this.tone(300, 0.4, { type: 'triangle', gain: 0.2, to: 1200 }); break;
      case 'dash': this.noise(0.18, { gain: 0.25, freq: 1800 }); break;
      case 'steal': this.tone(900, 0.25, { type: 'sawtooth', gain: 0.08, to: 300 }); break;
      case 'shade': this.tone(70, 0.6, { type: 'sawtooth', gain: 0.1 }); this.tone(74, 0.6, { type: 'sawtooth', gain: 0.08 }); break;
      case 'out': this.tone(500, 0.6, { type: 'sine', gain: 0.2, to: 120 }); break;
      case 'tick': this.tone(1000, 0.05, { type: 'square', gain: 0.08 }); break;
      case 'wind': this.noise(1.6, { gain: 0.18, freq: 500 }); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', gain: 0.18, delay: i * 0.12 })); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', gain: 0.18, delay: i * 0.16 })); break;
      default: break;
    }
  }

  /** Nhạc nền: nền trầm + nốt ngũ cung ngẫu nhiên, nhẹ. */
  startMusic() {
    if (!this.ctx || this.music) return;
    const pad = this.ctx.createGain();
    pad.gain.value = 0.05;
    pad.connect(this.master);
    const oscs = [110, 164.81, 220.5].map((f) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(pad);
      o.start();
      return o;
    });
    const notes = [440, 494, 587, 659, 784, 880];
    const timer = setInterval(() => {
      if (Math.random() < 0.7) this.tone(notes[Math.floor(Math.random() * notes.length)], 1.2, { gain: 0.04 });
    }, 1400);
    this.music = { pad, oscs, timer };
  }

  stopMusic() {
    if (!this.music) return;
    clearInterval(this.music.timer);
    for (const o of this.music.oscs) o.stop();
    this.music.pad.disconnect();
    this.music = null;
  }
}
