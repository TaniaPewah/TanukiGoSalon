import {
  Color,
  GameSnapshot,
  PlayerPublic,
  RatingUpdatePayload,
  SignMap,
  Vertex,
  opponentOf,
  scoreGame,
} from '@tanuki/shared'
import { useEffect, useRef } from 'react'
import { stoneClick, stoneRustle } from '../audio/sounds'
import { ClockDisplay } from '../components/ClockDisplay'
import { Goban } from '../components/Goban'
import { CharacterAvatar } from '../components/avatars/CharacterAvatar'
import { socket } from '../socket'

const REASON_TEXT: Record<string, string> = {
  score: 'לפי ספירה',
  resign: 'בכניעה',
  timeout: 'בפקיעת זמן',
  repetition: 'תיקו - חזרה משולשת',
  disconnect: 'היריב התנתק',
}

function PlayerCard({
  player,
  color,
  snapshot,
  isMine,
}: {
  player: PlayerPublic
  color: Color
  snapshot: GameSnapshot
  isMine: boolean
}) {
  const active = snapshot.status === 'playing' && snapshot.turn === color
  return (
    <div className={`card player-card${active ? ' active' : ''}`}>
      <CharacterAvatar character={player.character} size={44} />
      <div className="info">
        <b>
          {player.name}
          {isMine ? ' (את/ה)' : ''}
        </b>
        <span>
          {player.rank} · שבויים: {snapshot.captures[color]}
        </span>
      </div>
      <span className={`stone-dot ${color}`} style={{ marginInlineStart: 8 }} />
      <ClockDisplay clock={snapshot.clock} color={color} isMine={isMine} />
    </div>
  )
}

export function Game({
  snapshot,
  myColor,
  ratingUpdate,
  illegal,
  onBack,
}: {
  snapshot: GameSnapshot
  myColor: Color
  ratingUpdate: RatingUpdatePayload | null
  illegal: string | null
  onBack: () => void
}) {
  const prevMap = useRef<SignMap | null>(null)
  const gameId = snapshot.gameId
  const oppColor = opponentOf(myColor)

  // צלילים לפי diff בין snapshots
  useEffect(() => {
    const prev = prevMap.current
    prevMap.current = snapshot.signMap
    if (!prev) return
    let placed = 0
    let removed = 0
    for (let y = 0; y < snapshot.signMap.length; y++) {
      for (let x = 0; x < snapshot.signMap.length; x++) {
        if (prev[y][x] === 0 && snapshot.signMap[y][x] !== 0) placed++
        if (prev[y][x] !== 0 && snapshot.signMap[y][x] === 0) removed++
      }
    }
    if (placed > 0) stoneClick()
    if (removed > 0) stoneRustle(removed + 1)
  }, [snapshot.signMap])

  const myTurn = snapshot.status === 'playing' && snapshot.turn === myColor
  const scoring = snapshot.status === 'scoring'
  const finished = snapshot.status === 'finished'

  const deadSet = new Set(snapshot.deadMarks)
  const preview = scoring
    ? scoreGame(snapshot.signMap, deadSet, snapshot.komi)
    : null

  const play = (v: Vertex) => {
    if (myTurn) socket.emit('game:move', { gameId, vertex: v })
    else if (scoring) socket.emit('game:markDead', { gameId, vertex: v })
  }

  const iAccepted = snapshot.scoringAccepted[myColor]
  const result = snapshot.result

  return (
    <div className="game-layout">
      <div className="game-side">
        <PlayerCard
          player={snapshot.players[oppColor]}
          color={oppColor}
          snapshot={snapshot}
          isMine={false}
        />
        <PlayerCard
          player={snapshot.players[myColor]}
          color={myColor}
          snapshot={snapshot}
          isMine={true}
        />
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-soft)' }}>
            מהלך {snapshot.moveNumber} · קומי {snapshot.komi}
          </div>
          {snapshot.status === 'playing' && (
            <>
              <button onClick={() => socket.emit('game:pass', { gameId })} disabled={!myTurn}>
                פס
              </button>
              <button
                className="peach"
                onClick={() => {
                  if (confirm('לוותר על המשחק?')) socket.emit('game:resign', { gameId })
                }}
              >
                כניעה
              </button>
            </>
          )}
          {scoring && (
            <>
              <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                לחצו על קבוצות מתות כדי לסמן אותן. הספירה: שטח (כללים סיניים).
              </div>
              {preview && (
                <div style={{ textAlign: 'center', fontWeight: 700 }}>
                  ⚫ {preview.black} — {preview.white} ⚪
                </div>
              )}
              <button
                onClick={() => socket.emit('game:acceptScore', { gameId })}
                disabled={iAccepted}
              >
                {iAccepted ? 'ממתינים ליריב…' : 'אישור הספירה'}
              </button>
              <button
                className="lilac"
                onClick={() => socket.emit('game:resumePlay', { gameId })}
              >
                חזרה למשחק
              </button>
            </>
          )}
        </div>
        {illegal && <div className="game-banner">{illegal}</div>}
        {scoring && <div className="game-banner">שלב הספירה 🧮</div>}
        {myTurn && <div className="game-banner">תורך! 🎯</div>}
      </div>

      <div className="goban-wrap">
        <Goban
          signMap={snapshot.signMap}
          flipped={myColor === 'white'}
          onPlay={play}
          lastMove={
            snapshot.lastMove && snapshot.lastMove.vertex !== 'pass'
              ? snapshot.lastMove.vertex
              : null
          }
          ghostSign={myTurn ? (myColor === 'black' ? 1 : -1) : null}
          deadMarks={deadSet}
        />
      </div>

      {finished && result && (
        <div className="result-overlay">
          <div className="card result-card">
            <h2>
              {result.winner === null
                ? '🤝 תיקו!'
                : result.winner === myColor
                  ? '🎉 ניצחת!'
                  : '😿 הפסדת'}
            </h2>
            <div>
              {result.winner
                ? `${result.winner === 'black' ? 'שחור' : 'לבן'} ניצח ${REASON_TEXT[result.reason] ?? ''}`
                : REASON_TEXT[result.reason]}
            </div>
            {result.scoreBlack !== undefined && (
              <div style={{ fontWeight: 700 }}>
                ⚫ {result.scoreBlack} — {result.scoreWhite} ⚪
              </div>
            )}
            {ratingUpdate && (
              <div className="delta">
                דירוג חדש: {ratingUpdate.rating} ({ratingUpdate.rank}) ·{' '}
                {ratingUpdate.delta >= 0 ? '+' : ''}
                {ratingUpdate.delta}
              </div>
            )}
            <button className="peach" onClick={onBack}>
              חזרה לסלון
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
