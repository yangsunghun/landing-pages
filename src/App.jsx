import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import GlobeScene from './experience/Globe'
import { bindPainter } from './experience/links'
import { CONCEPTS } from './experience/concepts'
import { REGIONS } from './experience/regions'
import { dossierOpen, nudgeTarget, setTarget, subscribeJourney } from './experience/journey'

function useJourneyInput() {
  useEffect(() => {
    const onWheel = (event) => {
      event.preventDefault()
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      nudgeTarget(event.deltaY * line * 0.0004)
    }

    const onKey = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        nudgeTarget(0.08)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        nudgeTarget(-0.08)
      } else if (event.key === 'Home') {
        setTarget(0)
      } else if (event.key === 'End') {
        setTarget(1)
      }
    }

    let lastY = null
    const onTouchStart = (event) => {
      if (event.target.closest('a, button')) {
        lastY = null
        return
      }
      lastY = event.touches[0].clientY
    }
    const onTouchMove = (event) => {
      if (lastY == null) return
      const y = event.touches[0].clientY
      nudgeTarget((lastY - y) * 0.0016)
      lastY = y
      event.preventDefault()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])
}

function Loader() {
  const { progress, active, total } = useProgress()
  const ready = total > 0 && !active && progress === 100
  if (ready) return null

  return (
    <div className="loader" role="status">
      <strong>원일점</strong>
      <span>{total === 0 ? '불러오는 중' : `${Math.round(progress)}%`}</span>
    </div>
  )
}

function branchPath(x1, y1, x2, y2) {
  const x = x1.toFixed(1)
  const y = y1.toFixed(1)
  return `M ${x} ${y} L ${x} ${y2.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function paintLinks(root, points) {
  if (!root) return
  points.forEach((point) => {
    const card = root.querySelector(`[data-region="${point.id}"]`)
    const wire = root.querySelector(`[data-wire="${point.id}"]`)
    const flow = root.querySelector(`[data-flow="${point.id}"]`)
    const joint = root.querySelector(`[data-joint="${point.id}"]`)
    if (!card || !wire || !flow || !joint) return

    const dot = card.querySelector('.dot')
    const rect = dot.getBoundingClientRect()
    const endX = rect.left + rect.width / 2
    const endY = rect.top + rect.height / 2
    const shown = Math.min(1, Math.max(0, point.visible))
    const path = branchPath(point.x, point.y, endX, endY)
    wire.setAttribute('d', path)
    flow.setAttribute('d', path)
    const length = wire.getTotalLength()
    wire.style.strokeDasharray = `${length}`
    wire.style.strokeDashoffset = `${length * (1 - shown)}`
    wire.style.opacity = shown > 0.02 ? '1' : '0'
    flow.classList.toggle('is-live', shown > 0.94)
    joint.setAttribute('cx', point.x.toFixed(1))
    joint.setAttribute('cy', point.y.toFixed(1))
    joint.style.opacity = shown > 0.08 ? String(Math.min(1, shown * 1.4)) : '0'

    const lift = 1 - shown
    const drift = point.side === 'left' ? -26 * lift : 26 * lift
    card.style.opacity = String(shown)
    card.style.transform = `translate3d(${drift}px, ${18 * lift}px, 0) scale(${0.94 + shown * 0.06})`
    card.style.pointerEvents = shown > 0.65 ? 'auto' : 'none'
  })
}

export default function App() {
  const [progress, setProgress] = useState(0)
  const [concept, setConcept] = useState(CONCEPTS[0].id)
  const field = useRef(null)
  useJourneyInput()

  useEffect(() => {
    document.documentElement.dataset.concept = concept
  }, [concept])

  useEffect(() => subscribeJourney(setProgress), [])
  useEffect(() => bindPainter((points) => paintLinks(field.current, points)), [])

  const open = dossierOpen(progress)
  const hint = progress < 0.03 ? 1 : progress > 0.16 ? 0 : 1 - (progress - 0.03) / 0.13

  return (
    <>
      <Canvas
        className="stage"
        camera={{ fov: 30, near: 0.1, far: 160, position: [0, 1.15, 13.2] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <GlobeScene concept={concept} />
        </Suspense>
      </Canvas>
      <div className="veil" style={{ opacity: 0.75 + open * 0.25 }} />

      <button className="mark" type="button" onClick={() => setTarget(0)}>
        <strong>원일점</strong>
        <em>APHELION</em>
      </button>

      <div className="tools">
        <div className="concepts" role="group" aria-label="행성 형태">
          {CONCEPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={concept === item.id ? 'is-on' : ''}
              aria-pressed={concept === item.id}
              onClick={() => setConcept(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="jump" type="button" onClick={() => setTarget(1)}>
          지역
        </button>
      </div>

      <p className="hint" style={{ opacity: hint }}>
        스크롤
        <i />
      </p>

      <div className="field" ref={field}>
        <svg className="wires" aria-hidden="true">
          {REGIONS.map((region) => (
            <g key={region.id}>
              <path data-wire={region.id} className="wire-base" />
              <path data-flow={region.id} className="wire-flow" />
              <circle data-joint={region.id} r="2.4" />
            </g>
          ))}
        </svg>
        {REGIONS.map((region) => (
          <article
            key={region.id}
            className="card"
            data-region={region.id}
            data-side={region.side}
            data-slot={region.slot}
          >
            <i className="dot" />
            <p className="kicker">{region.kicker}</p>
            <h2>{region.title}</h2>
            <p className="body">{region.text}</p>
          </article>
        ))}
      </div>

      <p className="credit" style={{ opacity: 1 - open * 0.85 }}>
        {concept === 'graticule' ? (
          <>
            해안선{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
              Natural Earth
            </a>
          </>
        ) : (
          <>
            구체 텍스처{' '}
            <a href="https://github.com/dataarts/webgl-globe" target="_blank" rel="noreferrer">
              WebGL Globe
            </a>
            {' · '}
            <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noreferrer">
              Apache 2.0
            </a>
          </>
        )}
      </p>

      <p className="sr-only">
        스크롤하면 구체가 다가오며 회전하고, 표면의 지점에서 지역 기록이 선으로 이어집니다. 대기와
        경위선 버튼으로 행성 형태를 바꿀 수 있습니다.
      </p>
      <Loader />
    </>
  )
}
