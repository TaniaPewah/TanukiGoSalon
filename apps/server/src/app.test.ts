import {
  ClientToServerEvents,
  GameSnapshot,
  JoinAck,
  MatchFoundPayload,
  ServerToClientEvents,
} from '@tanuki/shared'
import { AddressInfo } from 'node:net'
import { Socket as ClientSocket, io as ioc } from 'socket.io-client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.js'

type TClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>

let httpServer: ReturnType<typeof createApp>['httpServer']
let url: string
let a: TClient
let b: TClient

function once<T>(socket: TClient, event: string): Promise<T> {
  return new Promise(resolve => socket.once(event as never, resolve as never))
}

beforeAll(async () => {
  const appCtx = createApp()
  httpServer = appCtx.httpServer
  await new Promise<void>(r => httpServer.listen(0, r))
  const port = (httpServer.address() as AddressInfo).port
  url = `http://localhost:${port}`
  a = ioc(url, { transports: ['websocket'] })
  b = ioc(url, { transports: ['websocket'] })
})

afterAll(() => {
  a.close()
  b.close()
  httpServer.close()
})

describe('אינטגרציה: לובי, matchmaking ומשחק מלא', () => {
  let gameId: string
  let blackClient: TClient
  let whiteClient: TClient

  it('שני שחקנים נכנסים ללובי', async () => {
    const ackA = await new Promise<JoinAck>(r =>
      a.emit('lobby:join', { name: 'עצלני', character: 'sloth' }, r),
    )
    const ackB = await new Promise<JoinAck>(r =>
      b.emit('lobby:join', { name: 'כרישה', character: 'shark' }, r),
    )
    expect(ackA.ok).toBe(true)
    expect(ackB.ok).toBe(true)
    expect(ackA.token).toBeTruthy()
  })

  it('matchmaking מחבר שני ממתינים', async () => {
    const pA = once<MatchFoundPayload>(a, 'match:found')
    const pB = once<MatchFoundPayload>(b, 'match:found')
    a.emit('match:find')
    b.emit('match:find')
    const [mA, mB] = await Promise.all([pA, pB])
    expect(mA.gameId).toBe(mB.gameId)
    expect(new Set([mA.color, mB.color])).toEqual(new Set(['black', 'white']))
    gameId = mA.gameId
    blackClient = mA.color === 'black' ? a : b
    whiteClient = mA.color === 'black' ? b : a
  })

  it('מהלך חוקי משודר לשני הצדדים, מהלך לא חוקי נדחה', async () => {
    const sA = once<GameSnapshot>(blackClient, 'game:state')
    const sB = once<GameSnapshot>(whiteClient, 'game:state')
    blackClient.emit('game:move', { gameId, vertex: [4, 4] })
    const [snapA, snapB] = await Promise.all([sA, sB])
    expect(snapA.signMap[4][4]).toBe(1)
    expect(snapB.signMap[4][4]).toBe(1)
    expect(snapA.turn).toBe('white')

    const illegal = once<{ reason: string }>(whiteClient, 'game:illegal')
    whiteClient.emit('game:move', { gameId, vertex: [4, 4] })
    expect((await illegal).reason).toBe('occupied')

    // לא בתור
    const notTurn = once<{ reason: string }>(blackClient, 'game:illegal')
    blackClient.emit('game:move', { gameId, vertex: [2, 2] })
    expect((await notTurn).reason).toBe('not-your-turn')
  })

  it('pass-pass עובר לניקוד, הסכמה כפולה מסיימת עם תוצאה ודירוג', async () => {
    let snap = once<GameSnapshot>(blackClient, 'game:state')
    whiteClient.emit('game:pass', { gameId })
    expect((await snap).status).toBe('playing')

    snap = once<GameSnapshot>(blackClient, 'game:state')
    blackClient.emit('game:pass', { gameId })
    const scoring = await snap
    expect(scoring.status).toBe('scoring')

    const endedA = once<{ result: GameSnapshot['result'] }>(blackClient, 'game:ended')
    const ratingA = once<{ rating: number; delta: number }>(blackClient, 'rating:update')
    blackClient.emit('game:acceptScore', { gameId })
    whiteClient.emit('game:acceptScore', { gameId })
    const ended = await endedA
    // שחור שולט בכל הלוח: 81 מול קומי 7.5
    expect(ended.result?.reason).toBe('score')
    expect(ended.result?.winner).toBe('black')
    expect(ended.result?.scoreBlack).toBe(81)
    expect(ended.result?.scoreWhite).toBe(7.5)
    const r = await ratingA
    expect(r.delta).toBeGreaterThan(0)
  })
})
