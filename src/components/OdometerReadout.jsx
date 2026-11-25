import { useEffect, useMemo, useRef } from 'react'

function DigitStrip({ digit, animate }) {
  const strip = useRef(null)
  const step = '1.1em'

  useEffect(() => {
    if (!strip.current) return
    strip.current.style.transform = `translate3d(0, calc(-${digit} * ${step}), 0)`
    strip.current.style.transition = animate
      ? 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)'
      : 'none'
  }, [digit, animate])

  if (digit === '.') {
    return (
      <span className="odometer__dot" aria-hidden="true">
        .
      </span>
    )
  }

  return (
    <span className="odometer__cell">
      <span ref={strip} className="odometer__strip">
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  )
}

export function OdometerReadout({ value, className = '', animate = true }) {
  const chars = useMemo(() => {
    const text = typeof value === 'number' ? value.toFixed(4) : String(value)
    return text.split('')
  }, [value])

  return (
    <strong className={`readout odometer ${className}`.trim()} aria-live="polite">
      {chars.map((char, index) =>
        char === '.' ? (
          <DigitStrip key={`dot-${index}`} digit="." animate={false} />
        ) : (
          <DigitStrip key={`${index}-${char}`} digit={Number.parseInt(char, 10)} animate={animate} />
        ),
      )}
    </strong>
  )
}