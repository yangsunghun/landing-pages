import { clamp01 } from '../lib/motion'

const LABEL = 'WORKS'.split('')

export function WorkMasthead({ progress }) {
  const spread = clamp01((progress - 0.08) / 0.55)
  const fold = clamp01((progress - 0.72) / 0.2)
  const peek = clamp01(progress / 0.12) * (1 - fold)

  return (
    <div
      className="work-masthead"
      aria-hidden="true"
      style={{ opacity: peek * 0.42, '--spread': spread }}
    >
      {LABEL.map((letter, index) => {
        const center = (LABEL.length - 1) / 2
        const offset = (index - center) * (6 + spread * 52)
        const scale = 0.45 + spread * 0.55
        return (
          <span
            key={`${letter}-${index}`}
            style={{
              transform: `translate3d(${offset}px, 0, 0) scale(${scale})`,
            }}
          >
            {letter}
          </span>
        )
      })}
    </div>
  )
}