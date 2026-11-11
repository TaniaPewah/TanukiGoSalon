import {
  ClientToServerEvents,
  LobbyPlayer,
  LobbyState,
  LobbyTable,
  PlayerPublic,
  ServerToClientEvents,
  ratingToRank,
} from '@tanuki/shared'
import { Server } from 'socket.io'
import { MemoryStore, User } from '../store/MemoryStore.js'

export const ROOM_W = 800
export const ROOM_H = 500

/** מיקומי שולחנות הגו בסלון */
export const TABLES: Array<{ x: number; y: number }> = [
  { x: 200, y: 150 },
  { x: 600, y: 150 },
  { x: 200, y: 330 },
  { x: 600, y: 330 },
]

export type IO = Server<ClientToServerEvents, ServerToClientEvents>

export function publicPlayer(user: User): PlayerPublic {
  return {
    id: user.id,
    name: user.name,
    character: user.character,
    rating: user.rating,
    rank: ratingToRank(user.rating),
  }
}

export class LobbyService {
  /** תור matchmaking (FIFO) של user ids */
  queue: string[] = []
  /** tableIndex -> gameId */
  tableGames = new Map<number, string>()
  private broadcastScheduled = false

  constructor(
    private store: MemoryStore,
    private io: IO,
  ) {}

  lobbyState(): LobbyState {
    const players: LobbyPlayer[] = this.store
      .allUsers()
      .filter(u => u.socketId !== null)
      .map(u => ({
        ...publicPlayer(u),
        x: u.x,
        y: u.y,
        state: u.state,
        tableIndex: u.tableIndex,
        seat: u.seat,
      }))
    const tables: LobbyTable[] = TABLES.map((t, index) => ({
      index,
      x: t.x,
      y: t.y,
      gameId: this.tableGames.get(index) ?? null,
    }))
    return { players, tables }
  }

  /** broadcast מאוחד - לכל היותר פעם ב-80ms */
  broadcast(): void {
    if (this.broadcastScheduled) return
    this.broadcastScheduled = true
    setTimeout(() => {
      this.broadcastScheduled = false
      this.io.emit('lobby:state', this.lobbyState())
    }, 80)
  }

  moveAvatar(user: User, x: number, y: number): void {
    if (user.state === 'playing') return
    user.x = Math.max(20, Math.min(ROOM_W - 20, Math.round(x)))
    user.y = Math.max(80, Math.min(ROOM_H - 20, Math.round(y)))
    this.broadcast()
  }

  enqueue(user: User): void {
    if (user.state !== 'idle') return
    user.state = 'searching'
    this.queue.push(user.id)
    this.broadcast()
  }

  dequeue(user: User): void {
    this.queue = this.queue.filter(id => id !== user.id)
    if (user.state === 'searching') user.state = 'idle'
    this.broadcast()
  }

  /** שני הממתינים הראשונים שעדיין מחוברים */
  takePair(): [User, User] | null {
    const connected: User[] = []
    for (const id of this.queue) {
      const u = this.store.getUserById(id)
      if (u && u.socketId !== null && u.state === 'searching') connected.push(u)
      if (connected.length === 2) break
    }
    if (connected.length < 2) return null
    this.queue = this.queue.filter(
      id => id !== connected[0].id && id !== connected[1].id,
    )
    return [connected[0], connected[1]]
  }

  freeTableIndex(): number {
    for (let i = 0; i < TABLES.length; i++) {
      if (!this.tableGames.has(i)) return i
    }
    return 0 // כשהכול תפוס - מצטופפים בשולחן הראשון
  }

  seatAtTable(user: User, tableIndex: number, seat: 0 | 1, gameId: string): void {
    const t = TABLES[tableIndex]
    user.state = 'playing'
    user.tableIndex = tableIndex
    user.seat = seat
    user.activeGameId = gameId
    user.x = t.x + (seat === 0 ? -55 : 55)
    user.y = t.y
  }

  standUp(user: User): void {
    user.state = 'idle'
    user.tableIndex = null
    user.seat = null
    user.activeGameId = null
    user.y += 70
  }
}
