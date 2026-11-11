import {
  ClockState,
  Color,
  GameSnapshot,
  GameStatus,
  GoGame,
  Vertex,
  applyMoveToClock,
  clockSnapshot,
  createClock,
  opponentOf,
  ratingToRank,
  remainingMs,
  startClock,
  stopClock,
  updateElo,
} from '@tanuki/shared'
import { randomUUID } from 'node:crypto'
import { IO, LobbyService, publicPlayer } from '../lobby/LobbyService.js'
import { User, colorOf } from '../store/MemoryStore.js'

const DISCONNECT_GRACE_MS = 60_000

export interface ActiveGame {
  id: string
  game: GoGame
  clock: ClockState
  players: { black: User; white: User }
  tableIndex: number
  flagTimer: NodeJS.Timeout | null
  disconnectTimers: Map<Color, NodeJS.Timeout>
}

export class GameService {
  games = new Map<string, ActiveGame>()

  constructor(
    private io: IO,
    private lobby: LobbyService,
  ) {}

  roomOf(gameId: string): string {
    return `game:${gameId}`
  }

  create(a: User, b: User): ActiveGame {
    const id = randomUUID()
    // צבעים אקראיים
    const [black, white] = Math.random() < 0.5 ? [a, b] : [b, a]
    const now = Date.now()
    const g: ActiveGame = {
      id,
      game: new GoGame(),
      clock: startClock(createClock(), 'black', now),
      players: { black, white },
      tableIndex: this.lobby.freeTableIndex(),
      flagTimer: null,
      disconnectTimers: new Map(),
    }
    this.games.set(id, g)
    this.lobby.tableGames.set(g.tableIndex, id)
    this.lobby.seatAtTable(black, g.tableIndex, 0, id)
    this.lobby.seatAtTable(white, g.tableIndex, 1, id)

    for (const [user, color] of [
      [black, 'black'],
      [white, 'white'],
    ] as Array<[User, Color]>) {
      if (user.socketId) {
        this.io.sockets.sockets.get(user.socketId)?.join(this.roomOf(id))
        this.io.to(user.socketId).emit('match:found', {
          gameId: id,
          color,
          opponent: publicPlayer(color === 'black' ? white : black),
        })
      }
    }
    this.scheduleFlag(g)
    this.broadcastState(g)
    this.lobby.broadcast()
    return g
  }

  snapshot(g: ActiveGame): GameSnapshot {
    const now = Date.now()
    return {
      gameId: g.id,
      boardSize: g.game.size,
      signMap: g.game.signMap,
      turn: g.game.turn,
      moveNumber: g.game.moveNumber,
      captures: g.game.captures,
      clock: clockSnapshot(g.clock, now),
      lastMove: g.game.lastMove,
      status: g.game.status,
      deadMarks: [...g.game.deadMarks],
      scoringAccepted: g.game.scoringAccepted,
      result: g.game.result,
      players: {
        black: publicPlayer(g.players.black),
        white: publicPlayer(g.players.white),
      },
      komi: g.game.komi,
    }
  }

  broadcastState(g: ActiveGame): void {
    this.io.to(this.roomOf(g.id)).emit('game:state', this.snapshot(g))
  }

  private scheduleFlag(g: ActiveGame): void {
    if (g.flagTimer) clearTimeout(g.flagTimer)
    g.flagTimer = null
    if (g.game.status !== 'playing' || g.clock.running === null) return
    const color = g.clock.running
    const ms = remainingMs(g.clock, color, Date.now())
    g.flagTimer = setTimeout(() => {
      // פקיעת זמן - מאומת שוב מול השעון
      if (g.game.status !== 'playing') return
      if (remainingMs(g.clock, color, Date.now()) > 0) {
        this.scheduleFlag(g)
        return
      }
      if (color === 'black') g.clock = { ...g.clock, blackMs: 0, running: null }
      else g.clock = { ...g.clock, whiteMs: 0, running: null }
      g.game.timeout(color)
      this.finishGame(g)
    }, Math.max(0, ms) + 5)
  }

  playerColor(g: ActiveGame, user: User): Color | null {
    return colorOf(user, g.players)
  }

  handleMove(user: User, gameId: string, move: Vertex | 'pass'): void {
    const g = this.games.get(gameId)
    if (!g) return
    const color = this.playerColor(g, user)
    if (!color) return
    const sock = user.socketId
    if (g.game.status !== 'playing') {
      if (sock) this.io.to(sock).emit('game:illegal', { reason: 'game-over' })
      return
    }
    if (g.game.turn !== color) {
      if (sock) this.io.to(sock).emit('game:illegal', { reason: 'not-your-turn' })
      return
    }

    // קודם שעון: אם הזמן אזל, המהלך נדחה והמשחק מסתיים בפקיעה
    const now = Date.now()
    const clockAfter = applyMoveToClock(g.clock, color, now)
    if (clockAfter === 'flag') {
      g.clock = stopClock(g.clock, now)
      g.game.timeout(color)
      this.finishGame(g)
      return
    }

    const res = g.game.applyMove(color, move)
    if (!res.ok) {
      if (sock) this.io.to(sock).emit('game:illegal', { reason: res.reason })
      return
    }

    g.clock = clockAfter
    // applyMove עשוי לשנות את הסטטוס (scoring / finished בחזרה משולשת)
    const statusAfter = g.game.status as GameStatus
    if (statusAfter !== 'playing') {
      g.clock = stopClock(g.clock, now)
    }
    this.scheduleFlag(g)

    if (statusAfter === 'finished') {
      this.finishGame(g)
    } else {
      this.broadcastState(g)
    }
  }

  handleResign(user: User, gameId: string): void {
    const g = this.games.get(gameId)
    if (!g) return
    const color = this.playerColor(g, user)
    if (!color || g.game.status === 'finished') return
    g.clock = stopClock(g.clock, Date.now())
    g.game.resign(color)
    this.finishGame(g)
  }

  handleMarkDead(user: User, gameId: string, vertex: Vertex): void {
    const g = this.games.get(gameId)
    if (!g) return
    if (!this.playerColor(g, user)) return
    if (g.game.toggleDead(vertex)) this.broadcastState(g)
  }

  handleAcceptScore(user: User, gameId: string): void {
    const g = this.games.get(gameId)
    if (!g) return
    const color = this.playerColor(g, user)
    if (!color) return
    if (!g.game.acceptScore(color)) return
    if (g.game.status === 'finished') this.finishGame(g)
    else this.broadcastState(g)
  }

  handleResumePlay(user: User, gameId: string): void {
    const g = this.games.get(gameId)
    if (!g) return
    if (!this.playerColor(g, user)) return
    if (!g.game.resumePlay()) return
    g.clock = startClock(g.clock, g.game.turn, Date.now())
    this.scheduleFlag(g)
    this.broadcastState(g)
  }

  /** שחקן התחבר מחדש - מצרפים אותו חזרה לחדר ושולחים snapshot */
  handleResume(user: User, gameId: string): void {
    const g = this.games.get(gameId)
    if (!g) return
    const color = this.playerColor(g, user)
    if (!color || !user.socketId) return
    const timer = g.disconnectTimers.get(color)
    if (timer) {
      clearTimeout(timer)
      g.disconnectTimers.delete(color)
    }
    const socket = this.io.sockets.sockets.get(user.socketId)
    socket?.join(this.roomOf(g.id))
    if (user.socketId) {
      this.io.to(user.socketId).emit('game:state', this.snapshot(g))
    }
  }

  handleDisconnect(user: User): void {
    if (!user.activeGameId) return
    const g = this.games.get(user.activeGameId)
    if (!g || g.game.status === 'finished') return
    const color = this.playerColor(g, user)
    if (!color) return
    const timer = setTimeout(() => {
      if (g.game.status === 'finished') return
      g.clock = stopClock(g.clock, Date.now())
      g.game.forfeit(color)
      this.finishGame(g)
    }, DISCONNECT_GRACE_MS)
    g.disconnectTimers.set(color, timer)
  }

  private finishGame(g: ActiveGame): void {
    if (g.flagTimer) clearTimeout(g.flagTimer)
    g.flagTimer = null
    for (const t of g.disconnectTimers.values()) clearTimeout(t)
    g.disconnectTimers.clear()

    const result = g.game.result
    if (result) {
      // עדכון דירוג
      const { black, white } = g.players
      const scoreBlack: 0 | 0.5 | 1 =
        result.winner === 'black' ? 1 : result.winner === 'white' ? 0 : 0.5
      const oldBlack = black.rating
      const oldWhite = white.rating
      const [nb, nw] = updateElo(black.rating, white.rating, scoreBlack)
      black.rating = nb
      white.rating = nw
      for (const [u, old] of [
        [black, oldBlack],
        [white, oldWhite],
      ] as Array<[User, number]>) {
        if (u.socketId) {
          this.io.to(u.socketId).emit('rating:update', {
            rating: u.rating,
            rank: ratingToRank(u.rating),
            delta: u.rating - old,
          })
        }
      }
    }

    this.broadcastState(g)
    this.io.to(this.roomOf(g.id)).emit('game:ended', { result: result! })

    // שחרור השולחן והחזרת השחקנים ללובי
    this.lobby.tableGames.delete(g.tableIndex)
    this.lobby.standUp(g.players.black)
    this.lobby.standUp(g.players.white)
    this.lobby.broadcast()

    // שומרים את המשחק עוד דקה לצפייה ב-snapshot ואז מוחקים
    setTimeout(() => this.games.delete(g.id), 60_000)
  }
}
