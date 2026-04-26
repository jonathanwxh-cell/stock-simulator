// Web Audio API synthesizer — no external assets needed
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMaster(): GainNode {
  getCtx();
  return masterGain!;
}

// ── SFX ─────────────────────────────────────────────

export function playBuy() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
  osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playSell() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
  osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playShort() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

export function playCover() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

export function playDividend() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.3);
  });
}

export function playBankrupt() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.8);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 1.0);
}

export function playGameOver() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [440, 415, 392, 370, 349, 330, 311, 294].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.2);
  });
}

export function playTurn() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playNews() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const freqs = [880, 0, 880, 0, 880];
  freqs.forEach((freq, i) => {
    if (freq === 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.15);
  });
}

export function playMarginCall() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [800, 600, 400, 200].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.2);
  });
}

export function playLevelUp() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.06);
    gain.gain.linearRampToValueAtTime(0.3, now + i * 0.06 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.25);
  });
}

export function playClick() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.02);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

export function playError() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

// ── Volume ──────────────────────────────────────────

export function setVolume(v: number) {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, v));
  }
}

export function getVolume(): number {
  return masterGain?.gain.value ?? 0.3;
}
