import { useEffect, useRef, useState } from 'react'
import { copy } from './copy'
import { BlueprintGrid } from './components/blueprint-grid'
import { DotSpotlight } from './components/dot-spotlight'
import { LineReveal } from './components/line-reveal'
import { OdometerReadout } from './components/odometer-readout'
import { DoorEraserCanvas } from './components/door-eraser-canvas'
import { WorkMasthead } from './components/work-masthead'
import { WORK_SLOTS } from './lib/editorial'
import { clamp01, revealedByProgress } from './lib/motion'

const LETTERS = copy.brand.split('')
const DOTS = Array.from({ length: 22 }, (_, index) => index)
const TICKS = Array.from({ length: 28 }, (_, index) => index)
const CELLS = Array.from({ length: 16 }, (_, index) => index)
const BARS = Array.from({ length: 18 }, (_, index) => index)
const LANES = [0, 1, 2, 3, 4]
const LEDGER_ROWS = [0, 1, 2, 3, 4]

export function EnterScene({ progress, live = true, introBurst = 0 }) {
  const stageRef = useRef(null)
  const letterRefs = useRef([])
  const dotRefs = useRef([])
  const sim = useRef({
    letters: [],
    drag: null,
    grabX: 0,
    grabY: 0,
    pointerX: -9999,
    pointerY: -9999,
  })
  const leave = clamp01((progress - 0.58) / 0.34)
  const line1 = clamp01((progress - 0.14) / 0.16) * (1 - leave)
  const line2 = clamp01((progress - 0.28) / 0.16) * (1 - leave)

  useEffect(() => {
    if (!introBurst) return undefined
    sim.current.letters.forEach((letter) => {
      letter.x = 0
      letter.y = 0
      letter.vx = 0
      letter.vy = 0
    })
    letterRefs.current.forEach((node) => {
      if (node) node.style.transform = 'translate3d(0, 0, 0)'
    })
    stageRef.current?.classList.add('is-intro-burst')
    const timer = window.setTimeout(() => stageRef.current?.classList.remove('is-intro-burst'), 1400)
    return () => window.clearTimeout(timer)
  }, [introBurst])

  useEffect(() => {
    if (!live) return undefined
    const state = sim.current
    const animateDots = !window.matchMedia('(hover: none)').matches
    state.letters = letterRefs.current.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }))
    let frame = 0
    let running = true
    const tick = () => {
      if (!running) return
      state.letters.forEach((letter, index) => {
        const node = letterRefs.current[index]
        if (!node) return
        if (state.drag === index) {
          node.style.transform = `translate3d(${letter.x}px, ${letter.y}px, 0)`
          return
        }
        const rect = node.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = state.pointerX - cx
        const dy = state.pointerY - cy
        const dist = Math.hypot(dx, dy) || 1
        const pointerInside =
          state.pointerX >= 0 &&
          state.pointerX <= window.innerWidth &&
          state.pointerY >= 0 &&
          state.pointerY <= window.innerHeight
        if (pointerInside && dist < 140) {
          const push = (140 - dist) / 140
          letter.vx -= (dx / dist) * push * 7
          letter.vy -= (dy / dist) * push * 7
        }
        letter.vx += -letter.x * 0.16
        letter.vy += -letter.y * 0.16
        letter.vx *= 0.72
        letter.vy *= 0.72
        letter.x += letter.vx
        letter.y += letter.vy
        node.style.transform = `translate3d(${letter.x}px, ${letter.y}px, 0)`
      })
      if (animateDots) {
        const time = performance.now() / 1000
        const row = letterRefs.current[0]?.parentElement?.getBoundingClientRect()
        const host = dotRefs.current[0]?.parentElement?.getBoundingClientRect()
        const originX = row ? row.left + row.width / 2 : window.innerWidth / 2
        const originY = row ? row.top + row.height / 2 : window.innerHeight / 2
        dotRefs.current.forEach((dot, index) => {
          if (!dot || !host) return
          const angle = time * 0.28 + (index / DOTS.length) * Math.PI * 2
          const baseX = Math.cos(angle) * 250
          const baseY = Math.sin(angle) * 150
          const dx = state.pointerX - (originX + baseX)
          const dy = state.pointerY - (originY + baseY)
          const dist = Math.hypot(dx, dy) || 1
          const scatter = dist < 140 ? (140 - dist) * 0.45 : 0
          const x = originX - host.left + baseX - (dx / dist) * scatter
          const y = originY - host.top + baseY - (dy / dist) * scatter
          dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const onMove = (event) => {
      if (!running) return
      state.pointerX = event.clientX
      state.pointerY = event.clientY
      if (state.drag == null) return
      const letter = state.letters[state.drag]
      if (!letter) return
      letter.x = event.clientX - state.grabX
      letter.y = event.clientY - state.grabY
      letter.vx = 0
      letter.vy = 0
    }
    const onUp = () => {
      state.drag = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [live])

  const retreat = 1 - clamp01(progress * 1.05) * 0.12

  return (
    <div
      ref={stageRef}
      className="enter-stage"
      style={{
        transform: `scale(${retreat})`,
        opacity: 1 - leave,
      }}
    >
      <DotSpotlight active={live} />
      <BlueprintGrid active={live} />
      <div className="enter-window">
        <div
          className="enter instrument"
          style={{ transform: `translate3d(0, calc(${progress * 18}% + ${-leave * 16}vh), 0)` }}
        >
          <div className="orbit-dots" aria-hidden="true">
            {DOTS.map((dot) => (
              <i
                key={dot}
                ref={(node) => {
                  dotRefs.current[dot] = node
                }}
              />
            ))}
          </div>
          <h1 className="letter-row">
            {LETTERS.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                ref={(node) => {
                  letterRefs.current[index] = node
                }}
                onPointerDown={(event) => {
                  const current = sim.current.letters[index] || { x: 0, y: 0 }
                  sim.current.drag = index
                  sim.current.grabX = event.clientX - current.x
                  sim.current.grabY = event.clientY - current.y
                }}
              >
                {letter}
              </span>
            ))}
          </h1>
          <p className="instrument-hint">{copy.enter.hint}</p>
          <LineReveal show={line1 > 0.02}>{copy.enter.line1}</LineReveal>
          <LineReveal show={line2 > 0.02}>{copy.enter.line2}</LineReveal>
        </div>
      </div>
    </div>
  )
}

const PLANE_MOUSE = [1.05, 0.68, 0.46]

export function PracticeStage({ progress, live = true }) {
  const cursor = progress * (copy.practice.length - 1)
  const dialValue = 180 + progress * 200
  const focus = Math.min(copy.practice.length - 1, Math.max(0, Math.round(cursor)))
  const dialAnim = live && clamp01(1 - Math.abs(cursor))

  return (
    <div className="practice-stage">
      <div className="depth" style={{ '--p': progress }}>
        {copy.practice.map((item, index) => {
          const delta = cursor - index
          const near = 1 - clamp01(Math.abs(delta))
          const factor = PLANE_MOUSE[index] ?? 0.5
          return (
            <article
              key={item.name}
              className="plane"
              style={{
                opacity: clamp01(delta + 1.15) * (0.22 + near * 0.78),
                transform: `translate3d(calc(var(--px-smooth, var(--px, 0)) * ${36 * factor}px), calc(var(--py-smooth, var(--py, 0)) * ${24 * factor}px), ${near * 80}px) translate3d(0, ${(index - cursor) * 72}vh, 0) rotateX(${delta * -18}deg)`,
              }}
            >
              <div className="device">
                {index === 0 && (
                  <div className="dial-wrap">
                    <div className="dial" aria-hidden="true">
                      {TICKS.map((tick) => (
                        <i key={tick} style={{ transform: `rotate(${tick * (360 / TICKS.length)}deg)` }} />
                      ))}
                    </div>
                    <span className="dial-readout">
                      <OdometerReadout
                        value={Number(dialValue.toFixed(1))}
                        precision={1}
                        animate={dialAnim > 0.35}
                      />
                      °
                    </span>
                  </div>
                )}
                {index === 1 && (
                  <div className="cells" aria-hidden="true">
                    {CELLS.map((cell) => (
                      <i key={cell} />
                    ))}
                  </div>
                )}
                {index === 2 && (
                  <div className="lanes" aria-hidden="true">
                    {LANES.map((lane) => (
                      <i key={lane} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h2>{item.name}</h2>
                <p>{item.text}</p>
              </div>
            </article>
          )
        })}
      </div>
      <aside className="flow-rail" aria-hidden="true">
        {copy.practice.map((item, index) => {
          const active = focus === index
          const stacked = index < focus
          return (
            <article
              key={item.name}
              className="flow-rail__card"
              data-active={active ? 'true' : undefined}
              data-stacked={stacked ? 'true' : undefined}
            >
              <span className="flow-rail__index">0{index + 1}</span>
              <strong>{item.name}</strong>
            </article>
          )
        })}
      </aside>
    </div>
  )
}

export function WorkStage({ progress, live = true }) {
  const [shift, setShift] = useState(0)
  const [rate, setRate] = useState(1.084)
  const [peek, setPeek] = useState(null)
  const drag = useRef(null)
  const bars = useRef([])
  const cards = useRef([])
  const peekRef = useRef(null)
  const scrollCursor = Math.min(2, Math.max(0, progress * 2 + shift))
  const cursor = scrollCursor

  const pickPeek = (clientX, clientY) => {
    let best = null
    let bestDist = Infinity
    cards.current.forEach((node, index) => {
      if (!node) return
      const rect = node.getBoundingClientRect()
      if (clientY < rect.top - 8 || clientY > rect.bottom + 8) return
      const anchor = rect.left + rect.width * 0.32
      const dist = Math.abs(clientX - anchor)
      if (dist < bestDist) {
        bestDist = dist
        best = index
      }
    })
    if (bestDist > 220) return null
    return best
  }

  const syncPeek = (next) => {
    if (peekRef.current === next) return
    peekRef.current = next
    setPeek(next)
  }

  useEffect(() => {
    if (!live) return undefined
    let frame = 0
    let lastRate = 0
    let running = true
    const tick = () => {
      if (!running) return
      const px =
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px-smooth')) ||
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) ||
        0
      const py =
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--py-smooth')) ||
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--py')) ||
        0
      const now = performance.now()
      const nextRate = 1.084 + px * 0.18 + Math.sin(now / 280) * 0.006
      if (now - lastRate > 64) {
        lastRate = now
        setRate((value) => (Math.abs(value - nextRate) > 0.0002 ? nextRate : value))
      }
      bars.current.forEach((bar, index) => {
        if (!bar) return
        const wave = Math.abs(Math.sin(performance.now() / 220 + index * 0.55 + px * 2))
        const height = 8 + wave * (18 + (py + 1) * 28)
        bar.style.height = `${height}px`
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(frame)
    }
  }, [live])

  return (
    <div
      className="deck"
      style={{ '--deck-p': progress }}
      onPointerMove={(event) => {
        if (drag.current != null) return
        if (window.matchMedia('(hover: none)').matches) return
        syncPeek(pickPeek(event.clientX, event.clientY))
      }}
      onPointerLeave={() => syncPeek(null)}
      onPointerDown={(event) => {
        if (event.target.closest('a, button')) return
        const deck = event.currentTarget
        deck.setAttribute('data-lenis-prevent', '')
        drag.current = event.clientX
        syncPeek(null)
        const move = (next) => {
          if (drag.current == null) return
          const dx = next.clientX - drag.current
          drag.current = next.clientX
          setShift((value) => Math.min(1.4, Math.max(-1.4, value - dx / 240)))
        }
        const up = () => {
          drag.current = null
          deck.removeAttribute('data-lenis-prevent')
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    >
      <WorkMasthead progress={progress} />
      {copy.works.map((work, index) => {
        const delta = index - cursor
        const near = 1 - clamp01(Math.abs(delta))
        const hovered = peek === index
        const focus = Math.min(1, near + (hovered ? 0.38 : 0))
        const scrubOuter = delta * 36
        const scrubHeavy = delta * 28 * (1 + progress * 0.35)
        const scrubInner = near * (4 + progress * 12)
        const slot = WORK_SLOTS[index] ?? WORK_SLOTS[0]
        return (
          <article
            key={work.name}
            ref={(node) => {
              cards.current[index] = node
            }}
            className="deck-card"
            style={{
              padding: slot.pad,
              zIndex: hovered ? 4 : Math.round(focus * 3),
              opacity: 0.28 + focus * 0.72,
              transform: `translate3d(${scrubOuter}vw, -50%, ${near * 70}px) rotateY(${delta * -9}deg)`,
            }}
          >
            <div className="deck-card__shell" style={{ transform: `translate3d(${scrubHeavy}px, 0, 0)` }}>
              <div
                className="deck-card__inner"
                style={{
                  transform: `translate3d(calc(var(--px-smooth, var(--px, 0)) * ${-scrubInner}px), calc(var(--py-smooth, var(--py, 0)) * ${scrubInner * 0.18}px), 0)`,
                }}
              >
                {index === 0 && <OdometerReadout value={rate} animate={focus > 0.45} />}
                {index === 1 && (
                  <div className="bars" aria-hidden="true">
                    {BARS.map((bar) => (
                      <i
                        key={bar}
                        ref={(node) => {
                          bars.current[bar] = node
                        }}
                      />
                    ))}
                  </div>
                )}
                {index === 2 && (
                  <div className={focus > 0.72 ? 'ledger is-hot' : 'ledger'} aria-hidden="true">
                    {LEDGER_ROWS.map((row) => (
                      <i key={row} />
                    ))}
                  </div>
                )}
                <h2
                  className="deck-title"
                  style={{ letterSpacing: `${-0.06 + focus * 0.08}em`, transform: `scale(${0.94 + focus * 0.06})` }}
                >
                  {work.name}
                </h2>
                <p>{work.text}</p>
                <span>{work.roles}</span>
              </div>
            </div>
          </article>
        )
      })}
      <p className="deck-hint">{copy.workHint}</p>
    </div>
  )
}

export function DoorScene({ progress, reveal = 0, live = true }) {
  const [staticVeil, setStaticVeil] = useState(false)
  useEffect(() => {
    setStaticVeil(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia('(hover: none)').matches,
    )
  }, [])

  const leaveRaw = clamp01((progress - 0.4) / 0.38)
  const leave = leaveRaw * (1 - clamp01(reveal * 1.05))
  const open = clamp01((progress - 0.06) / 0.72)
  const handoff = clamp01((progress - 0.58) / 0.35) * clamp01(reveal)
  const hole = clamp01((progress - 0.22) / 0.58) * (0.35 + reveal * 0.75)
  const veilOpacity = clamp01((progress - 0.18) / 0.35) * (1 - clamp01(reveal * 1.15))
  const inset = (1 - open) * 10 * (1 - handoff * 0.85)
  const round = (1 - open) * 14 * (1 - handoff)
  const words = copy.door.title.split(/\s+/)
  const lit = revealedByProgress(progress, words.length, 0, 0.73)

  return (
    <div
      className="door expanding-stage"
      style={{
        '--stage-open': open,
        opacity: 1 - leave * 0.85,
        transform: `translate3d(0, ${-leave * 8}vh, 0)`,
        clipPath: `inset(${inset}% round ${round}px)`,
      }}
    >
      {veilOpacity > 0.02 && live && !staticVeil ? (
        <DoorEraserCanvas progress={progress} reveal={reveal} opacity={veilOpacity} hole={hole} live={live} />
      ) : (
        veilOpacity > 0.02 && (
          <div
            className="door-globe-veil"
            aria-hidden="true"
            style={{
              opacity: veilOpacity,
              maskImage: `radial-gradient(circle at calc(50% + var(--px-smooth, var(--px, 0)) * 7%) calc(46% + var(--py-smooth, var(--py, 0)) * 5%), transparent ${18 + hole * 52}vmin, #000 ${20 + hole * 54}vmin)`,
              WebkitMaskImage: `radial-gradient(circle at calc(50% + var(--px-smooth, var(--px, 0)) * 7%) calc(46% + var(--py-smooth, var(--py, 0)) * 5%), transparent ${18 + hole * 52}vmin, #000 ${20 + hole * 54}vmin)`,
            }}
          />
        )
      )}
      <h2>
        {words.map((word, index) => (
          <span key={word} className={index < lit ? 'is-lit' : ''}>
            {word}{' '}
          </span>
        ))}
      </h2>
      <LineReveal show={clamp01(progress / 0.2) * (1 - leave) > 0.02}>{copy.door.text}</LineReveal>
    </div>
  )
}
