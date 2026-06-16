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
   [Explore] — Acceleration whir
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

  // Part 0: Relay click precursor — tiny tick before motor catches
  const relay = ctx.createBufferSource();
  relay.buffer = createNoiseBuffer(ctx, 0.02);
  const relayHP = ctx.createBiquadFilter();
  relayHP.type = 'highpass';
  relayHP.frequency.value = 2000;
  const relayEnv = ctx.createGain();
  relayEnv.gain.setValueAtTime(0, t);
  relayEnv.gain.linearRampToValueAtTime(0.15, t + 0.002);
  relayEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  relay.connect(relayHP);
  relayHP.connect(relayEnv);
  relayEnv.connect(master);
  relay.start(t);
  relay.stop(t + 0.025);

  // Part A: Mechanical clunk (40ms after relay)
  const clunkNoise = ctx.createBufferSource();
  clunkNoise.buffer = createNoiseBuffer(ctx, 0.12);
  const clunkBP = ctx.createBiquadFilter();
  clunkBP.type = 'bandpass';
  clunkBP.frequency.value = 800;
  clunkBP.Q.value = 2;
  const clunkEnv = ctx.createGain();
  clunkEnv.gain.setValueAtTime(0, t + 0.04);
  clunkEnv.gain.linearRampToValueAtTime(0.45, t + 0.045);
  clunkEnv.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
  clunkNoise.connect(clunkBP);
  clunkBP.connect(clunkEnv);
  clunkEnv.connect(master);
  clunkNoise.start(t + 0.04);
  clunkNoise.stop(t + 0.16);

  // Part B: Bulb warm-up tone (warmer sine sweep)
  const bulb = ctx.createOscillator();
  bulb.type = 'sine';
  bulb.frequency.setValueAtTime(120, t + 0.08);
  bulb.frequency.exponentialRampToValueAtTime(350, t + 0.35);
  const bulbEnv = ctx.createGain();
  bulbEnv.gain.setValueAtTime(0, t + 0.08);
  bulbEnv.gain.linearRampToValueAtTime(0.12, t + 0.18);
  bulbEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  bulb.connect(bulbEnv);
  bulbEnv.connect(master);
  bulb.start(t + 0.08);
  bulb.stop(t + 0.5);
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

  // Atmospheric swell — warm tonal body underneath the noise
  const pad = ctx.createOscillator();
  pad.type = 'sine';
  pad.frequency.value = 180;
  const padEnv = ctx.createGain();
  padEnv.gain.setValueAtTime(0, t);
  padEnv.gain.linearRampToValueAtTime(0.04, t + 1.0);
  padEnv.gain.linearRampToValueAtTime(0.03, t + 3.0);
  padEnv.gain.linearRampToValueAtTime(0, t + 5.0);
  pad.connect(padEnv);
  padEnv.connect(master);
  pad.start(t);
  pad.stop(t + 5.5);
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
// 5. PRECISION CLICK — very short mechanical click
//    Like precise machinery engaging. Used at construction landmarks.
// ================================================================
export function playPrecisionClick(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  const click = ctx.createBufferSource();
  click.buffer = createNoiseBuffer(ctx, 0.015);

  const clickBP = ctx.createBiquadFilter();
  clickBP.type = 'bandpass';
  clickBP.frequency.value = 2500;
  clickBP.Q.value = 4;

  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(0, t);
  clickEnv.gain.linearRampToValueAtTime(0.12, t + 0.001);
  clickEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

  click.connect(clickBP);
  clickBP.connect(clickEnv);
  clickEnv.connect(master);

  click.start(t);
  click.stop(t + 0.02);
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
// 7. BRAND LOCK-IN — deep sub + warm, heavenly chime
//    Replaced the noise impact with a lush tonal chord
// ================================================================
export function playLockinResonance(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // Sub bass THUD — softened attack to prevent "speaker pop"
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(90, t);
  sub.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0, t);
  subEnv.gain.linearRampToValueAtTime(0.3, t + 0.04); // Slower attack (40ms)
  subEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  sub.connect(subEnv);
  subEnv.connect(master);
  sub.start(t);
  sub.stop(t + 0.9);

  // Heavenly Chime — warm, lush chord (A Major add9)
  // Replaces the noisy "pat" with something beautiful
  const chordFreqs = [220.0, 277.18, 329.63, 493.88]; // A3, C#4, E4, B4
  chordFreqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; // Pure, clean tone
    osc.frequency.value = freq;
    
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    // Quick soft attack, long shimmering decay
    env.gain.linearRampToValueAtTime(0.06, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    
    osc.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + 1.9);
  });

  // Deep harmonic ring (A2) to ground the chime
  const ring = ctx.createOscillator();
  ring.type = 'triangle';
  ring.frequency.value = 110;
  const ringEnv = ctx.createGain();
  ringEnv.gain.setValueAtTime(0, t);
  ringEnv.gain.linearRampToValueAtTime(0.08, t + 0.05);
  ringEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
  ring.connect(ringEnv);
  ringEnv.connect(master);
  ring.start(t);
  ring.stop(t + 1.7);

  // Cinematic breath — filtered noise swell (kept very quiet for "air")
  const breath = ctx.createBufferSource();
  breath.buffer = createNoiseBuffer(ctx, 0.8);
  const breathLP = ctx.createBiquadFilter();
  breathLP.type = 'lowpass';
  breathLP.frequency.setValueAtTime(200, t);
  breathLP.frequency.linearRampToValueAtTime(600, t + 0.4);
  breathLP.frequency.linearRampToValueAtTime(200, t + 0.8);
  const breathEnv = ctx.createGain();
  breathEnv.gain.setValueAtTime(0, t + 0.1);
  breathEnv.gain.linearRampToValueAtTime(0.04, t + 0.35);
  breathEnv.gain.linearRampToValueAtTime(0, t + 0.8);
  breath.connect(breathLP);
  breathLP.connect(breathEnv);
  breathEnv.connect(master);
  breath.start(t);
  breath.stop(t + 0.9);
}

// ================================================================
// 8. REVEAL SWELL — warm, satisfying conclusion
//    Medium-low pitch. No high frequencies. Pure warmth.
//    All tones in 80-320Hz range for reliable speaker playback.
// ================================================================
export function playRevealSwell(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // === Thud — soft percussive onset ===
  const thud = ctx.createBufferSource();
  thud.buffer = createNoiseBuffer(ctx, 0.06);
  const thudLP = ctx.createBiquadFilter();
  thudLP.type = 'lowpass';
  thudLP.frequency.value = 300;
  thudLP.Q.value = 0.8;
  const thudEnv = ctx.createGain();
  thudEnv.gain.setValueAtTime(0, t);
  thudEnv.gain.linearRampToValueAtTime(0.25, t + 0.005);
  thudEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  thud.connect(thudLP);
  thudLP.connect(thudEnv);
  thudEnv.connect(master);
  thud.start(t);
  thud.stop(t + 0.12);

  // === Deep bloom — warm body (80Hz) ===
  const bloom = ctx.createOscillator();
  bloom.type = 'sine';
  bloom.frequency.value = 80;
  const bloomEnv = ctx.createGain();
  bloomEnv.gain.setValueAtTime(0, t);
  bloomEnv.gain.linearRampToValueAtTime(0.30, t + 0.025);
  bloomEnv.gain.linearRampToValueAtTime(0.20, t + 0.2);
  bloomEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
  bloom.connect(bloomEnv);
  bloomEnv.connect(master);
  bloom.start(t);
  bloom.stop(t + 1.4);

  // === Resolve — the satisfying middle tone (160Hz) ===
  const resolve = ctx.createOscillator();
  resolve.type = 'sine';
  resolve.frequency.value = 160;
  const resolveEnv = ctx.createGain();
  resolveEnv.gain.setValueAtTime(0, t + 0.01);
  resolveEnv.gain.linearRampToValueAtTime(0.18, t + 0.06);
  resolveEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  resolve.connect(resolveEnv);
  resolveEnv.connect(master);
  resolve.start(t + 0.01);
  resolve.stop(t + 1.2);

  // === Warmth — upper harmonic (240Hz) ===
  const warm = ctx.createOscillator();
  warm.type = 'sine';
  warm.frequency.value = 240;
  const warmEnv = ctx.createGain();
  warmEnv.gain.setValueAtTime(0, t + 0.03);
  warmEnv.gain.linearRampToValueAtTime(0.07, t + 0.1);
  warmEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  warm.connect(warmEnv);
  warmEnv.connect(master);
  warm.start(t + 0.03);
  warm.stop(t + 1.0);

  // === Subtle body — adds fullness (320Hz, very quiet) ===
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.value = 320;
  const bodyEnv = ctx.createGain();
  bodyEnv.gain.setValueAtTime(0, t + 0.04);
  bodyEnv.gain.linearRampToValueAtTime(0.03, t + 0.12);
  bodyEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  body.connect(bodyEnv);
  bodyEnv.connect(master);
  body.start(t + 0.04);
  body.stop(t + 0.8);

  // === Air — very subtle room ambiance ===
  const air = ctx.createBufferSource();
  air.buffer = createNoiseBuffer(ctx, 1.0);
  const airLP = ctx.createBiquadFilter();
  airLP.type = 'lowpass';
  airLP.frequency.value = 400;
  const airEnv = ctx.createGain();
  airEnv.gain.setValueAtTime(0, t);
  airEnv.gain.linearRampToValueAtTime(0.03, t + 0.15);
  airEnv.gain.linearRampToValueAtTime(0, t + 0.8);
  air.connect(airLP);
  airLP.connect(airEnv);
  airEnv.connect(master);
  air.start(t);
  air.stop(t + 0.9);
}

// ================================================================
// 9. ACCELERATION WHIR — reel speeding up on "Explore"
// ================================================================
export function playAccelerationWhir(duration: number = 1.8): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // Rich, motorcycle/engine hum using two detuned sawtooth oscillators
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  
  // Pitch rises like a heavy engine accelerating (30Hz to 180Hz)
  osc1.frequency.setValueAtTime(30, t);
  osc1.frequency.exponentialRampToValueAtTime(180, t + duration);
  
  osc2.frequency.setValueAtTime(30.5, t); // Slight detune for thickness
  osc2.frequency.exponentialRampToValueAtTime(183, t + duration);

  const engineLP = ctx.createBiquadFilter();
  engineLP.type = 'lowpass';
  // Filter opens up as it accelerates, creating a "revving" effect
  engineLP.frequency.setValueAtTime(100, t);
  engineLP.frequency.exponentialRampToValueAtTime(800, t + duration);
  engineLP.Q.value = 2; // Slight resonance

  const engineGain = ctx.createGain();
  engineGain.gain.setValueAtTime(0, t);
  engineGain.gain.linearRampToValueAtTime(0.12, t + 0.3); // Smooth fade in
  engineGain.gain.setValueAtTime(0.12, t + duration);
  engineGain.gain.linearRampToValueAtTime(0, t + duration + 0.3); // Smooth fade out

  osc1.connect(engineLP);
  osc2.connect(engineLP);
  engineLP.connect(engineGain);
  engineGain.connect(master);
  
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + duration + 0.5);
  osc2.stop(t + duration + 0.5);

  // Add a very subtle "turbine" sine wave layer for that high-end EV sound
  const turbine = ctx.createOscillator();
  turbine.type = 'sine';
  turbine.frequency.setValueAtTime(100, t);
  turbine.frequency.exponentialRampToValueAtTime(800, t + duration);
  
  const turbineGain = ctx.createGain();
  turbineGain.gain.setValueAtTime(0, t);
  turbineGain.gain.linearRampToValueAtTime(0.04, t + 0.4);
  turbineGain.gain.setValueAtTime(0.04, t + duration);
  turbineGain.gain.linearRampToValueAtTime(0, t + duration + 0.3);

  turbine.connect(turbineGain);
  turbineGain.connect(master);
  
  turbine.start(t);
  turbine.stop(t + duration + 0.5);
}

// ================================================================
// 10. LIGHT FLASH — subtle, mature cinematic flash
// ================================================================
export function playLightFlash(): void {
  if (!audioNodes) return;
  const { ctx, master } = audioNodes;
  const t = ctx.currentTime;

  // 1. Deep cinematic sub-drop (mature, modern bass)
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(90, t);
  sub.frequency.exponentialRampToValueAtTime(20, t + 0.6);
  
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0, t);
  subEnv.gain.linearRampToValueAtTime(0.4, t + 0.02);
  subEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  
  sub.connect(subEnv);
  subEnv.connect(master);
  sub.start(t);
  sub.stop(t + 0.7);

  // 2. Soft, warm air displacement (low-passed noise)
  const air = ctx.createBufferSource();
  air.buffer = createNoiseBuffer(ctx, 0.4);
  
  const airLP = ctx.createBiquadFilter();
  airLP.type = 'lowpass';
  airLP.frequency.setValueAtTime(400, t);
  airLP.frequency.exponentialRampToValueAtTime(100, t + 0.3);
  
  const airEnv = ctx.createGain();
  airEnv.gain.setValueAtTime(0, t);
  airEnv.gain.linearRampToValueAtTime(0.08, t + 0.02);
  airEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  
  air.connect(airLP);
  airLP.connect(airEnv);
  airEnv.connect(master);
  air.start(t);
  air.stop(t + 0.5);

  // 3. Crisp mechanical shutter click (very short, muted)
  const click = ctx.createBufferSource();
  click.buffer = createNoiseBuffer(ctx, 0.02);
  
  const clickBP = ctx.createBiquadFilter();
  clickBP.type = 'bandpass';
  clickBP.frequency.value = 1200;
  clickBP.Q.value = 2;
  
  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(0, t);
  clickEnv.gain.linearRampToValueAtTime(0.1, t + 0.001);
  clickEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  
  click.connect(clickBP);
  clickBP.connect(clickEnv);
  clickEnv.connect(master);
  click.start(t);
  click.stop(t + 0.03);
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

export function getMasterVolume(): number {
  if (!audioNodes) return 1;
  return audioNodes.master.gain.value;
}

export function disposeAudio(): void {
  if (!audioNodes) return;
  stopProjectorHum();
  stopBeamSound();
  stopFilmWhir();
  // We no longer close the AudioContext or nullify audioNodes
  // because the site continues to use the audio engine (e.g. Explore acceleration whir)
}
