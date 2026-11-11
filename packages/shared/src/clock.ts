import { ClockSnapshot, Color } from './types.js'

/** שעון Fischer: זמן בסיס לכל שחקן, ותוספת (increment) אחרי כל מהלך. */
export interface ClockState {
  blackMs: number
  whiteMs: number
  incrementMs: number
  running: Color | null
  /** server timestamp שבו התחיל התור הנוכחי */
  turnStartedAt: number
}

export const DEFAULT_BASE_MS = 5 * 60 * 1000
export const DEFAULT_INCREMENT_MS = 5 * 1000

export function createClock(
  baseMs: number = DEFAULT_BASE_MS,
  incrementMs: number = DEFAULT_INCREMENT_MS,
): ClockState {
  return {
    blackMs: baseMs,
    whiteMs: baseMs,
    incrementMs,
    running: null,
    turnStartedAt: 0,
  }
}

export function startClock(clock: ClockState, color: Color, now: number): ClockState {
  return { ...clock, running: color, turnStartedAt: now }
}

/** הזמן שנותר לשחקן ברגע נתון (ללא מוטציה) */
export function remainingMs(clock: ClockState, color: Color, now: number): number {
  const base = color === 'black' ? clock.blackMs : clock.whiteMs
  if (clock.running !== color) return base
  return base - (now - clock.turnStartedAt)
}

/**
 * השחקן שבתור ביצע מהלך: מורידים את הזמן שחלף, מוסיפים increment,
 * ומעבירים את השעון ליריב. אם הזמן אזל מחזירים 'flag'.
 */
export function applyMoveToClock(
  clock: ClockState,
  mover: Color,
  now: number,
): ClockState | 'flag' {
  const left = remainingMs(clock, mover, now)
  if (left <= 0) return 'flag'
  const next: ClockState = {
    ...clock,
    running: mover === 'black' ? 'white' : 'black',
    turnStartedAt: now,
  }
  if (mover === 'black') next.blackMs = left + clock.incrementMs
  else next.whiteMs = left + clock.incrementMs
  return next
}

export function stopClock(clock: ClockState, now: number): ClockState {
  if (clock.running === null) return clock
  const left = remainingMs(clock, clock.running, now)
  const next: ClockState = { ...clock, running: null, turnStartedAt: 0 }
  if (clock.running === 'black') next.blackMs = Math.max(0, left)
  else next.whiteMs = Math.max(0, left)
  return next
}

export function clockSnapshot(clock: ClockState, now: number): ClockSnapshot {
  return {
    blackMs: Math.max(0, remainingMs(clock, 'black', now)),
    whiteMs: Math.max(0, remainingMs(clock, 'white', now)),
    incrementMs: clock.incrementMs,
    running: clock.running,
    serverNow: now,
  }
}
