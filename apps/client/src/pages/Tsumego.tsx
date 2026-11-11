import GoBoard from '@sabaki/go-board'
import * as sgf from '@sabaki/sgf'
import type { SgfNode } from '@sabaki/sgf'
import { SignMap, Vertex } from '@tanuki/shared'
import { useEffect, useMemo, useRef, useState } from 'react'
import { stoneClick, stoneRustle } from '../audio/sounds'
import { Goban } from '../components/Goban'
import { PROBLEMS, Problem } from '../tsumego/problems'

type Status = 'playing' | 'solved' | 'failed' | 'showing'

function isRight(node: SgfNode): boolean {
  return (node.data.C ?? []).some(c => c.includes('RIGHT'))
}

function setupBoard(root: SgfNode): GoBoard {
  let board = GoBoard.fromDimensions(9)
  for (const v of root.data.AB ?? []) board = board.set(sgf.parseVertex(v), 1)
  for (const v of root.data.AW ?? []) board = board.set(sgf.parseVertex(v), -1)
  return board
}

/** המסלול (רשימת צמתים) אל הפתרון הנכון הראשון */
function rightPath(root: SgfNode): SgfNode[] {
  const walk = (node: SgfNode, path: SgfNode[]): SgfNode[] | null => {
    if (isRight(node)) return [...path, node]
    for (const child of node.children) {
      const found = walk(child, [...path, node])
      if (found) return found
    }
    return null
  }
  for (const child of root.children) {
    const found = walk(child, [])
    if (found) return found
  }
  return []
}

export function Tsumego({ onBack }: { onBack: () => void }) {
  const initialRoot = useMemo(() => sgf.parse(PROBLEMS[0].sgf)[0], [])
  const [index, setIndex] = useState(0)
  const [board, setBoard] = useState<GoBoard>(() => setupBoard(initialRoot))
  const [status, setStatus] = useState<Status>('playing')
  const [message, setMessage] = useState<string | null>(null)
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [lastMove, setLastMove] = useState<Vertex | null>(null)
  const nodeRef = useRef<SgfNode | null>(initialRoot)
  const rootRef = useRef<SgfNode | null>(initialRoot)
  const timers = useRef<number[]>([])

  const problem: Problem = PROBLEMS[index]

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }

  const load = (i: number) => {
    clearTimers()
    const root = sgf.parse(PROBLEMS[i].sgf)[0]
    rootRef.current = root
    nodeRef.current = root
    setIndex(i)
    setBoard(setupBoard(root))
    setStatus('playing')
    setMessage(null)
    setLastMove(null)
  }

  useEffect(() => () => clearTimers(), [])

  const playSound = (prev: GoBoard, next: GoBoard) => {
    stoneClick()
    const prevStones = prev.signMap.flat().filter(s => s !== 0).length
    const nextStones = next.signMap.flat().filter(s => s !== 0).length
    const removed = prevStones + 1 - nextStones
    if (removed > 0) stoneRustle(removed + 1)
  }

  const finishSolved = () => {
    setStatus('solved')
    setMessage('🎉 נכון! פתרתם את הבעיה')
    setSolved(prev => new Set(prev).add(problem.id))
  }

  const onPlay = (v: Vertex) => {
    if (status !== 'playing') return
    const node = nodeRef.current
    if (!node) return
    const coord = sgf.stringifyVertex(v)
    const child = node.children.find(c => (c.data.B ?? [])[0] === coord)

    const next = board.makeMove(1, v, { preventOverwrite: true, preventSuicide: true })
    playSound(board, next)
    setBoard(next)
    setLastMove(v)

    if (!child || (child.data.C ?? []).some(c => c.includes('WRONG'))) {
      setStatus('failed')
      setMessage('❌ לא זה… נסו שוב')
      return
    }
    nodeRef.current = child
    if (isRight(child)) {
      finishSolved()
      return
    }
    // תגובת המחשב לפי עץ הווריאציות
    const reply = child.children.find(c => (c.data.W ?? []).length > 0)
    if (!reply) {
      setStatus('failed')
      setMessage('❌ הכיוון לא מוביל לפתרון. נסו שוב')
      return
    }
    const t = window.setTimeout(() => {
      const wv = sgf.parseVertex(reply.data.W![0])
      setBoard(b => {
        const after = b.makeMove(-1, wv, { preventOverwrite: true })
        playSound(b, after)
        return after
      })
      setLastMove(wv)
      nodeRef.current = reply
      if (isRight(reply)) {
        finishSolved()
      } else if (reply.children.length === 0) {
        setStatus('failed')
        setMessage('❌ לבן הפריך את המהלך. נסו שוב')
      }
    }, 450)
    timers.current.push(t)
  }

  const showSolution = () => {
    const root = rootRef.current
    if (!root) return
    clearTimers()
    setBoard(setupBoard(root))
    setLastMove(null)
    setStatus('showing')
    setMessage('👀 צפו בפתרון…')
    const path = rightPath(root)
    path.forEach((node, i) => {
      const t = window.setTimeout(() => {
        const isB = (node.data.B ?? []).length > 0
        const coord = isB ? node.data.B![0] : node.data.W?.[0]
        if (!coord) return
        const v = sgf.parseVertex(coord)
        setBoard(b => {
          const after = b.makeMove(isB ? 1 : -1, v, { preventOverwrite: true })
          playSound(b, after)
          return after
        })
        setLastMove(v)
        if (i === path.length - 1) setMessage('זה הפתרון! ✨')
      }, 600 * (i + 1))
      timers.current.push(t)
    })
  }

  return (
    <div className="tsumego-layout">
      <div className="card problem-list">
        {PROBLEMS.map((p, i) => (
          <button
            key={p.id}
            className={`problem-item${i === index ? ' active' : ''}${solved.has(p.id) ? ' solved' : ''}`}
            onClick={() => load(i)}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div className="card" style={{ padding: '10px 18px', textAlign: 'center' }}>
          <b>{problem.title}</b> · שחור משחק
          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{problem.hint}</div>
        </div>
        <Goban
          signMap={board.signMap as SignMap}
          onPlay={onPlay}
          ghostSign={status === 'playing' ? 1 : null}
          lastMove={lastMove}
          pixel={440}
        />
        <div
          className={`tsumego-status${status === 'solved' ? ' good' : status === 'failed' ? ' bad' : ''}`}
        >
          {message ?? 'מצאו את המהלך הטוב ביותר לשחור'}
        </div>
        <div className="btn-row">
          <button onClick={() => load(index)}>🔄 נסה שוב</button>
          <button className="lilac" onClick={showSolution}>
            💡 הצג פתרון
          </button>
          <button
            className="peach"
            onClick={() => load((index + 1) % PROBLEMS.length)}
          >
            הבעיה הבאה ←
          </button>
          <button onClick={onBack}>חזרה לסלון</button>
        </div>
      </div>
    </div>
  )
}
