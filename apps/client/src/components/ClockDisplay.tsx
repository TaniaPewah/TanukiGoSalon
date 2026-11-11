import { ClockSnapshot, Color } from '@tanuki/shared'
import { useEffect, useRef, useState } from 'react'
import { clockTick } from '../audio/sounds'

/**
 * תצוגת שעון: השרת הוא הסמכות; כאן רק אינטרפולציה מקומית חלקה
 * מרגע קבלת ה-snapshot. isMine מפעיל טיק-טק ב-10 השניות האחרונות.
 */
export function ClockDisplay({
  clock,
  color,
  isMine,
}: {
  clock: ClockSnapshot
  color: Color
  isMine: boolean
}) {
  const [, force] = useState(0)
  const receivedAt = useRef(Date.now())
  const lastTickSecond = useRef(-1)

  useEffect(() => {
    receivedAt.current = Date.now()
  }, [clock])

  const running = clock.running === color
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => force(n => n + 1), 200)
    return () => clearInterval(t)
  }, [running])

  const base = color === 'black' ? clock.blackMs : clock.whiteMs
  const ms = Math.max(0, running ? base - (Date.now() - receivedAt.current) : base)
  const totalSec = Math.ceil(ms / 1000)
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  const urgent = running && ms < 10_000

  useEffect(() => {
    if (urgent && isMine && totalSec !== lastTickSecond.current) {
      lastTickSecond.current = totalSec
      clockTick()
    }
  })

  return (
    <span className={`clock${urgent ? ' urgent' : ''}`} dir="ltr">
      {mm}:{String(ss).padStart(2, '0')}
    </span>
  )
}
