import { ClientToServerEvents, ServerToClientEvents } from '@tanuki/shared'
import { Socket, io } from 'socket.io-client'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/** ב-dev ה-proxy של vite מעביר את /socket.io לשרת (פורט 3001) */
export const socket: AppSocket = io({ autoConnect: false })
