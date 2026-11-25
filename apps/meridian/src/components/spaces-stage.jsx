import { useEffect, useRef, useState } from 'react'
import { copy } from '../copy'
import { clamp01, lerp } from '../lib/motion'

const BASE_ZOOM = 1.48
const HOLD_ZOOM = 2.15
const BASE_RADIUS = 92
const HOLD_RADIUS = 122

export function SpacesStage({ progress, live = true }) {
  const total = copy.spaces.length
  const scrollSlot = Math.min(total - 1, Math.max(0, Math.floor(progress * total * 0.999)))
  const [override, setOverride] = useState(null)
  const lastScrollProgress = useRef(progress)

  const bladeRefs = useRef([])
  const clipRefs = useRef([])
  const zoomImgRefs = useRef([])
  const ringRefs = useRef([])
  const badgeRefs = useRef([])

  const pointer = useRef({
    clientX: 0,
    clientY: 0,
    inside: false,
    holding: false,
    x: 0,
    y: 0,
    alpha: 0,
    zoom: BASE_ZOOM,
    radius: BASE_RADIUS,
    seeded: false,
  })

  useEffect(() => {
    if (override == null) {
      lastScrollProgress.current = progress
      return
    }
    if (Math.abs(progress - lastScrollProgress.current) > 0.07) {
      setOverride(null)
      lastScrollProgress.current = progress
    }
  }, [progress, override])

  const activeIndex = override ?? scrollSlot
  const activeRef = useRef(activeIndex)
  activeRef.current = activeIndex

  useEffect(() => {
    pointer.current.seeded = false
  }, [activeIndex])

  useEffect(() => {
    if (!live) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none)').matches
    if (reduced || coarse) return undefined

    let frame = 0
    let running = true

    const onUp = () => {
      pointer.current.holding = false
    }

    const tick = () => {
      if (!running) return
      const idx = activeRef.current
      const st = pointer.current
      const host = bladeRefs.current[idx]

      if (host && st.inside) {
        const rect = host.getBoundingClientRect()
        const tx = Math.min(rect.width, Math.max(0, st.clientX - rect.left))
        const ty = Math.min(rect.height, Math.max(0, st.clientY - rect.top))
        if (!st.seeded) {
          st.x = tx
          st.y = ty
          st.seeded = true
        } else {
          st.x = lerp(st.x, tx, 0.24)
          st.y = lerp(st.y, ty, 0.24)
        }
      }

      const targetAlpha = st.inside ? 1 : 0
      const targetZoom = st.holding ? HOLD_ZOOM : BASE_ZOOM
      const targetRadius = st.holding ? HOLD_RADIUS : BASE_RADIUS

      st.alpha = lerp(st.alpha, targetAlpha, 0.18)
      st.zoom = lerp(st.zoom, targetZoom, 0.16)
      st.radius = lerp(st.radius, targetRadius, 0.16)

      copy.spaces.forEach((_, i) => {
        const clip = clipRefs.current[i]
        const zImg = zoomImgRefs.current[i]
        const ring = ringRefs.current[i]
        const badge = badgeRefs.current[i]

        if (i !== idx || st.alpha < 0.015) {
          if (clip) clip.style.clipPath = 'circle(0px at 50% 50%)'
          if (ring) ring.style.opacity = '0'
          return
        }

        const r = st.radius * st.alpha
        if (clip) {
          clip.style.clipPath = `circle(${r.toFixed(1)}px at ${st.x.toFixed(1)}px ${st.y.toFixed(1)}px)`
        }
        if (zImg) {
          const tx = st.x * (1 - st.zoom)
          const ty = st.y * (1 - st.zoom)
          zImg.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${st.zoom.toFixed(3)})`
        }
        if (ring) {
          const size = r * 2
          ring.style.width = `${size.toFixed(1)}px`
          ring.style.height = `${size.toFixed(1)}px`
          ring.style.opacity = st.alpha.toFixed(3)
          ring.style.transform = `translate3d(${(st.x - r).toFixed(1)}px, ${(st.y - r).toFixed(1)}px, 0)`
        }
        if (badge) {
          badge.textContent = `${st.zoom.toFixed(1)}×`
        }
      })

      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    frame = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [live])

  const enter = clamp01(progress / 0.09)
  const leave = clamp01((progress - 0.9) / 0.1)

  return (
    <div
      className="spaces-stage"
      style={{
        opacity: (0.25 + enter * 0.75) * (1 - leave * 0.85),
        transform: `scale(${0.96 + enter * 0.04 - leave * 0.04})`,
      }}
    >
      <header className="spaces-head">
        <span className="spaces-head__label">{copy.spacesHeading}</span>
        <span className="spaces-head__hint">{copy.spacesHint}</span>
      </header>

      <div className="spaces-triptych">
        {copy.spaces.map((item, index) => {
          const isActive = index === activeIndex
          return (
            <article
              key={item.name}
              ref={(node) => {
                bladeRefs.current[index] = node
              }}
              className="spaces-blade"
              data-active={isActive ? 'true' : undefined}
              onClick={(event) => {
                if (!isActive) {
                  lastScrollProgress.current = progress
                  pointer.current.clientX = event.clientX
                  pointer.current.clientY = event.clientY
                  pointer.current.inside = true
                  pointer.current.seeded = false
                  setOverride(index)
                }
              }}
              onPointerEnter={(event) => {
                if (!isActive) return
                pointer.current.clientX = event.clientX
                pointer.current.clientY = event.clientY
                pointer.current.inside = true
              }}
              onPointerMove={(event) => {
                if (!isActive) return
                pointer.current.clientX = event.clientX
                pointer.current.clientY = event.clientY
                pointer.current.inside = true
              }}
              onPointerLeave={() => {
                if (!isActive) return
                pointer.current.inside = false
                pointer.current.holding = false
              }}
              onPointerDown={(event) => {
                if (!isActive || event.button !== 0) return
                pointer.current.clientX = event.clientX
                pointer.current.clientY = event.clientY
                pointer.current.inside = true
                pointer.current.holding = true
              }}
            >
              <div className="spaces-blade__media">
                <img
                  className="spaces-blade__img spaces-blade__img--base"
                  src={item.image}
                  alt={item.name}
                  draggable="false"
                />
                <div
                  ref={(node) => {
                    clipRefs.current[index] = node
                  }}
                  className="spaces-blade__loupe-clip"
                  aria-hidden="true"
                >
                  <img
                    ref={(node) => {
                      zoomImgRefs.current[index] = node
                    }}
                    className="spaces-blade__img spaces-blade__img--zoom"
                    src={item.image}
                    alt=""
                    draggable="false"
                  />
                </div>
                <div
                  ref={(node) => {
                    ringRefs.current[index] = node
                  }}
                  className="spaces-loupe-ring"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 200 200" className="spaces-loupe-ring__svg">
                    <circle cx="100" cy="100" r="98" className="spaces-loupe-ring__outer" />
                    <circle cx="100" cy="100" r="92" className="spaces-loupe-ring__ticks" />
                    <line x1="100" y1="88" x2="100" y2="95" className="spaces-loupe-ring__cross" />
                    <line x1="100" y1="105" x2="100" y2="112" className="spaces-loupe-ring__cross" />
                    <line x1="88" y1="100" x2="95" y2="100" className="spaces-loupe-ring__cross" />
                    <line x1="105" y1="100" x2="112" y2="100" className="spaces-loupe-ring__cross" />
                  </svg>
                  <span
                    ref={(node) => {
                      badgeRefs.current[index] = node
                    }}
                    className="spaces-loupe-ring__badge"
                  >
                    1.5×
                  </span>
                </div>
                <div className="spaces-blade__scrim" aria-hidden="true" />
              </div>

              <div className="spaces-blade__spine" aria-hidden={isActive}>
                <span>{item.index}</span>
                <strong>{item.name}</strong>
              </div>

              <div className="spaces-blade__caption" aria-hidden={!isActive}>
                <div className="spaces-blade__meta">
                  <span>
                    {item.index} · {item.location}
                  </span>
                  <span>{item.spec}</span>
                </div>
                <div className="spaces-blade__body">
                  <h2>{item.name}</h2>
                  <p>{item.text}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
