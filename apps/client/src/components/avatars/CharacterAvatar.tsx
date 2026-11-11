import { Character } from '@tanuki/shared'

/**
 * שלוש הדמויות של הסלון: עצלן, כריש ומדוזה.
 * SVG ידני בפלטת פסטל, בגודל וקטורי (ברירת מחדל 56px).
 */
export function CharacterAvatar({
  character,
  size = 56,
}: {
  character: Character
  size?: number
}) {
  switch (character) {
    case 'sloth':
      return <Sloth size={size} />
    case 'shark':
      return <Shark size={size} />
    case 'jellyfish':
      return <Jellyfish size={size} />
  }
}

function Sloth({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="עצלן">
      {/* גוף */}
      <ellipse cx="32" cy="44" rx="17" ry="15" fill="#d7bfa5" />
      {/* ראש */}
      <circle cx="32" cy="24" r="17" fill="#e8d5bc" />
      {/* פנים בהירות */}
      <ellipse cx="32" cy="27" rx="12" ry="10" fill="#f7ecdb" />
      {/* כתמי עיניים */}
      <ellipse cx="25.5" cy="23" rx="4.5" ry="6" fill="#b89b7c" transform="rotate(-18 25.5 23)" />
      <ellipse cx="38.5" cy="23" rx="4.5" ry="6" fill="#b89b7c" transform="rotate(18 38.5 23)" />
      {/* עיניים ישנוניות */}
      <circle cx="25.5" cy="24" r="1.8" fill="#4a3426" />
      <circle cx="38.5" cy="24" r="1.8" fill="#4a3426" />
      <path d="M22 21.5 q3.5 -2.5 7 0" stroke="#4a3426" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M35 21.5 q3.5 -2.5 7 0" stroke="#4a3426" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* אף וחיוך */}
      <ellipse cx="32" cy="29" rx="2.2" ry="1.6" fill="#6b4f38" />
      <path d="M28 33 q4 3.5 8 0" stroke="#6b4f38" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* זרועות חיבוק */}
      <path d="M17 40 q-4 8 2 14" stroke="#c9ad8d" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M47 40 q4 8 -2 14" stroke="#c9ad8d" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* ציפורניים */}
      <path d="M18 53 l1.5 4 M21 54 l1 4" stroke="#8a7158" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M46 53 l-1.5 4 M43 54 l-1 4" stroke="#8a7158" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Shark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="כריש">
      {/* סנפיר גב */}
      <path d="M32 4 q10 6 4 15 l-10 0 q-2 -10 6 -15" fill="#9fc3e0" />
      {/* גוף */}
      <ellipse cx="32" cy="38" rx="20" ry="20" fill="#aed0ea" />
      {/* בטן */}
      <ellipse cx="32" cy="46" rx="14" ry="11" fill="#eaf4fb" />
      {/* סנפירים צדדיים */}
      <path d="M12 40 q-7 3 -8 9 q7 1 12 -4 z" fill="#9fc3e0" />
      <path d="M52 40 q7 3 8 9 q-7 1 -12 -4 z" fill="#9fc3e0" />
      {/* עיניים */}
      <circle cx="24" cy="32" r="3.2" fill="#2e4057" />
      <circle cx="40" cy="32" r="3.2" fill="#2e4057" />
      <circle cx="25" cy="31" r="1" fill="#fff" />
      <circle cx="41" cy="31" r="1" fill="#fff" />
      {/* לחיים */}
      <circle cx="19" cy="38" r="2.5" fill="#f5c3cb" opacity="0.8" />
      <circle cx="45" cy="38" r="2.5" fill="#f5c3cb" opacity="0.8" />
      {/* פה עם שיניים חמודות */}
      <path d="M24 42 q8 7 16 0" stroke="#2e4057" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M28 43.5 l1.6 2.8 l1.6 -2.2" fill="#fff" stroke="#2e4057" strokeWidth="0.7" />
      <path d="M34 44 l1.6 2.6 l1.6 -2.6" fill="#fff" stroke="#2e4057" strokeWidth="0.7" />
      {/* זימים */}
      <path d="M14 30 q-1.5 3 0 6 M17 29 q-1.5 3.5 0 7" stroke="#8fb3d0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Jellyfish({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="מדוזה">
      {/* כיפה */}
      <path d="M10 34 q0 -24 22 -24 q22 0 22 24 q0 6 -22 6 q-22 0 -22 -6" fill="#e5c5ec" />
      <path d="M14 32 q0 -18 18 -18 q18 0 18 18 q-5 4 -18 4 q-13 0 -18 -4" fill="#f2ddf6" opacity="0.7" />
      {/* נקודות ברק */}
      <circle cx="22" cy="18" r="2.4" fill="#fff" opacity="0.8" />
      <circle cx="27" cy="14" r="1.4" fill="#fff" opacity="0.7" />
      {/* זרועות מתנדנדות */}
      <path d="M18 40 q-3 6 1 10 q3 4 0 9" stroke="#d9a7e0" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M27 41 q-2 7 1.5 11 q2.5 4 0.5 8" stroke="#cdb2ef" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M37 41 q2 7 -1.5 11 q-2.5 4 -0.5 8" stroke="#d9a7e0" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M46 40 q3 6 -1 10 q-3 4 0 9" stroke="#cdb2ef" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {/* עיניים */}
      <circle cx="25" cy="28" r="2.8" fill="#5b4668" />
      <circle cx="39" cy="28" r="2.8" fill="#5b4668" />
      <circle cx="26" cy="27" r="0.9" fill="#fff" />
      <circle cx="40" cy="27" r="0.9" fill="#fff" />
      {/* לחיים וחיוך */}
      <circle cx="20" cy="33" r="2.2" fill="#f5c3cb" opacity="0.85" />
      <circle cx="44" cy="33" r="2.2" fill="#f5c3cb" opacity="0.85" />
      <path d="M29 33 q3 3 6 0" stroke="#5b4668" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
