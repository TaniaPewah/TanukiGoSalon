import GoBoard from '@sabaki/go-board'
import {
  BOARD_SIZE,
  Color,
  GameResult,
  GameStatus,
  IllegalReason,
  KOMI,
  SignMap,
  Vertex,
  colorToSign,
  opponentOf,
  vertexKey,
} from '../types.js'
import { scoreGame } from './scoring.js'

export type MoveInput = Vertex | 'pass'

export type ApplyResult =
  | { ok: true }
  | { ok: false; reason: IllegalReason }

/**
 * מכונת מצבים של משחק גו יחיד. עוטפת את @sabaki/go-board ומוסיפה:
 * תור, פסים, סיום בשני פסים רצופים, תיקו בחזרה משולשת של פוזיציה,
 * שלב ניקוד (סימון אבנים מתות) וספירת שטח סינית.
 */
export class GoGame {
  board: GoBoard
  turn: Color = 'black'
  moveNumber = 0
  status: GameStatus = 'playing'
  result: GameResult | null = null
  lastMove: { color: Color; vertex: MoveInput } | null = null
  consecutivePasses = 0
  deadMarks = new Set<string>()
  scoringAccepted: { black: boolean; white: boolean } = {
    black: false,
    white: false,
  }
  readonly komi: number
  readonly size: number
  /** כמה פעמים הופיעה כל פוזיציה (לוח + מי בתור) */
  private positionCounts = new Map<string, number>()

  constructor(size: number = BOARD_SIZE, komi: number = KOMI) {
    this.size = size
    this.komi = komi
    this.board = GoBoard.fromDimensions(size)
    this.recordPosition()
  }

  private positionKey(): string {
    return this.board.signMap.map(row => row.join('')).join('|') + '#' + this.turn
  }

  private recordPosition(): number {
    const key = this.positionKey()
    const count = (this.positionCounts.get(key) ?? 0) + 1
    this.positionCounts.set(key, count)
    return count
  }

  isOnBoard(v: Vertex): boolean {
    return v[0] >= 0 && v[0] < this.size && v[1] >= 0 && v[1] < this.size
  }

  applyMove(color: Color, move: MoveInput): ApplyResult {
    if (this.status !== 'playing') return { ok: false, reason: 'game-over' }
    if (color !== this.turn) return { ok: false, reason: 'not-your-turn' }

    if (move === 'pass') {
      this.consecutivePasses++
      this.moveNumber++
      this.lastMove = { color, vertex: 'pass' }
      this.turn = opponentOf(color)
      if (this.consecutivePasses >= 2) {
        this.status = 'scoring'
      } else {
        this.recordPosition()
      }
      return { ok: true }
    }

    if (!this.isOnBoard(move)) return { ok: false, reason: 'out-of-board' }
    if (this.board.get(move) !== 0) return { ok: false, reason: 'occupied' }

    const sign = colorToSign(color)
    const analysis = this.board.analyzeMove(sign, move)
    if (analysis.suicide) return { ok: false, reason: 'suicide' }
    if (analysis.ko) return { ok: false, reason: 'ko' }

    this.board = this.board.makeMove(sign, move, {
      preventOverwrite: true,
      preventSuicide: true,
      preventKo: true,
    })

    this.consecutivePasses = 0
    this.moveNumber++
    this.lastMove = { color, vertex: move }
    this.turn = opponentOf(color)

    // תיקו לפי חזרה משולשת (positional superko -> draw)
    const occurrences = this.recordPosition()
    if (occurrences >= 3) {
      this.status = 'finished'
      this.result = { winner: null, reason: 'repetition' }
    }

    return { ok: true }
  }

  /** שלב הניקוד: הפיכת סימון מוות לכל השרשרת שבנקודה */
  toggleDead(vertex: Vertex): boolean {
    if (this.status !== 'scoring') return false
    if (!this.isOnBoard(vertex) || this.board.get(vertex) === 0) return false
    const chain = this.board.getChain(vertex)
    const key = vertexKey(vertex)
    const marking = !this.deadMarks.has(key)
    for (const v of chain) {
      if (marking) this.deadMarks.add(vertexKey(v))
      else this.deadMarks.delete(vertexKey(v))
    }
    // כל שינוי בסימון מאפס הסכמות קודמות
    this.scoringAccepted = { black: false, white: false }
    return true
  }

  acceptScore(color: Color): boolean {
    if (this.status !== 'scoring') return false
    this.scoringAccepted[color] = true
    if (this.scoringAccepted.black && this.scoringAccepted.white) {
      this.finishByScore()
    }
    return true
  }

  /** חזרה מניקוד למשחק (אם שחקן לא מסכים על אבנים מתות) */
  resumePlay(): boolean {
    if (this.status !== 'scoring') return false
    this.status = 'playing'
    this.consecutivePasses = 0
    this.deadMarks.clear()
    this.scoringAccepted = { black: false, white: false }
    return true
  }

  private finishByScore(): void {
    const score = scoreGame(this.board.signMap as SignMap, this.deadMarks, this.komi)
    this.status = 'finished'
    this.result = {
      winner:
        score.black > score.white
          ? 'black'
          : score.white > score.black
            ? 'white'
            : null,
      reason: 'score',
      scoreBlack: score.black,
      scoreWhite: score.white,
    }
  }

  resign(color: Color): void {
    if (this.status === 'finished') return
    this.status = 'finished'
    this.result = { winner: opponentOf(color), reason: 'resign' }
  }

  timeout(color: Color): void {
    if (this.status === 'finished') return
    this.status = 'finished'
    this.result = { winner: opponentOf(color), reason: 'timeout' }
  }

  forfeit(color: Color): void {
    if (this.status === 'finished') return
    this.status = 'finished'
    this.result = { winner: opponentOf(color), reason: 'disconnect' }
  }

  get signMap(): SignMap {
    return this.board.signMap as SignMap
  }

  get captures(): { black: number; white: number } {
    return {
      black: this.board.getCaptures(1),
      white: this.board.getCaptures(-1),
    }
  }
}
