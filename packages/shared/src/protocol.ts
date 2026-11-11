import {
  Character,
  Color,
  GameResult,
  GameSnapshot,
  IllegalReason,
  LobbyState,
  PlayerPublic,
  Vertex,
} from './types.js'

export interface JoinPayload {
  name: string
  character: Character
  /** session token קודם, לחיבור מחדש */
  token?: string
}

export interface JoinAck {
  ok: boolean
  error?: string
  token?: string
  self?: PlayerPublic
  /** משחק פעיל שאפשר לחזור אליו */
  activeGameId?: string
}

export interface MatchFoundPayload {
  gameId: string
  color: Color
  opponent: PlayerPublic
}

export interface RatingUpdatePayload {
  rating: number
  rank: string
  delta: number
}

/** client -> server */
export interface ClientToServerEvents {
  'lobby:join': (payload: JoinPayload, ack: (res: JoinAck) => void) => void
  'lobby:move': (pos: { x: number; y: number }) => void
  'match:find': () => void
  'match:cancel': () => void
  'game:move': (payload: { gameId: string; vertex: Vertex }) => void
  'game:pass': (payload: { gameId: string }) => void
  'game:resign': (payload: { gameId: string }) => void
  'game:markDead': (payload: { gameId: string; vertex: Vertex }) => void
  'game:acceptScore': (payload: { gameId: string }) => void
  'game:resumePlay': (payload: { gameId: string }) => void
  'game:resume': (payload: { gameId: string }) => void
  'game:leave': (payload: { gameId: string }) => void
}

/** server -> client */
export interface ServerToClientEvents {
  'lobby:state': (state: LobbyState) => void
  'match:found': (payload: MatchFoundPayload) => void
  'game:state': (snapshot: GameSnapshot) => void
  'game:illegal': (payload: { reason: IllegalReason }) => void
  'game:ended': (payload: { result: GameResult }) => void
  'rating:update': (payload: RatingUpdatePayload) => void
}
