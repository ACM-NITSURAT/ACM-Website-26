'use client';

/* ============================================================
   ProjectorAudio — Web Audio API Procedural Sound Engine v2
   
   All sounds generated procedurally — no external audio files.
   
   REDESIGNED for:
   - Much higher volume levels (clearly audible)
   - Beam projection sound (continuous warm "air" sound)
   - Distinct sounds for each construction phase
   - More impactful brand lock-in
   - Swoosh effects for drawing elements
   
   Sound Map:
   0.3s  — Startup: Mechanical CLUNK + bulb ignition
   0.55s — Beam: Warm air rush as beam fires
   0.8s  — Projection: Surface hum begins
   1.3s  — Construction: Ethereal drawing sounds per element
   2.0s  — Circle draw: Quick swoosh
   2.2s  — Diamond draw: Geometric snap
   2.5s  — NIT SURAT: Soft text appear
   2.8s  — Lock-in: Deep resonant THUD
   3.65s — Reveal: Cinematic swell outward
   ============================================================ */

type AudioNodes = {
  ctx: AudioContext;
  master: GainNode;
  humOsc: OscillatorNode | null;
  humGain: GainNode | null;
  beamSource: AudioBufferSourceNode | null;
  beamGain: GainNode | null;
  whirSource: AudioBufferSourceNode | null;
  whirGain: GainNode | null;
};

let audioNodes: AudioNodes | null = null;
let isInitialized = false;

// ---- Helpers ----

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ---- Initialization ----

export function initAudio(): boolean {
  if (isInitialized && audioNodes) return true;

  try {
    const AudioCtx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    audioNodes = {
      ctx,
      master,
      humOsc: null,
      humGain: null,
      beamSource: null,
      beamGain: null,
      whirSource: null,
      whirGain: null,
    };
    isInitialized = true;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return true;
  } catch {
    return false;
  }
}

export function resumeAudio(): void {
  if (audioNodes?.ctx.state === 'suspended') {
    audioNodes.ctx.resume().catch(() => {});
  }
}

// ================================================================
// 1. STARTUP CLUNK — mechanical projector power-on
//    Two-part: a hard noise "clunk" + a bulb warming tone
// ================================================================
export function playStartupClunk(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // Part A: Mechanical clunk (loud filtered noise burst)
  const clunkNoise = ctx.createBufferSource();
  clunkNoise.buffer = createNoiseBuffer(ctx, 0.12);
  const clunkBP = ctx.createBiquadFilter();
  clunkBP.type = 'bandpass';
  clunkBP.frequency.value = 800;
  clunkBP.Q.value = 2;
  const clunkEnv = ctx.createGain();
  clunkEnv.gain.setValueAtTime(0, t);
  clunkEnv.gain.linearRampToValueAtTime(0.45, t + 0.005);
  clunkEnv.gain.exponentialRampToValueAtTime(0.01, t + 0.10);
  clunkNoise.connect(clunkBP);
  clunkBP.connect(clunkEnv);
  clunkEnv.connect(master);
  clunkNoise.start(t);
  clunkNoise.stop(t + 0.12);

  // Part B: Bulb warm-up tone (sine sweep up)
  const bulb = ctx.createOscillator();
  bulb.type = 'sine';
  bulb.frequency.setValueAtTime(150, t + 0.05);
  bulb.frequency.exponentialRampToValueAtTime(400, t + 0.3);
  const bulbEnv = ctx.createGain();
  bulbEnv.gain.setValueAtTime(0, t + 0.05);
  bulbEnv.gain.linearRampToValueAtTime(0.12, t + 0.15);
  bulbEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  bulb.connect(bulbEnv);
  bulbEnv.connect(master);
  bulb.start(t + 0.05);
  bulb.stop(t + 0.45);
}

// ================================================================
// 2. PROJECTOR HUM — continuous low mechanical drone
//    Louder and richer than v1
// ================================================================
export function startProjectorHum(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // Base hum — low sawtooth
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 60;

  // Vibrato for mechanical rhythm
  const vib = ctx.createOscillator();
  vib.type = 'sine';
  vib.frequency.value = 4;
  const vibGain = ctx.createGain();
  vibGain.gain.value = 2;
  vib.connect(vibGain);
  vibGain.connect(osc.frequency);

  // Low-pass to keep it muted
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 180;
  lpf.Q.value = 1.5;

  const humGain = ctx.createGain();
  humGain.gain.setValueAtTime(0, t);
  humGain.gain.linearRampToValueAtTime(0.18, t + 0.6);
  humGain.gain.linearRampToValueAtTime(0.12, t + 2.0);

  osc.connect(lpf);
  lpf.connect(humGain);
  humGain.connect(master);

  osc.start(t);
  vib.start(t);

  audioNodes.humOsc = osc;
  audioNodes.humGain = humGain;
}

export function stopProjectorHum(): void {
  if (!audioNodes?.humOsc || !audioNodes.humGain) return;
  const { ctx } = audioNodes;
  const t = ctx.currentTime;
  const g = audioNodes.humGain;

  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + 0.4);

  try { audioNodes.humOsc.stop(t + 0.5); } catch { /* already stopped */ }
  audioNodes.humOsc = null;
  audioNodes.humGain = null;
}

// ================================================================
// 3. BEAM PROJECTION — continuous warm "air rush" sound
//    This is the sound of light being projected through air
//    Filtered noise that stays on until the reveal
// ================================================================
export function startBeamSound(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 8);

  // Shaped like air movement — low-mid frequency
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(300, t);
  lpf.frequency.linearRampToValueAtTime(600, t + 1.0);
  lpf.Q.value = 0.7;

  // High-pass to remove rumble
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 80;

  const beamGain = ctx.createGain();
  beamGain.gain.setValueAtTime(0, t);
  beamGain.gain.linearRampToValueAtTime(0.08, t + 0.3);
  beamGain.gain.linearRampToValueAtTime(0.05, t + 1.5);

  noise.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(beamGain);
  beamGain.connect(master);

  noise.start(t);

  audioNodes.beamSource = noise;
  audioNodes.beamGain = beamGain;
}

export function stopBeamSound(): void {
  if (!audioNodes?.beamSource || !audioNodes.beamGain) return;
  const { ctx } = audioNodes;
  const t = ctx.currentTime;

  audioNodes.beamGain.gain.cancelScheduledValues(t);
  audioNodes.beamGain.gain.setValueAtTime(audioNodes.beamGain.gain.value, t);
  audioNodes.beamGain.gain.linearRampToValueAtTime(0, t + 0.3);

  try { audioNodes.beamSource.stop(t + 0.4); } catch { /* already stopped */ }
  audioNodes.beamSource = null;
  audioNodes.beamGain = null;
}

// ================================================================
// 4. FILM REEL WHIR — clicking mechanical film threading
//    More pronounced than v1 — actual ratcheting sound
// ================================================================
export function startFilmWhir(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 6);

  // Bandpass for whir character
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 500;
  bp.Q.value = 3;

  // Amplitude modulation for mechanical clicking
  const lfo = ctx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 18; // Film shutter clicks per second
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 1;
  lfo.connect(lfoGain);

  // Create a gain node that will be modulated
  const modGain = ctx.createGain();
  modGain.gain.value = 0.5;
  lfoGain.connect(modGain.gain);

  const whirGain = ctx.createGain();
  whirGain.gain.setValueAtTime(0, t);
  whirGain.gain.linearRampToValueAtTime(0.06, t + 0.4);
  whirGain.gain.linearRampToValueAtTime(0.04, t + 2.0);

  noise.connect(bp);
  bp.connect(modGain);
  modGain.connect(whirGain);
  whirGain.connect(master);

  noise.start(t);
  lfo.start(t);

  audioNodes.whirSource = noise;
  audioNodes.whirGain = whirGain;
}

export function stopFilmWhir(): void {
  if (!audioNodes?.whirSource || !audioNodes.whirGain) return;
  const { ctx } = audioNodes;
  const t = ctx.currentTime;

  audioNodes.whirGain.gain.cancelScheduledValues(t);
  audioNodes.whirGain.gain.setValueAtTime(audioNodes.whirGain.gain.value, t);
  audioNodes.whirGain.gain.linearRampToValueAtTime(0, t + 0.3);

  try { audioNodes.whirSource.stop(t + 0.4); } catch { /* already stopped */ }
  audioNodes.whirSource = null;
  audioNodes.whirGain = null;
}

// ================================================================
// 5. TECH SWEEP — Dolby Atmos style tech/sci-fi sweep
//    Deep sub-bass drop + high-frequency crystalline shimmer.
// ================================================================
export function playTechSweep(pitch: 'low' | 'mid' | 'high' = 'mid'): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  const freqMap = { low: 50, mid: 100, high: 200 };
  const baseFreq = freqMap[pitch];

  // Layer 1: Deep resonant sub-bass drop (Dolby style rumble)
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(baseFreq * 2, t);
  sub.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.4);

  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0, t);
  subEnv.gain.linearRampToValueAtTime(0.5, t + 0.05);
  subEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

  sub.connect(subEnv);
  subEnv.connect(master);
  sub.start(t);
  sub.stop(t + 0.6);

  // Layer 2: High-tech crystalline shimmer (digital tech sound)
  const shimmer = ctx.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(baseFreq * 12, t);
  shimmer.frequency.exponentialRampToValueAtTime(baseFreq * 24, t + 0.3);

  const shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0, t);
  shimmerEnv.gain.linearRampToValueAtTime(0.12, t + 0.02);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  // Tremolo for the tech flutter effect
  const tremolo = ctx.createOscillator();
  tremolo.type = 'sine';
  tremolo.frequency.value = 40; // Fast flutter
  const tremGain = ctx.createGain();
  tremGain.gain.value = 0.6;
  tremolo.connect(tremGain);
  
  const shimmerVCA = ctx.createGain();
  shimmerVCA.gain.value = 0.4;
  tremGain.connect(shimmerVCA.gain);
  
  shimmer.connect(shimmerEnv);
  shimmerEnv.connect(shimmerVCA);
  shimmerVCA.connect(master);

  shimmer.start(t);
  shimmer.stop(t + 0.4);
  tremolo.start(t);
  tremolo.stop(t + 0.4);
}

// ================================================================
// 6. CONSTRUCTION TONE — warm ethereal pad during logo assembly
//    Louder and more present than v1
// ================================================================
export function playConstructionTone(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // A warm chord: A3 + E4 + A4
  const freqs = [220, 330, 440];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (i - 1) * 8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 0.25);
    env.gain.linearRampToValueAtTime(0.04, t + 1.0);
    env.gain.linearRampToValueAtTime(0, t + 2.0);

    osc.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 2.2);
  });
}

// ================================================================
// 7. BRAND LOCK-IN — deep, satisfying THUD + harmonic ring
//    Much more impactful than v1
// ================================================================
export function playLockinResonance(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // Sub bass THUD
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(100, t);
  sub.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0, t);
  subEnv.gain.linearRampToValueAtTime(0.35, t + 0.01);
  subEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  sub.connect(subEnv);
  subEnv.connect(master);
  sub.start(t);
  sub.stop(t + 0.8);

  // Impact noise transient
  const impact = ctx.createBufferSource();
  impact.buffer = createNoiseBuffer(ctx, 0.08);
  const impactLP = ctx.createBiquadFilter();
  impactLP.type = 'lowpass';
  impactLP.frequency.value = 500;
  const impactEnv = ctx.createGain();
  impactEnv.gain.setValueAtTime(0, t);
  impactEnv.gain.linearRampToValueAtTime(0.25, t + 0.003);
  impactEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  impact.connect(impactLP);
  impactLP.connect(impactEnv);
  impactEnv.connect(master);
  impact.start(t);
  impact.stop(t + 0.08);

  // Harmonic ring (triangle at octave)
  const ring = ctx.createOscillator();
  ring.type = 'triangle';
  ring.frequency.value = 110;
  const ringEnv = ctx.createGain();
  ringEnv.gain.setValueAtTime(0, t + 0.01);
  ringEnv.gain.linearRampToValueAtTime(0.08, t + 0.05);
  ringEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  ring.connect(ringEnv);
  ringEnv.connect(master);
  ring.start(t);
  ring.stop(t + 1.3);
}

// ================================================================
// 8. REVEAL SWELL — cinematic rise as website is unveiled
//    Rising noise + chord swell + final shimmer
// ================================================================
export function playRevealSwell(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // Rising noise sweep
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 1.5);
  const swpLP = ctx.createBiquadFilter();
  swpLP.type = 'lowpass';
  swpLP.frequency.setValueAtTime(150, t);
  swpLP.frequency.exponentialRampToValueAtTime(6000, t + 0.6);
  swpLP.frequency.exponentialRampToValueAtTime(300, t + 1.2);
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0, t);
  noiseEnv.gain.linearRampToValueAtTime(0.12, t + 0.35);
  noiseEnv.gain.linearRampToValueAtTime(0, t + 1.1);
  noise.connect(swpLP);
  swpLP.connect(noiseEnv);
  noiseEnv.connect(master);
  noise.start(t);
  noise.stop(t + 1.5);

  // Chord swell (G major: G3, B3, D4, G4)
  const chordFreqs = [196, 246.94, 293.66, 392];
  chordFreqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.06, t + 0.4);
    env.gain.linearRampToValueAtTime(0, t + 1.0);
    osc.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 1.2);
  });

  // Final shimmer
  const shimmer = ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = 2000;
  const shimEnv = ctx.createGain();
  shimEnv.gain.setValueAtTime(0, t + 0.3);
  shimEnv.gain.linearRampToValueAtTime(0.04, t + 0.5);
  shimEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  shimmer.connect(shimEnv);
  shimEnv.connect(master);
  shimmer.start(t + 0.3);
  shimmer.stop(t + 1.2);
}

// ================================================================
// Master volume & cleanup
// ================================================================

export function setMasterVolume(volume: number): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(
    Math.max(0, Math.min(1, volume)),
    ctx.currentTime + 0.05
  );
}

export function disposeAudio(): void {
  if (!audioNodes) return;
  stopProjectorHum();
  stopBeamSound();
  stopFilmWhir();
  try { audioNodes.ctx.close(); } catch { /* already closed */ }
  audioNodes = null;
  isInitialized = false;
}
