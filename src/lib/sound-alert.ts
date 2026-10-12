"use client";

/**
 * Audio Alert Utility for ANGKON E-Commerce
 * Uses the Web Audio API to synthesize crystal-clear, zero-dependency chime alerts
 * directly through the computer's sound card/speakers. Works on all modern browsers
 * without external asset dependencies or CORS/404 issues.
 */

const STORAGE_KEY = "angkon_order_sound_enabled";

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Unlock audio on the first user interaction anywhere on the page
if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val === null ? true : val === "1";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * Play a rich, distinct 3-stage luxury order notification chime ("Ding-Dong! Cha-Ching!")
 * Audibly rings on the computer when a new order is received.
 */
export function playOrderAlertSound(volume = 0.8): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(volume, 1)), now);
    masterGain.connect(ctx.destination);

    // Chime Strike 1: Warm bright chime (t = 0.0s)
    playTone(ctx, masterGain, 659.25, now, 0.45, 0.35); // E5
    playTone(ctx, masterGain, 987.77, now, 0.5, 0.3); // B5
    playTone(ctx, masterGain, 1318.51, now + 0.02, 0.6, 0.25); // E6

    // Chime Strike 2: Joyful high lift (t = 0.22s)
    playTone(ctx, masterGain, 830.61, now + 0.22, 0.45, 0.35); // G#5
    playTone(ctx, masterGain, 1174.66, now + 0.22, 0.55, 0.3); // D6
    playTone(ctx, masterGain, 1661.22, now + 0.24, 0.7, 0.35); // G#6

    // Chime Strike 3: Cash register / celebration high sparkle (t = 0.48s)
    playTone(ctx, masterGain, 1046.5, now + 0.48, 0.5, 0.3); // C6
    playTone(ctx, masterGain, 1567.98, now + 0.48, 0.65, 0.35); // G6
    playTone(ctx, masterGain, 2093.0, now + 0.5, 0.8, 0.4); // C7
    playTone(ctx, masterGain, 3135.96, now + 0.52, 0.9, 0.2); // G7 sparkle
  } catch (err) {
    console.warn("Could not synthesize order sound alert:", err);
  }
}

/**
 * Single pleasant confirmation chime for customer checkout
 */
export function playCheckoutSuccessSound(volume = 0.5): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(volume, 1)), now);
    masterGain.connect(ctx.destination);

    playTone(ctx, masterGain, 523.25, now, 0.4, 0.3); // C5
    playTone(ctx, masterGain, 659.25, now + 0.12, 0.45, 0.3); // E5
    playTone(ctx, masterGain, 783.99, now + 0.24, 0.5, 0.3); // G5
    playTone(ctx, masterGain, 1046.5, now + 0.36, 0.6, 0.35); // C6
  } catch (err) {
    console.warn("Could not play checkout sound:", err);
  }
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  gainLevel: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Sine wave blended with subtle triangle harmonic for a bell-like physical strike
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, startTime);

  // Quick attack to avoid clicks, followed by natural exponential decay
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Request OS-level desktop notification permission
 */
export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const res = await Notification.requestPermission();
      return res === "granted";
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Send an OS-level notification (appears in Windows action center/corner)
 */
export function sendDesktopNotification(options: {
  title: string;
  body: string;
  icon?: string;
  onClick?: () => void;
}): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notif = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/logo.jpeg",
      silent: false,
    });
    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
  } catch {
    // ignore
  }
}
