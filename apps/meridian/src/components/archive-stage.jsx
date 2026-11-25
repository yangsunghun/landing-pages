import { useEffect, useMemo, useRef, useState } from 'react'
import { copy } from '../copy'
import { clamp01, lerp } from '../lib/motion'

const CARD_W = 320
const CARD_H = 224

export function ArchiveStage({ progress, live = true }) {
  const [filter, setFilter] = useState('ALL')
  const [hoverIndex, setHoverIndex] = useState(null)

  const stageRef = useRef(null)
  const listRef = useRef(null)
  const rowRefs = useRef([])
  const floaterRef = useRef(null)
  const hoverIndexRef = useRef(null)

  const items = useMemo(
    () =>
      filter === 'ALL'
        ? copy.archive
        : copy.archive.filter((item) => item.category === filter),
    [filter],
  )

  const scrollIndex = Math.min(
    Math.max(0, items.length - 1),
    Math.max(0, Math.floor(progress * items.length * 0.999)),
  )

  const safeHover = hoverIndex != null && hoverIndex < items.length ? hoverIndex : null
  const activeIndex = safeHover ?? scrollIndex
  const activeItem = items[activeIndex] ?? items[0]

  const motion = useRef({
    pointerIn: false,
    clientX: 0,
    clientY: 0,
    x: 0,
    y: 0,
    tilt: 0,
    seeded: false,
  })

  const activeIndexRef = useRef(activeIndex)
  activeIndexRef.current = activeIndex

  useEffect(() => {
    if (!live) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none)').matches
    if (reduced || coarse) return undefined

    let frame = 0
    let running = true

    const tick = () => {
      if (!running) return
      const host = stageRef.current
      const floater = floaterRef.current
      if (host && floater) {
        const hostRect = host.getBoundingClientRect()
        const st = motion.current
        let tx = hostRect.width * 0.64
        let ty = hostRect.height * 0.5 - CARD_H * 0.5

        if (st.pointerIn) {
          const rawX = st.clientX - hostRect.left + 34
          const rawY = st.clientY - hostRect.top - CARD_H * 0.5
          const flipX =
            rawX + CARD_W > hostRect.width - 24
              ? st.clientX - hostRect.left - CARD_W - 34
              : rawX
          tx = Math.min(hostRect.width - CARD_W - 24, Math.max(24, flipX))
          ty = Math.min(hostRect.height - CARD_H - 24, Math.max(64, rawY))
        } else {
          const activeRow = rowRefs.current[activeIndexRef.current]
          if (activeRow) {
            const rowRect = activeRow.getBoundingClientRect()
            const rowCenter = rowRect.top - hostRect.top + rowRect.height * 0.5
            ty = Math.min(
              hostRect.height - CARD_H - 24,
              Math.max(64, rowCenter - CARD_H * 0.5),
            )
          }
        }

        if (!st.seeded) {
          st.x = tx
          st.y = ty
          st.seeded = true
        } else {
          const vx = tx - st.x
          st.x = lerp(st.x, tx, st.pointerIn ? 0.16 : 0.09)
          st.y = lerp(st.y, ty, st.pointerIn ? 0.16 : 0.09)
          const targetTilt = st.pointerIn ? Math.max(-6.5, Math.min(6.5, vx * 0.085)) : 0
          st.tilt = lerp(st.tilt, targetTilt, 0.18)
        }

        const scale = st.pointerIn ? 1.02 : 0.96
        floater.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0) rotate(${st.tilt.toFixed(2)}deg) scale(${scale})`
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(frame)
    }
  }, [live])

  const pickRowByY = (clientY) => {
    const list = listRef.current
    if (!list) return null
    let chosen = null
    let minGap = Infinity
    for (let i = 0; i < items.length; i += 1) {
      const node = rowRefs.current[i]
      if (!node) continue
      const rect = node.getBoundingClientRect()
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return i
      }
      const center = rect.top + rect.height * 0.5
      const gap = Math.abs(clientY - center)
      if (gap < minGap) {
        minGap = gap
        chosen = i
      }
    }
    return chosen
  }

  const syncHover = (next) => {
    if (hoverIndexRef.current === next) return
    hoverIndexRef.current = next
    setHoverIndex(next)
  }

  const enter = clamp01(progress / 0.1)
  const leave = clamp01((progress - 0.9) / 0.1)

  return (
    <div
      ref={stageRef}
      className="archive-stage"
      style={{
        opacity: (0.22 + enter * 0.78) * (1 - leave * 0.85),
        transform: `translate3d(0, ${(1 - enter) * 18 - leave * 18}px, 0)`,
      }}
    >
      <header className="archive-head">
        <div className="archive-head__title">
          <span>{copy.archiveHeading}</span>
          <em>[{String(items.length).padStart(2, '0')}]</em>
        </div>

        <div className="archive-filters" role="tablist" aria-label="Archive categories">
          {copy.archiveFilters.map((cat) => {
            const on = filter === cat
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={on}
                className={`archive-filter${on ? ' is-on' : ''}`}
                onClick={() => {
                  syncHover(null)
                  setFilter(cat)
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </header>

      <div
        ref={listRef}
        className={`archive-list${safeHover != null ? ' is-hovering' : ''}`}
        onPointerEnter={(event) => {
          if (window.matchMedia('(hover: none)').matches) return
          motion.current.pointerIn = true
          motion.current.clientX = event.clientX
          motion.current.clientY = event.clientY
          syncHover(pickRowByY(event.clientY))
        }}
        onPointerMove={(event) => {
          if (window.matchMedia('(hover: none)').matches) return
          motion.current.pointerIn = true
          motion.current.clientX = event.clientX
          motion.current.clientY = event.clientY
          syncHover(pickRowByY(event.clientY))
        }}
        onPointerLeave={() => {
          motion.current.pointerIn = false
          syncHover(null)
        }}
      >
        {items.map((item, idx) => {
          const isCurrent = idx === activeIndex
          return (
            <article
              key={item.name}
              ref={(node) => {
                rowRefs.current[idx] = node
              }}
              className="archive-row"
              data-active={isCurrent ? 'true' : undefined}
              onClick={() => syncHover(idx)}
            >
              <span className="archive-row__num">{item.index}</span>
              <h2 className="archive-row__name">{item.name}</h2>
              <span className="archive-row__scope">{item.scope}</span>
              <span className="archive-row__meta">
                <i>{item.category}</i>
                <b>
                  {item.studio} · {item.year}
                </b>
              </span>
            </article>
          )
        })}
      </div>

      {activeItem && (
        <aside ref={floaterRef} className="archive-floater" aria-hidden="true">
          <div className="archive-floater__viewport">
            <div
              className="archive-floater__reel"
              style={{
                transform: `translate3d(0, -${activeIndex * 100}%, 0)`,
              }}
            >
              {items.map((item) => (
                <div key={item.name} className="archive-floater__frame">
                  <img src={item.image} alt="" draggable="false" />
                </div>
              ))}
            </div>
          </div>
          <div className="archive-floater__bar">
            <span>
              {activeItem.index} / {activeItem.category}
            </span>
            <span>{activeItem.studio}</span>
          </div>
        </aside>
      )}
    </div>
  )
}
