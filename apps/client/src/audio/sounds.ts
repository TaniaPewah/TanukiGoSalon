/**
 * כל הצלילים מסונתזים ב-Web Audio - אין קבצי אודיו.
 */
let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/** "קלאק" של אבן גו על עץ: נקישת רעש חדה + הדהוד נמוך */
export function stoneClick(): void {
  const c = ac()
  const t = c.currentTime

  // נקישה: רעש קצר דרך bandpass
  const noise = c.createBufferSource()
  noise.buffer = noiseBuffer(c, 0.05)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2800
  bp.Q.value = 1.2
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.55, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  noise.connect(bp).connect(ng).connect(c.destination)
  noise.start(t)

  // "גוף" הלוח: סינוס יורד
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(210, t)
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.09)
  const og = c.createGain()
  og.gain.setValueAtTime(0.4, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
  osc.connect(og).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.12)
}

/** רשרוש אבנים (תפיסה / ערבוב בקערה): צרור רשרושים קטנים */
export function stoneRustle(count = 3): void {
  const c = ac()
  const n = Math.min(Math.max(count, 2), 7)
  for (let i = 0; i < n; i++) {
    const t = c.currentTime + i * (0.045 + Math.random() * 0.04)
    const noise = c.createBufferSource()
    noise.buffer = noiseBuffer(c, 0.08)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1500 + Math.random() * 2500
    bp.Q.value = 2.5
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18 + Math.random() * 0.12, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    noise.connect(bp).connect(g).connect(c.destination)
    noise.start(t)
  }
}

/** טיק-טק של שעון שנגמר לו הזמן */
export function clockTick(): void {
  const c = ac()
  const t = c.currentTime
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 1100
  const g = c.createGain()
  g.gain.setValueAtTime(0.12, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.04)
}

/** צליל פתיחה נעים (כניסה למשחק) */
export function chime(): void {
  const c = ac()
  const notes = [523.25, 659.25, 783.99]
  notes.forEach((f, i) => {
    const t = c.currentTime + i * 0.09
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(g).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  })
}

/** מפעיל את ה-AudioContext אחרי אינטראקציית משתמש ראשונה */
export function unlockAudio(): void {
  ac()
}
