/**
 * בעיות חיים-ומוות קלאסיות (שחור משחק תמיד).
 * SGF עם עץ וריאציות; צומת של פתרון נכון מסומן C[RIGHT].
 * קואורדינטות: a=0 ... i=8, [x y], y גדל כלפי מטה.
 */
export interface Problem {
  id: string
  title: string
  hint: string
  sgf: string
}

export const PROBLEMS: Problem[] = [
  {
    id: 'atari-1',
    title: '1. אטארי פשוט',
    hint: 'לאבן הלבנה נשארה חירות אחת בלבד…',
    sgf: '(;SZ[9]AW[ed]AB[dd][fd][ec];B[ee]C[RIGHT])',
  },
  {
    id: 'capture-2',
    title: '2. תפיסת שתי אבנים',
    hint: 'מצאו את החירות האחרונה של הזוג הלבן.',
    sgf: '(;SZ[9]AW[ed][fd]AB[dd][ec][fc][gd][ee];B[fe]C[RIGHT])',
  },
  {
    id: 'edge-capture',
    title: '3. תפיסה על הקצה',
    hint: 'גם בקצה הלוח - חירות אחת ודי.',
    sgf: '(;SZ[9]AW[ea]AB[da][fa];B[eb]C[RIGHT])',
  },
  {
    id: 'vertical-capture',
    title: '4. עמוד בצרות',
    hint: 'שתי האבנים הלבנות נושמות רק כלפי מטה.',
    sgf: '(;SZ[9]AW[ed][ee]AB[dd][de][fd][fe][ec];B[ef]C[RIGHT])',
  },
  {
    id: 'double-atari',
    title: '5. אטארי כפול',
    hint: 'מהלך אחד שמאיים על שתי אבנים בו-זמנית.',
    sgf: '(;SZ[9]AW[ed][de]AB[ec][dd][ce](;B[ee](;W[fd];B[df]C[RIGHT])(;W[df];B[fd]C[RIGHT])))',
  },
  {
    id: 'connect-save',
    title: '6. להציל בחיבור',
    hint: 'אבן החיתוך השחורה באטארי - חברו אותה הביתה.',
    sgf: '(;SZ[9]AB[dd][fd][fc][fe]AW[cd][dc][de];B[ed]C[RIGHT])',
  },
  {
    id: 'snapback',
    title: '7. סנאפ-בק',
    hint: 'הקריבו אבן אחת - וקבלו חמש בחזרה.',
    sgf: '(;SZ[9]AW[ab][bb][cb][ca]AB[ac][bc][cc][db][da](;B[ba];W[aa];B[ba]C[RIGHT])(;B[aa];W[ba]C[WRONG]))',
  },
  {
    id: 'live-3row',
    title: '8. לחיות: שלוש בשורה',
    hint: 'לקבוצה השחורה מרחב של שלוש נקודות. איפה שתי העיניים?',
    sgf: '(;SZ[9]AB[ab][bb][cb][db][da]AW[ac][bc][cc][dc][eb][ea](;B[ba]C[RIGHT])(;B[aa];W[ba]C[WRONG])(;B[ca];W[ba]C[WRONG]))',
  },
  {
    id: 'kill-3row',
    title: '9. להרוג: שלוש בשורה',
    hint: 'אותה צורה - הפעם תפסו את הנקודה החיונית של לבן.',
    sgf: '(;SZ[9]AW[ab][bb][cb][db][da]AB[ac][bc][cc][dc][eb][ea];B[ba]C[RIGHT])',
  },
  {
    id: 'live-corner',
    title: '10. לחיות בפינה',
    hint: 'מרחב עיניים מקופל - הנקודה החיונית בפינה עצמה.',
    sgf: '(;SZ[9]AB[ca][cb][bb][bc][ac]AW[da][db][cc][bd][ad](;B[aa]C[RIGHT])(;B[ba];W[aa]C[WRONG])(;B[ab];W[aa]C[WRONG]))',
  },
  {
    id: 'kill-corner',
    title: '11. להרוג בפינה',
    hint: 'אותה פינה מקופלת, בצבעים הפוכים - מצאו את נקודת המוות.',
    sgf: '(;SZ[9]AW[ca][cb][bb][bc][ac]AB[da][db][cc][bd][ad];B[aa]C[RIGHT])',
  },
  {
    id: 'counter-capture',
    title: '12. להינצל בתפיסה נגדית',
    hint: 'הקבוצה השחורה באטארי - אבל גם ללבן יש חולשה…',
    sgf: '(;SZ[9]AB[bb][cb][da]AW[ba][ca][ab][db][cc];B[aa]C[RIGHT])',
  },
]
