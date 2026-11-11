import {
  CHARACTERS,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@tanuki/shared'
import express from 'express'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server, Socket } from 'socket.io'
import { GameService } from './game/GameService.js'
import { LobbyService } from './lobby/LobbyService.js'
import { MemoryStore, User } from './store/MemoryStore.js'

interface SocketData {
  userId?: string
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>

export function createApp() {
  const app = express()
  const httpServer = createServer(app)
  const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(
    httpServer,
    { cors: { origin: true } },
  )

  const store = new MemoryStore()
  const lobby = new LobbyService(store, io)
  const games = new GameService(io, lobby)

  const dirname = path.dirname(fileURLToPath(import.meta.url))
  const clientDist = path.resolve(dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('/health', (_req, res) => res.json({ ok: true }))

  function currentUser(socket: AppSocket): User | undefined {
    return socket.data.userId ? store.getUserById(socket.data.userId) : undefined
  }

  io.on('connection', (socket: AppSocket) => {
    socket.on('lobby:join', (payload, ack) => {
      try {
        let user: User | undefined
        if (payload?.token) {
          user = store.getUserByToken(payload.token)
        }
        if (!user) {
          const name = String(payload?.name ?? '').trim().slice(0, 20)
          const character = CHARACTERS.includes(payload?.character)
            ? payload.character
            : 'sloth'
          if (!name) {
            ack({ ok: false, error: 'צריך שם כדי להיכנס לסלון' })
            return
          }
          user = store.createUser(name, character)
        }
        user.socketId = socket.id
        socket.data.userId = user.id
        ack({
          ok: true,
          token: user.token,
          self: {
            id: user.id,
            name: user.name,
            character: user.character,
            rating: user.rating,
            rank: '',
          },
          activeGameId: user.activeGameId ?? undefined,
        })
        if (user.activeGameId) games.handleResume(user, user.activeGameId)
        lobby.broadcast()
      } catch {
        ack({ ok: false, error: 'שגיאת שרת' })
      }
    })

    socket.on('lobby:move', pos => {
      const user = currentUser(socket)
      if (user && typeof pos?.x === 'number' && typeof pos?.y === 'number') {
        lobby.moveAvatar(user, pos.x, pos.y)
      }
    })

    socket.on('match:find', () => {
      const user = currentUser(socket)
      if (!user) return
      lobby.enqueue(user)
      const pair = lobby.takePair()
      if (pair) games.create(pair[0], pair[1])
    })

    socket.on('match:cancel', () => {
      const user = currentUser(socket)
      if (user) lobby.dequeue(user)
    })

    socket.on('game:move', payload => {
      const user = currentUser(socket)
      if (!user || !payload || !Array.isArray(payload.vertex)) return
      games.handleMove(user, payload.gameId, [
        Number(payload.vertex[0]),
        Number(payload.vertex[1]),
      ])
    })

    socket.on('game:pass', payload => {
      const user = currentUser(socket)
      if (user && payload) games.handleMove(user, payload.gameId, 'pass')
    })

    socket.on('game:resign', payload => {
      const user = currentUser(socket)
      if (user && payload) games.handleResign(user, payload.gameId)
    })

    socket.on('game:markDead', payload => {
      const user = currentUser(socket)
      if (!user || !payload || !Array.isArray(payload.vertex)) return
      games.handleMarkDead(user, payload.gameId, [
        Number(payload.vertex[0]),
        Number(payload.vertex[1]),
      ])
    })

    socket.on('game:acceptScore', payload => {
      const user = currentUser(socket)
      if (user && payload) games.handleAcceptScore(user, payload.gameId)
    })

    socket.on('game:resumePlay', payload => {
      const user = currentUser(socket)
      if (user && payload) games.handleResumePlay(user, payload.gameId)
    })

    socket.on('game:resume', payload => {
      const user = currentUser(socket)
      if (user && payload) games.handleResume(user, payload.gameId)
    })

    socket.on('disconnect', () => {
      const user = currentUser(socket)
      if (!user) return
      if (user.socketId === socket.id) user.socketId = null
      lobby.dequeue(user)
      games.handleDisconnect(user)
      lobby.broadcast()
    })
  })

  return { app, httpServer, io, store, lobby, games }
}
