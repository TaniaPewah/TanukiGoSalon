export const INITIAL_RATING = 1500
const K = 32

/**
 * Elo סטנדרטי. score = 1 נצחון, 0.5 תיקו, 0 הפסד (מנקודת מבט של a).
 */
export function updateElo(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 0.5 | 1,
): [number, number] {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400))
  const delta = Math.round(K * (scoreA - expectedA))
  return [ratingA + delta, ratingB - delta]
}

/**
 * מיפוי דירוג לדרגת גו בסגנון EGF: כל 100 נקודות = דרגה.
 * 2100 = 1 דן; מתחת: kyu (1500 = 6 קיו). מוגבל ל-30k עד 9d.
 */
export function ratingToRank(rating: number): string {
  if (rating < 2100) {
    const kyu = Math.min(30, Math.max(1, Math.ceil((2100 - rating) / 100)))
    return `${kyu}k`
  }
  const dan = Math.min(9, Math.floor((rating - 2100) / 100) + 1)
  return `${dan}d`
}
