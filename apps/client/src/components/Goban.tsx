import { SignMap, Vertex, vertexKey } from '@tanuki/shared'
import { useState } from 'react'

interface GobanProps {
  signMap: SignMap
  /** תצוגה מזווית הלבן (סיבוב 180 מעלות) */
  flipped?: boolean
  onPlay?: (v: Vertex) => void
  lastMove?: Vertex | null
  /** צבע אבן רפאים ב-hover (כשזה תורך) */
  ghostSign?: 1 | -1 | null
  deadMarks?: Set<string>
  pixel?: number
}

const HOSHI_9: Vertex[] = [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]]

export function Goban({
  signMap,
  flipped = false,
  onPlay,
  lastMove = null,
  ghostSign = null,
  deadMarks,
  pixel = 480,
}: GobanProps) {
  const size = signMap.length
  const [hover, setHover] = useState<Vertex | null>(null)

  const margin = pixel / (size + 1)
  const cell = (pixel - margin * 2) / (size - 1)
  const stoneR = cell * 0.47

  /** קואורדינטת לוח -> תצוגה (סיבוב ללבן) */
  const disp = (v: Vertex): Vertex =>
    flipped ? [size - 1 - v[0], size - 1 - v[1]] : v
  const px = (v: Vertex) => {
    const d = disp(v)
    return { cx: margin + d[0] * cell, cy: margin + d[1] * cell }
  }

  const fromEvent = (e: React.MouseEvent<SVGSVGElement>): Vertex | null => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = pixel / rect.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    let dx = Math.round((x - margin) / cell)
    let dy = Math.round((y - margin) / cell)
    if (dx < 0 || dx >= size || dy < 0 || dy >= size) return null
    if (flipped) {
      dx = size - 1 - dx
      dy = size - 1 - dy
    }
    return [dx, dy]
  }

  const stones: Array<{ v: Vertex; sign: 1 | -1 }> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = signMap[y][x]
      if (s !== 0) stones.push({ v: [x, y], sign: s })
    }
  }

  const showGhost =
    ghostSign !== null &&
    hover !== null &&
    signMap[hover[1]]?.[hover[0]] === 0

  return (
    <svg
      className="goban"
      viewBox={`0 0 ${pixel} ${pixel}`}
      width={pixel}
      style={{ maxWidth: '94vw', height: 'auto' }}
      onMouseMove={e => setHover(fromEvent(e))}
      onMouseLeave={() => setHover(null)}
      onClick={e => {
        const v = fromEvent(e)
        if (v && onPlay && signMap[v[1]]?.[v[0]] === 0) onPlay(v)
      }}
    >
      <defs>
        <radialGradient id="blackStone" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#6e6e6e" />
          <stop offset="70%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <radialGradient id="whiteStone" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="75%" stopColor="#efefe9" />
          <stop offset="100%" stopColor="#cfcfc5" />
        </radialGradient>
        <linearGradient id="boardWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5d9a8" />
          <stop offset="100%" stopColor="#e9c184" />
        </linearGradient>
      </defs>

      <rect width={pixel} height={pixel} rx="18" fill="url(#boardWood)" />

      {/* קווי הרשת */}
      {Array.from({ length: size }, (_, i) => (
        <g key={i} stroke="#9b7340" strokeWidth={i === 0 || i === size - 1 ? 2 : 1}>
          <line
            x1={margin + i * cell} y1={margin}
            x2={margin + i * cell} y2={pixel - margin}
          />
          <line
            x1={margin} y1={margin + i * cell}
            x2={pixel - margin} y2={margin + i * cell}
          />
        </g>
      ))}

      {/* נקודות הושי */}
      {size === 9 &&
        HOSHI_9.map(v => {
          const { cx, cy } = px(v)
          return <circle key={vertexKey(v)} cx={cx} cy={cy} r={3.5} fill="#9b7340" />
        })}

      {/* אבנים */}
      {stones.map(({ v, sign }) => {
        const { cx, cy } = px(v)
        const key = vertexKey(v)
        const dead = deadMarks?.has(key)
        return (
          <g key={key} opacity={dead ? 0.45 : 1}>
            <ellipse cx={cx + 1.5} cy={cy + 2.5} rx={stoneR} ry={stoneR * 0.95} fill="rgba(90,60,20,0.3)" />
            <circle
              cx={cx} cy={cy} r={stoneR}
              fill={sign === 1 ? 'url(#blackStone)' : 'url(#whiteStone)'}
            />
            {dead && (
              <g stroke={sign === 1 ? '#fff' : '#333'} strokeWidth="2">
                <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} />
                <line x1={cx - 6} y1={cy + 6} x2={cx + 6} y2={cy - 6} />
              </g>
            )}
          </g>
        )
      })}

      {/* סימון מהלך אחרון */}
      {lastMove && signMap[lastMove[1]]?.[lastMove[0]] !== 0 && (() => {
        const { cx, cy } = px(lastMove)
        const sign = signMap[lastMove[1]][lastMove[0]]
        return (
          <circle
            cx={cx} cy={cy} r={stoneR * 0.45}
            fill="none"
            stroke={sign === 1 ? '#fff' : '#555'}
            strokeWidth="2.2"
          />
        )
      })()}

      {/* אבן רפאים */}
      {showGhost && hover && (() => {
        const { cx, cy } = px(hover)
        return (
          <circle
            cx={cx} cy={cy} r={stoneR}
            fill={ghostSign === 1 ? 'url(#blackStone)' : 'url(#whiteStone)'}
            opacity={0.45}
          />
        )
      })()}
    </svg>
  )
}
