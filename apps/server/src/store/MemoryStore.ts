import { Character, Color } from '@tanuki/shared'
import { randomUUID } from 'node:crypto'

export interface User {
  id: string
  token: string
  name: string
  character: Character
  rating: number
  socketId: string | null
  /** lobby presence */
  x: number
  y: number
  state: 'idle' | 'searching' | 'playing'
  tableIndex: number | null
  seat: 0 | 1 | null
  activeGameId: string | null
}

/**
 * ממשק אחסון - כרגע מימוש in-memory בלבד; נקודת החלפה עתידית ל-DB.
 */
export interface Store {
  createUser(name: string, character: Character): User
  getUserByToken(token: string): User | undefined
  getUserById(id: string): User | undefined
  allUsers(): User[]
}

export class MemoryStore implements Store {
  private usersById = new Map<string, User>()
  private usersByToken = new Map<string, User>()

  createUser(name: string, character: Character): User {
    const user: User = {
      id: randomUUID(),
      token: randomUUID(),
      name,
      character,
      rating: 1500,
      socketId: null,
      x: 400 + Math.round((Math.random() - 0.5) * 120),
      y: 430,
      state: 'idle',
      tableIndex: null,
      seat: null,
      activeGameId: null,
    }
    this.usersById.set(user.id, user)
    this.usersByToken.set(user.token, user)
    return user
  }

  getUserByToken(token: string): User | undefined {
    return this.usersByToken.get(token)
  }

  getUserById(id: string): User | undefined {
    return this.usersById.get(id)
  }

  allUsers(): User[] {
    return [...this.usersById.values()]
  }
}

export function colorOf(user: User, players: { black: User; white: User }): Color | null {
  if (players.black.id === user.id) return 'black'
  if (players.white.id === user.id) return 'white'
  return null
}
