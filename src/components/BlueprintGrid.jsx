import { useEffect, useRef } from 'react'

const POOL = 12

export function BlueprintGrid({ active = true }) {
  const root = useRef(null)
  const pool = useRef([])
  const slot = useRef(0)
  const cell = useRef({ w: 60, h: 60 })
  const last = useRef({ col: -1, row: -1 })

  useEffect(() => {
    const host = root.current
    if (!host || !active) return undefined

    const coarse = window.matchMedia('(hover: none)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduce) return undefined

    const measure = () => {
      const target = 60
      const { width, height } = host.getBoundingClientRect()
      const cols = Math.max(1, Math.round(width / target))
      const rows = Math.max(1, Math.round(height / target))
      const w = width / cols
      const h = height / rows
      cell.current = { w, h }
      host.style.setProperty('--cell-w', `${w}px`)
      host.style.setProperty('--cell-h', `${h}px`)
    }

    measure()
    window.addEventListener('resize', measure)

    const stage = host.closest('.enter-stage') ?? host.parentElement ?? host

    const onMove = (event) => {
      const rect = stage.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const col = Math.floor(x / cell.current.w)
      const row = Math.floor(y / cell.current.h)
      if (col === last.current.col && row === last.current.row) return
      last.current = { col, row }

      const item = pool.current[slot.current % POOL]
      slot.current += 1
      if (!item) return
      item.classList.add('is-lit')
      item.style.transform = `translate3d(${col * cell.current.w}px, ${row * cell.current.h}px, 0)`
      window.setTimeout(() => item.classList.remove('is-lit'), 600)
    }

    stage.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('resize', measure)
      stage.removeEventListener('pointermove', onMove)
    }
  }, [active])

  return (
    <div ref={root} className="blueprint-grid" aria-hidden="true">
      {Array.from({ length: POOL }, (_, index) => (
        <i
          key={index}
          className="blueprint-grid__lit"
          ref={(node) => {
            pool.current[index] = node
          }}
        />
      ))}
    </div>
  )
}