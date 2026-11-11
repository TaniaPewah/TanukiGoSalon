import { describe, expect, it } from 'vitest'
import { GoGame } from './GoGame.js'
import { scoreGame } from './scoring.js'
import { SignMap, vertexKey } from '../types.js'
import {
  applyMoveToClock,
  createClock,
  remainingMs,
  startClock,
} from '../clock.js'
import { ratingToRank, updateElo } from '../rating.js'

describe('GoGame - חוקים בסיסיים', () => {
  it('תור מתחלף, ואי אפשר לשחק לא בתור', () => {
    const g = new GoGame()
    expect(g.turn).toBe('black')
    expect(g.applyMove('white', [0, 0])).toEqual({ ok: false, reason: 'not-your-turn' })
    expect(g.applyMove('black', [0, 0]).ok).toBe(true)
    expect(g.turn).toBe('white')
  })

  it('אי אפשר לשחק על נקודה תפוסה או מחוץ ללוח', () => {
    const g = new GoGame()
    g.applyMove('black', [4, 4])
    expect(g.applyMove('white', [4, 4])).toEqual({ ok: false, reason: 'occupied' })
    expect(g.applyMove('white', [9, 0])).toEqual({ ok: false, reason: 'out-of-board' })
  })

  it('תפיסת אבן בודדת (ponnuki)', () => {
    const g = new GoGame()
    // לבן ב-[4,4] מוקף ע"י שחור
    g.applyMove('black', [3, 4])
    g.applyMove('white', [4, 4])
    g.applyMove('black', [5, 4])
    g.applyMove('white', [0, 0])
    g.applyMove('black', [4, 3])
    g.applyMove('white', [0, 1])
    g.applyMove('black', [4, 5])
    expect(g.board.get([4, 4])).toBe(0)
    expect(g.captures.black).toBe(1)
  })

  it('תפיסה מרובת אבנים', () => {
    const g = new GoGame()
    // שתי אבנים לבנות [4,4],[5,4] נתפסות
    g.applyMove('black', [3, 4])
    g.applyMove('white', [4, 4])
    g.applyMove('black', [4, 3])
    g.applyMove('white', [5, 4])
    g.applyMove('black', [5, 3])
    g.applyMove('white', [0, 0])
    g.applyMove('black', [6, 4])
    g.applyMove('white', [0, 1])
    g.applyMove('black', [4, 5])
    g.applyMove('white', [0, 2])
    g.applyMove('black', [5, 5])
    expect(g.board.get([4, 4])).toBe(0)
    expect(g.board.get([5, 4])).toBe(0)
    expect(g.captures.black).toBe(2)
  })

  it('איסור התאבדות', () => {
    const g = new GoGame()
    // שחור מקיף את [0,0]; לבן מנסה לשחק בפנים
    g.applyMove('black', [1, 0])
    g.applyMove('white', [5, 5])
    g.applyMove('black', [0, 1])
    expect(g.applyMove('white', [0, 0])).toEqual({ ok: false, reason: 'suicide' })
  })

  it('חוק הקו: אסור לתפוס מיד בחזרה', () => {
    const g = new GoGame()
    // תבנית קו קלאסית סביב [2,2]/[3,2]
    g.applyMove('black', [1, 2]) // B
    g.applyMove('white', [4, 2]) // W
    g.applyMove('black', [2, 1])
    g.applyMove('white', [3, 1])
    g.applyMove('black', [2, 3])
    g.applyMove('white', [3, 3])
    g.applyMove('black', [3, 2]) // שחור נכנס
    const take = g.applyMove('white', [2, 2]) // לבן תופס את [3,2]
    expect(take.ok).toBe(true)
    expect(g.board.get([3, 2])).toBe(0)
    // שחור לא יכול לתפוס מיד בחזרה
    expect(g.applyMove('black', [3, 2])).toEqual({ ok: false, reason: 'ko' })
    // אחרי מהלך ביניים (ko threat) מותר
    g.applyMove('black', [8, 8])
    g.applyMove('white', [8, 0])
    expect(g.applyMove('black', [3, 2]).ok).toBe(true)
  })

  it('שני פסים רצופים מעבירים לשלב ניקוד', () => {
    const g = new GoGame()
    g.applyMove('black', [4, 4])
    g.applyMove('white', 'pass')
    expect(g.status).toBe('playing')
    g.applyMove('black', 'pass')
    expect(g.status).toBe('scoring')
    expect(g.applyMove('white', [0, 0])).toEqual({ ok: false, reason: 'game-over' })
  })

  it('חזרה משולשת של פוזיציה (triple ko) -> תיקו', () => {
    const g = new GoGame()
    // שלושה קואים בשורות y=1,4,7, כל אחד סביב הנקודות (2,y)/(3,y).
    // חומה שחורה משמאל, חומה לבנה מימין.
    const setup: Array<['black' | 'white', [number, number]]> = [
      // חומות
      ['black', [1, 1]], ['white', [4, 1]],
      ['black', [2, 0]], ['white', [3, 0]],
      ['black', [2, 2]], ['white', [3, 2]],
      ['black', [1, 4]], ['white', [4, 4]],
      ['black', [2, 3]], ['white', [3, 3]],
      ['black', [2, 5]], ['white', [3, 5]],
      ['black', [1, 7]], ['white', [4, 7]],
      ['black', [2, 6]], ['white', [3, 6]],
      ['black', [2, 8]], ['white', [3, 8]],
      // קו עליון: שחור נכנס, לבן תופס -> לבן מחזיק
      ['black', [3, 1]], ['white', [2, 1]],
      // קו תחתון: שחור נכנס, לבן תופס -> לבן מחזיק
      ['black', [3, 7]], ['white', [2, 7]],
      // קו אמצעי: שחור נכנס ומחזיק; לבן משחק בצד
      ['black', [3, 4]], ['white', [8, 8]],
    ]
    for (const [c, v] of setup) {
      expect(g.applyMove(c, v)).toEqual({ ok: true })
    }
    // מחזור באורך 6: כל צד תופס קו שלא נתפס במהלך הקודם.
    const cycle: Array<['black' | 'white', [number, number]]> = [
      ['black', [3, 1]], // שחור תופס בקו העליון
      ['white', [2, 4]], // לבן תופס בקו האמצעי
      ['black', [3, 7]], // שחור תופס בקו התחתון
      ['white', [2, 1]], // לבן תופס בקו העליון
      ['black', [3, 4]], // שחור תופס בקו האמצעי
      ['white', [2, 7]], // לבן תופס בקו התחתון
    ]
    let finished = false
    let moves = 0
    outer: for (let i = 0; i < 4; i++) {
      for (const [c, v] of cycle) {
        const r = g.applyMove(c, v)
        expect(r).toEqual({ ok: true })
        moves++
        if (g.status === 'finished') {
          finished = true
          break outer
        }
      }
    }
    expect(finished).toBe(true)
    // הפוזיציה ההתחלתית של המחזור מופיעה פעם שלישית אחרי 12 מהלכי מחזור
    expect(moves).toBe(12)
    expect(g.result).toEqual({ winner: null, reason: 'repetition' })
  })

  it('כניעה', () => {
    const g = new GoGame()
    g.resign('black')
    expect(g.status).toBe('finished')
    expect(g.result?.winner).toBe('white')
    expect(g.result?.reason).toBe('resign')
  })
})

describe('ניקוד - ספירת שטח', () => {
  it('לוח מחולק פשוט', () => {
    // 9x9: שחור שולט בעמודות 0-3, לבן ב-5-8, עמודה 4 חומה שחורה? נבנה חומות:
    // שחור בעמודה 3, לבן בעמודה 5, עמודה 4 ריקה = dame (גובלת בשניהם)
    const empty: SignMap = Array.from({ length: 9 }, () => Array(9).fill(0))
    for (let y = 0; y < 9; y++) {
      empty[y][3] = 1
      empty[y][5] = -1
    }
    const s = scoreGame(empty, new Set(), 7.5)
    // שחור: 9 אבנים + 27 שטח (עמודות 0-2); לבן: 9 אבנים + 27 שטח + 7.5
    expect(s.black).toBe(36)
    expect(s.white).toBe(43.5)
    expect(s.blackTerritory).toBe(27)
    expect(s.whiteTerritory).toBe(27)
  })

  it('אבנים מתות מוסרות והשטח נספר ליריב', () => {
    const map: SignMap = Array.from({ length: 9 }, () => Array(9).fill(0))
    for (let y = 0; y < 9; y++) map[y][4] = 1 // חומה שחורה באמצע
    map[0][7] = -1 // אבן לבנה בודדת בשטח שחור (מתה)
    const dead = new Set([vertexKey([7, 0])])
    const s = scoreGame(map, dead, 7.5)
    // כל הלוח חוץ מהחומה שייך לשחור: 9 אבנים + 72 שטח = 81
    expect(s.black).toBe(81)
    expect(s.white).toBe(7.5)
  })
})

describe('שעון Fischer', () => {
  it('מוריד זמן שחלף ומוסיף increment', () => {
    let c = createClock(60_000, 5_000)
    c = startClock(c, 'black', 1000)
    const after = applyMoveToClock(c, 'black', 11_000) // עברו 10 שניות
    expect(after).not.toBe('flag')
    if (after !== 'flag') {
      expect(after.blackMs).toBe(55_000) // 60 - 10 + 5
      expect(after.running).toBe('white')
      expect(remainingMs(after, 'white', 20_000)).toBe(51_000)
    }
  })

  it('פקיעת זמן', () => {
    let c = createClock(10_000, 0)
    c = startClock(c, 'black', 0)
    expect(applyMoveToClock(c, 'black', 10_001)).toBe('flag')
  })
})

describe('דירוג', () => {
  it('Elo סימטרי', () => {
    const [a, b] = updateElo(1500, 1500, 1)
    expect(a).toBe(1516)
    expect(b).toBe(1484)
  })
  it('מיפוי דרגות', () => {
    expect(ratingToRank(1500)).toBe('6k')
    expect(ratingToRank(2050)).toBe('1k')
    expect(ratingToRank(2100)).toBe('1d')
    expect(ratingToRank(2399)).toBe('3d')
    expect(ratingToRank(300)).toBe('18k')
  })
})
