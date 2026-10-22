// Web Audio API Synthesized Tones & Chimes (Zero external assets, instant, 100% reliable)

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Global gesture listener to unlock Web Audio context on first user interaction
let hasUnlockedAudio = false;

export function initAudioUnlock(): void {
  if (typeof window === 'undefined' || hasUnlockedAudio) return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      hasUnlockedAudio = true;
      ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
        window.removeEventListener(evt, unlock);
      });
    } catch {}
  };

  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, unlock, { once: true, passive: true });
  });
}

/**
 * High-clarity, sparkling melodious chime for Admin Dashboard when a new order arrives!
 * Double ding-dong attention chime + sparkling melodic cascade (A5 -> C#6 -> E6 -> A6 -> C7).
 * Increased gain (0.50-0.65) so it cuts through room noise and laptop speakers cleanly.
 */
export function playCuteAdminOrderTone(): void {
  try {
    // 1. Mobile haptic vibration alert
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([120, 60, 120, 60, 250]);
      } catch {}
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Melodic sequence: Attention Double-Ding -> Sparkling Cash Register Arpeggio
    const notes = [
      { freq: 880.00, delay: 0.00, duration: 0.28, gain: 0.45 }, // A5 (Ding!)
      { freq: 1108.73, delay: 0.10, duration: 0.28, gain: 0.50 }, // C#6
      { freq: 1318.51, delay: 0.20, duration: 0.32, gain: 0.55 }, // E6 (Dong!)
      { freq: 1760.00, delay: 0.32, duration: 0.45, gain: 0.60 }, // A6 (High ring)
      { freq: 2093.00, delay: 0.44, duration: 0.75, gain: 0.65 }, // C7 (Sustained sparkle)
    ];

    const now = ctx.currentTime;

    notes.forEach(({ freq, delay, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Clear bell chime timbre
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      // Harmonious overtone shimmer
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, now + delay);

      gainNode.gain.setValueAtTime(0.001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      overtoneGain.gain.setValueAtTime(0.001, now + delay);
      overtoneGain.gain.exponentialRampToValueAtTime(gain * 0.25, now + delay + 0.015);
      overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration * 0.6);

      osc.connect(gainNode);
      overtone.connect(overtoneGain);
      gainNode.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration);
      overtone.start(now + delay);
      overtone.stop(now + delay + duration * 0.6);
    });
  } catch (err) {
    console.warn('Could not play admin order chime:', err);
  }
}

/**
 * Joyful celebratory tone & vibe when a customer successfully completes an order!
 * Plays a warm harmonic chord + triggers mobile haptic vibration.
 */
export function playOrderSuccessVibe(): void {
  try {
    // 1. Mobile haptic vibration vibe
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([40, 60, 100]);
    }

    // 2. Celebratory musical chord chime
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chordNotes = [
      { freq: 698.46, delay: 0.00, dur: 0.45, vol: 0.20 }, // F5
      { freq: 880.00, delay: 0.06, dur: 0.50, vol: 0.22 }, // A5
      { freq: 1046.50, delay: 0.12, dur: 0.60, vol: 0.25 }, // C6
      { freq: 1396.91, delay: 0.18, dur: 0.85, vol: 0.28 }, // F6 (warm high peak)
    ];

    chordNotes.forEach(({ freq, delay, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(vol, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch (err) {
    console.warn('Could not play order success vibe:', err);
  }
}
