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

function paintCards(root, points) {
  if (!root) return
  const ranked = [...points].sort((a, b) => b.facing - a.facing)
  const placed = []
  ranked.forEach((point) => {
    const card = root.querySelector(`[data-region="${point.id}"]`)
    if (!card) return
    const crowded = placed.some((other) => Math.hypot(other.x - point.x, other.y - point.y) < 150)
    const shown = crowded ? 0 : Math.min(1, Math.max(0, point.facing))
    if (shown > 0.25) placed.push(point)
    const onRight = point.x >= window.innerWidth * 0.5
    card.dataset.side = onRight ? 'right' : 'left'
    const width = card.offsetWidth
    const x = onRight ? point.x + 16 : point.x - width - 16
    const y = point.y - 26
    const scale = Number.isFinite(point.scale) ? point.scale : 1
    card.style.opacity = String(shown)
    card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
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
  useEffect(() => bindPainter((points) => paintCards(field.current, points)), [])

  const open = dossierOpen(progress)
  const hint = progress < 0.03 ? 1 : progress > 0.16 ? 0 : 1 - (progress - 0.03) / 0.13

  return (
    <>
      <Canvas
        className="stage"
        camera={{ fov: 30, near: 0.1, far: 160, position: [0, 1.15, 9.8] }}
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
        <div className="concepts" role="group" aria-label="스타일">
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
        {REGIONS.map((region) => (
          <article key={region.id} className="card" data-region={region.id}>
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
        스크롤하면 구체가 다가오며 회전하고, 마우스로 돌리면 지역 카드가 표면과 함께 움직입니다.
        스타일 1, 2, 3 버튼으로 행성 형태를 바꿀 수 있습니다.
      </p>
      <Loader />
    </>
  )
}
