import { CHARACTERS, Character } from '@tanuki/shared'
import { useState } from 'react'
import { CharacterAvatar } from '../components/avatars/CharacterAvatar'

const CHAR_NAMES: Record<Character, string> = {
  sloth: 'עצלן',
  shark: 'כריש',
  jellyfish: 'מדוזה',
}

export function Login({
  onJoin,
  error,
}: {
  onJoin: (name: string, character: Character) => void
  error: string | null
}) {
  const [name, setName] = useState(
    () => localStorage.getItem('tanuki-name') ?? '',
  )
  const [character, setCharacter] = useState<Character>(
    () => (localStorage.getItem('tanuki-character') as Character) || 'sloth',
  )

  const submit = () => {
    if (!name.trim()) return
    localStorage.setItem('tanuki-name', name.trim())
    localStorage.setItem('tanuki-character', character)
    onJoin(name.trim(), character)
  }

  return (
    <div className="card login-card">
      <h2 style={{ margin: 0 }}>ברוכים הבאים לסלון הגו 🍵</h2>
      <p className="subtitle">בחרו שם ודמות, והיכנסו לשחק</p>
      <input
        value={name}
        maxLength={20}
        placeholder="השם שלך"
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        autoFocus
      />
      <div className="char-row">
        {CHARACTERS.map(c => (
          <div
            key={c}
            className={`char-pick${character === c ? ' selected' : ''}`}
            onClick={() => setCharacter(c)}
          >
            <CharacterAvatar character={c} size={64} />
            <span>{CHAR_NAMES[c]}</span>
          </div>
        ))}
      </div>
      {error && <p style={{ color: '#b3425c', margin: 0 }}>{error}</p>}
      <button className="peach" onClick={submit} disabled={!name.trim()}>
        כניסה לסלון
      </button>
    </div>
  )
}
