type AudioContextCtor = typeof AudioContext

const BEEP_SPACING_S = 0.22

let audioCtx: AudioContext | null = null

function getAudioContextCtor(): AudioContextCtor | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  )
}

export function ensureAudioContext(): AudioContext | null {
  if (!audioCtx) {
    const Ctor = getAudioContextCtor()
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

// Short beeps synthesized via the Web Audio API — no audio asset needed.
export function playBeep(volume: number, beeps = 2, frequency = 880) {
  if (volume <= 0) return

  const ctx = ensureAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  // `exponentialRampToValueAtTime` can never reach 0, hence the tiny floor.
  const peak = Math.max(0.0002, 0.35 * volume)

  for (let index = 0; index < beeps; index += 1) {
    const offset = index * BEEP_SPACING_S
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now + offset)
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + BEEP_SPACING_S)
  }
}

/** Browsers only allow audio once the page has been interacted with. */
export function unlockAudioOnFirstInteraction() {
  const handler = () => {
    ensureAudioContext()
    document.removeEventListener('pointerdown', handler)
    document.removeEventListener('keydown', handler)
  }
  document.addEventListener('pointerdown', handler)
  document.addEventListener('keydown', handler)
}
