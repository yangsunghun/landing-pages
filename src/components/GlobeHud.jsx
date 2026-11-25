import { useEffect, useRef } from 'react'

export function GlobeHud({ armed, visible, live = true }) {
  const yawRef = useRef(null)

  useEffect(() => {
    if (!live || (!armed && !visible)) return undefined
    const coarse = window.matchMedia('(hover: none)').matches
    if (coarse) return undefined

    let frame = 0
    const tick = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--globe-yaw-deg').trim()
      if (yawRef.current && raw) yawRef.current.textContent = raw
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [armed, visible, live])

  if (!armed && !visible) return null

  return (
    <div className={`globe-hud ${armed ? 'is-armed' : ''}`} aria-hidden={!armed}>
      <svg className="globe-hud__arc" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" className="globe-hud__ring" />
        <path className="globe-hud__sweep" d="M 60 60 L 94 38 A 46 46 0 0 0 60 14" />
      </svg>
      <span className="globe-hud__label">DRAG</span>
      <span className="globe-hud__value">
        <var ref={yawRef}>270.0</var>°
      </span>
    </div>
  )
}