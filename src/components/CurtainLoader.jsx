import { useEffect, useState } from 'react'
import { copy } from '../copy'

const STORAGE_KEY = 'meridian-curtain-seen'

export function CurtainLoader() {
  const [phase, setPhase] = useState(() =>
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) ? 'done' : 'count',
  )
  const [count, setCount] = useState(100)

  useEffect(() => {
    if (phase === 'done') return undefined

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setPhase('done')
      return undefined
    }

    const tick = window.setInterval(() => {
      setCount((value) => {
        if (value <= 0) {
          window.clearInterval(tick)
          setPhase('fold')
          return 0
        }
        return value - 2
      })
    }, 28)

    return () => window.clearInterval(tick)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fold') return undefined
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, '1')
      setPhase('done')
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === 'done') return null

  return (
    <div className={`curtain ${phase === 'fold' ? 'is-folding' : ''}`} role="presentation" aria-hidden="true">
      <strong>{copy.brand}</strong>
      <span className="curtain__count">{String(count).padStart(3, '0')}</span>
    </div>
  )
}