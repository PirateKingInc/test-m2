// All sound is synthesized at runtime with the Web Audio API — no audio
// files are loaded or fetched.

export function createAudio() {
  let ctx = null;
  let musicTimer = null;
  let musicStep = 0;

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep({ freq, duration, type = 'square', gain = 0.08, slideTo = null }) {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, c.currentTime + duration);
    amp.gain.setValueAtTime(gain, c.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(amp).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  const sfx = {
    hit: () => beep({ freq: 180, duration: 0.18, type: 'sawtooth', slideTo: 80, gain: 0.1 }),
    pickup: () => beep({ freq: 520, duration: 0.12, type: 'square', slideTo: 880, gain: 0.07 }),
    exit: () => beep({ freq: 300, duration: 0.25, type: 'triangle', slideTo: 600, gain: 0.08 }),
    gameover: () => beep({ freq: 220, duration: 0.6, type: 'sawtooth', slideTo: 60, gain: 0.09 }),
    win: () => {
      beep({ freq: 440, duration: 0.15, type: 'square', gain: 0.08 });
      setTimeout(() => beep({ freq: 660, duration: 0.15, type: 'square', gain: 0.08 }), 140);
      setTimeout(() => beep({ freq: 880, duration: 0.3, type: 'square', gain: 0.08 }), 280);
    },
  };

  const MUSIC_NOTES = [220, 262, 196, 262, 220, 175, 196, 262];

  function startMusic() {
    if (musicTimer) return;
    const c = ensureCtx();
    musicTimer = setInterval(() => {
      const freq = MUSIC_NOTES[musicStep % MUSIC_NOTES.length];
      musicStep++;
      beep({ freq, duration: 0.35, type: 'triangle', gain: 0.03 });
    }, 420);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return { ensureCtx, sfx, startMusic, stopMusic };
}
