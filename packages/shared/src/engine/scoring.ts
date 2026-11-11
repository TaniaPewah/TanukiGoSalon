import { SignMap, vertexKey } from '../types.js'

export interface ScoreResult {
  black: number
  white: number
  blackTerritory: number
  whiteTerritory: number
  blackStones: number
  whiteStones: number
  komi: number
}

/**
 * ספירת שטח (כללים סיניים): ניקוד צד = אבנים חיות על הלוח + שטח מוקף.
 * אבנים שסומנו מתות מוסרות מהלוח לפני הספירה (והשטח שתחתן נספר ליריב).
 * אזור ריק שגובל בשני הצבעים (dame) לא נספר לאף אחד.
 */
export function scoreGame(
  signMap: SignMap,
  deadMarks: Set<string>,
  komi: number,
): ScoreResult {
  const h = signMap.length
  const w = signMap[0]?.length ?? 0

  // לוח אחרי הסרת מתים
  const live: number[][] = signMap.map((row, y) =>
    row.map((s, x) => (deadMarks.has(vertexKey([x, y])) ? 0 : s)),
  )

  let blackStones = 0
  let whiteStones = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (live[y][x] === 1) blackStones++
      else if (live[y][x] === -1) whiteStones++
    }
  }

  // flood-fill של אזורים ריקים
  const seen: boolean[][] = live.map(row => row.map(() => false))
  let blackTerritory = 0
  let whiteTerritory = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (live[y][x] !== 0 || seen[y][x]) continue
      const region: Array<[number, number]> = []
      const stack: Array<[number, number]> = [[x, y]]
      seen[y][x] = true
      let bordersBlack = false
      let bordersWhite = false
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!
        region.push([cx, cy])
        for (const [nx, ny] of [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ] as Array<[number, number]>) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const s = live[ny][nx]
          if (s === 0) {
            if (!seen[ny][nx]) {
              seen[ny][nx] = true
              stack.push([nx, ny])
            }
          } else if (s === 1) bordersBlack = true
          else bordersWhite = true
        }
      }
      if (bordersBlack && !bordersWhite) blackTerritory += region.length
      else if (bordersWhite && !bordersBlack) whiteTerritory += region.length
    }
  }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory + komi,
    blackTerritory,
    whiteTerritory,
    blackStones,
    whiteStones,
    komi,
  }
}
