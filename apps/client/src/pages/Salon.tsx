import { LobbyState } from '@tanuki/shared'
import { CharacterAvatar } from '../components/avatars/CharacterAvatar'
import { socket } from '../socket'

const ROOM_W = 800
const ROOM_H = 500

export function Salon({
  lobby,
  selfId,
  onTsumego,
}: {
  lobby: LobbyState
  selfId: string
  onTsumego: () => void
}) {
  const me = lobby.players.find(p => p.id === selfId)
  const searching = me?.state === 'searching'

  const clickFloor = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * ROOM_W
    const y = ((e.clientY - rect.top) / rect.height) * ROOM_H
    socket.emit('lobby:move', { x, y })
  }

  return (
    <div className="salon-layout">
      <div className="salon-room" onClick={clickFloor} title="לחצו כדי ללכת">
        <div className="salon-sign">🍵 סלון הגו של טאנוקי</div>
        <div className="salon-rug" />
        {lobby.tables.map(t => (
          <div
            key={t.index}
            className={`go-table${t.gameId ? ' busy' : ''}`}
            style={{
              left: `${(t.x / ROOM_W) * 100}%`,
              top: `${(t.y / ROOM_H) * 100}%`,
            }}
          />
        ))}
        {lobby.players.map(p => (
          <div
            key={p.id}
            className={`avatar${p.id === selfId ? ' me' : ''}`}
            style={{
              left: `${(p.x / ROOM_W) * 100}%`,
              top: `${(p.y / ROOM_H) * 100}%`,
              zIndex: Math.round(p.y),
            }}
          >
            <div className="nametag">
              {p.name} <span className="rank">({p.rank})</span>
            </div>
            <div className="sprite" style={{ position: 'relative' }}>
              <CharacterAvatar character={p.character} size={54} />
              {p.state === 'searching' && <span className="status-bubble">🔍</span>}
              {p.state === 'playing' && <span className="status-bubble">⚫</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="salon-side">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {searching ? (
            <>
              <div style={{ textAlign: 'center' }}>מחפשים יריב… 🔍</div>
              <button className="peach" onClick={() => socket.emit('match:cancel')}>
                ביטול חיפוש
              </button>
            </>
          ) : (
            <button className="peach" onClick={() => socket.emit('match:find')}>
              ⚔️ מצא משחק
            </button>
          )}
          <button className="lilac" onClick={onTsumego}>
            🧩 אימון: חיים ומוות
          </button>
        </div>
        <div className="card">
          <h3>בסלון עכשיו ({lobby.players.length})</h3>
          {lobby.players.map(p => (
            <div className="player-row" key={p.id}>
              <CharacterAvatar character={p.character} size={26} />
              <span>{p.name}</span>
              <span className="rank">{p.rank}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
