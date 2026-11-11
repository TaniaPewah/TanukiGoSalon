import {
  Character,
  Color,
  GameSnapshot,
  LobbyState,
  PlayerPublic,
  RatingUpdatePayload,
} from '@tanuki/shared'
import { useEffect, useRef, useState } from 'react'
import { chime, unlockAudio } from './audio/sounds'
import { Game } from './pages/Game'
import { Login } from './pages/Login'
import { Salon } from './pages/Salon'
import { Tsumego } from './pages/Tsumego'
import { socket } from './socket'

type Screen = 'login' | 'salon' | 'game' | 'tsumego'

const ILLEGAL_TEXT: Record<string, string> = {
  'not-your-turn': 'לא תורך…',
  occupied: 'הנקודה תפוסה',
  'out-of-board': 'מחוץ ללוח',
  suicide: 'מהלך התאבדות אסור',
  ko: 'קו! צריך לשחק קודם במקום אחר',
  'game-over': 'המשחק הסתיים',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [self, setSelf] = useState<PlayerPublic | null>(null)
  const [lobby, setLobby] = useState<LobbyState>({ players: [], tables: [] })
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null)
  const [myColor, setMyColor] = useState<Color>('black')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [ratingUpdate, setRatingUpdate] = useState<RatingUpdatePayload | null>(null)
  const [illegal, setIllegal] = useState<string | null>(null)
  const illegalTimer = useRef<number | null>(null)
  const selfRef = useRef<PlayerPublic | null>(null)
  selfRef.current = self

  useEffect(() => {
    socket.on('lobby:state', setLobby)

    socket.on('match:found', payload => {
      setMyColor(payload.color)
      setSnapshot(null)
      setRatingUpdate(null)
      setScreen('game')
      chime()
    })

    socket.on('game:state', snap => {
      setSnapshot(snap)
      const me = selfRef.current
      if (me) {
        if (snap.players.black.id === me.id) setMyColor('black')
        else if (snap.players.white.id === me.id) setMyColor('white')
      }
      setScreen(s => (s === 'game' ? s : 'game'))
    })

    socket.on('game:illegal', ({ reason }) => {
      setIllegal(ILLEGAL_TEXT[reason] ?? reason)
      if (illegalTimer.current) window.clearTimeout(illegalTimer.current)
      illegalTimer.current = window.setTimeout(() => setIllegal(null), 2200)
    })

    socket.on('rating:update', payload => {
      setRatingUpdate(payload)
      setSelf(prev =>
        prev ? { ...prev, rating: payload.rating, rank: payload.rank } : prev,
      )
    })

    return () => {
      socket.off('lobby:state')
      socket.off('match:found')
      socket.off('game:state')
      socket.off('game:illegal')
      socket.off('rating:update')
    }
  }, [])

  const join = (name: string, character: Character) => {
    unlockAudio()
    setLoginError(null)
    socket.connect()
    const token = localStorage.getItem('tanuki-token') ?? undefined
    socket.emit('lobby:join', { name, character, token }, ack => {
      if (!ack.ok || !ack.self) {
        setLoginError(ack.error ?? 'החיבור נכשל')
        return
      }
      localStorage.setItem('tanuki-token', ack.token!)
      setSelf(ack.self)
      if (ack.activeGameId) {
        socket.emit('game:resume', { gameId: ack.activeGameId })
        setScreen('game')
      } else {
        setScreen('salon')
      }
    })
  }

  return (
    <div className="app-shell">
      <h1 className="title">🦝 סלון הגו של טאנוקי</h1>
      {screen === 'login' && (
        <>
          <p className="subtitle">גו מרובה משתתפים בזמן אמת, בהשראת היקארו נו גו</p>
          <Login onJoin={join} error={loginError} />
        </>
      )}
      {screen === 'salon' && self && (
        <Salon lobby={lobby} selfId={self.id} onTsumego={() => setScreen('tsumego')} />
      )}
      {screen === 'game' &&
        (snapshot ? (
          <Game
            snapshot={snapshot}
            myColor={myColor}
            ratingUpdate={ratingUpdate}
            illegal={illegal}
            onBack={() => {
              setSnapshot(null)
              setScreen('salon')
            }}
          />
        ) : (
          <p className="subtitle">מתחברים למשחק…</p>
        ))}
      {screen === 'tsumego' && <Tsumego onBack={() => setScreen('salon')} />}
    </div>
  )
}
