export type Color = 'black' | 'white'

/** 1 = black, -1 = white, 0 = empty (convention of @sabaki/go-board) */
export type Sign = -1 | 0 | 1
export type SignMap = Sign[][]
export type Vertex = [number, number]

export const BOARD_SIZE = 9
export const KOMI = 7.5

export type Character = 'sloth' | 'shark' | 'jellyfish'

export const CHARACTERS: Character[] = ['sloth', 'shark', 'jellyfish']

export function colorToSign(color: Color): 1 | -1 {
  return color === 'black' ? 1 : -1
}

export function signToColor(sign: 1 | -1): Color {
  return sign === 1 ? 'black' : 'white'
}

export function opponentOf(color: Color): Color {
  return color === 'black' ? 'white' : 'black'
}

export function vertexKey(v: Vertex): string {
  return `${v[0]},${v[1]}`
}

export function keyToVertex(key: string): Vertex {
  const [x, y] = key.split(',').map(Number)
  return [x, y]
}

export interface PlayerPublic {
  id: string
  name: string
  character: Character
  rating: number
  rank: string
}

export type GameStatus = 'playing' | 'scoring' | 'finished'

export type GameEndReason =
  | 'score'
  | 'resign'
  | 'timeout'
  | 'repetition'
  | 'disconnect'

export interface GameResult {
  /** null = תיקו */
  winner: Color | null
  reason: GameEndReason
  scoreBlack?: number
  scoreWhite?: number
}

export interface ClockSnapshot {
  blackMs: number
  whiteMs: number
  incrementMs: number
  running: Color | null
  /** server timestamp (ms) at the moment the snapshot was produced */
  serverNow: number
}

export interface LastMove {
  color: Color
  vertex: Vertex | 'pass'
}

export interface GameSnapshot {
  gameId: string
  boardSize: number
  signMap: SignMap
  turn: Color
  moveNumber: number
  captures: { black: number; white: number }
  clock: ClockSnapshot
  lastMove: LastMove | null
  status: GameStatus
  /** vertex keys of stones currently marked dead (scoring phase) */
  deadMarks: string[]
  scoringAccepted: { black: boolean; white: boolean }
  result: GameResult | null
  players: { black: PlayerPublic; white: PlayerPublic }
  komi: number
}

export interface LobbyPlayer extends PlayerPublic {
  x: number
  y: number
  state: 'idle' | 'searching' | 'playing'
  tableIndex: number | null
  seat: 0 | 1 | null
}

export interface LobbyTable {
  index: number
  x: number
  y: number
  gameId: string | null
}

export interface LobbyState {
  players: LobbyPlayer[]
  tables: LobbyTable[]
}

export type IllegalReason =
  | 'not-your-turn'
  | 'occupied'
  | 'out-of-board'
  | 'suicide'
  | 'ko'
  | 'game-over'
