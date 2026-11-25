import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import GlobeScene from './experience/Globe'
import { bindPainter } from './experience/links'
import { CONCEPTS } from './experience/concepts'
import { REGIONS } from './experience/regions'
import { dossierOpen, setTarget, subscribeJourney } from './experience/journey'
import { copy } from './copy'
import { GlobeHud } from './components/GlobeHud'
import { useLenisScroll } from './hooks/useLenisScroll'
import { useSmoothPointer } from './hooks/useSmoothPointer'
import { DoorScene, EnterScene, PracticeStage, WorkStage } from './scenes'

function Loader() {
  const { progress, active, total } = useProgress()
  const ready = total > 0 && !active && progress === 100
  if (ready) return null

  return (
    <div className="loader" role="status">
      <strong>{copy.brand}</strong>
      <span>{total === 0 ? copy.loader : `${Math.round(progress)}%`}</span>
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
    const margin = 12
    const width = card.offsetWidth
    const onRight = point.x >= window.innerWidth * 0.5
    const preferred = onRight ? point.x + 16 : point.x - width - 16
    const x = Math.min(window.innerWidth - width - margin, Math.max(margin, preferred))
    card.dataset.side = x > point.x ? 'right' : 'left'
    const y = Math.min(window.innerHeight - card.offsetHeight - 72, Math.max(72, point.y - 26))
    const scale = Number.isFinite(point.scale) ? point.scale : 1
    card.style.opacity = String(shown)
    card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
  })
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function localProgress(node, view) {
  if (!node) return 0
  const rect = node.getBoundingClientRect()
  const total = Math.max(1, node.offsetHeight - view)
  return clamp01(-rect.top / total)
}

export default function App() {
  const [journey, setJourney] = useState(0)
  const [concept, setConcept] = useState(CONCEPTS[0].id)
  const [play, setPlay] = useState({ active: 0, local: [0, 0, 0, 0, 0], reveal: 0, armed: false })
  const [covering, setCovering] = useState(false)
  const field = useRef(null)
  const scenes = useRef([])
  const swapLock = useRef(false)
  const measureRef = useRef(() => {})

  const { scrollTo } = useLenisScroll(() => measureRef.current())
  useSmoothPointer()

  useEffect(() => {
    document.documentElement.dataset.concept = concept
  }, [concept])

  useEffect(() => subscribeJourney(setJourney), [])
  useEffect(() => bindPainter((points) => paintCards(field.current, points)), [])

  useEffect(() => {
    let frame = 0
    const measure = () => {
      const view = window.innerHeight
      const local = scenes.current.map((node) => localProgress(node, view))
      let active = 0
      scenes.current.forEach((node, index) => {
        if (!node) return
        const rect = node.getBoundingClientRect()
        if (rect.top <= view * 0.4 && rect.bottom >= view * 0.6) active = index
      })
      const globe = scenes.current[4]
      const globeRect = globe?.getBoundingClientRect()
      const inGlobe = globeRect ? globeRect.top < view * 0.45 : false
      const reveal = inGlobe ? 1 : clamp01((local[3] - 0.48) / 0.42)
      const armed = globeRect ? globeRect.top <= view * 0.08 && globeRect.bottom >= view * 0.8 : false
      setTarget((inGlobe ? local[4] : reveal * 0.35) * 0.16)
      setPlay((current) => {
        const sameActive = current.active === active
        const sameReveal = Math.abs(current.reveal - reveal) < 0.01
        const sameArmed = current.armed === armed
        const sameLocal = current.local.every((value, index) => Math.abs(value - local[index]) < 0.004)
        if (sameActive && sameReveal && sameArmed && sameLocal) return current
        return { active, local, reveal, armed }
      })
      document.documentElement.classList.toggle('is-globe', armed)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    measureRef.current = measure
    measure()

    window.addEventListener('resize', onScroll)
    if (reduced) window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onScroll)
      if (reduced) window.removeEventListener('scroll', onScroll)
      measureRef.current = () => {}
      document.documentElement.classList.remove('is-globe')
    }
  }, [])

  const selectConcept = (id) => {
    if (id === concept || swapLock.current) return
    swapLock.current = true
    document.documentElement.classList.add('theme-switching')
    setCovering(true)
    window.setTimeout(() => {
      setConcept(id)
      window.setTimeout(() => {
        setCovering(false)
        swapLock.current = false
        window.setTimeout(() => document.documentElement.classList.remove('theme-switching'), 850)
      }, 260)
    }, 240)
  }

  const goToScene = (index) => {
    const node = scenes.current[index]
    if (node) scrollTo(node, { offset: 0 })
  }

  const door = play.local[3]
  const open = dossierOpen(journey)
  const stylesOn = play.reveal > 0.65

  return (
    <>
      <Canvas
        className="stage"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: play.reveal,
        }}
        camera={{ fov: 30, near: 0.1, far: 160, position: [0, 1.15, 9.8] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <GlobeScene concept={concept} armed={play.armed} />
        </Suspense>
      </Canvas>
      <div className="veil" style={{ opacity: play.reveal * (0.75 + open * 0.25) }} />
      <div className="face-cover" style={{ opacity: covering ? 1 : 0 }} />

      <button className="mark" type="button" onClick={() => scrollTo(0)}>
        {copy.brand}
      </button>

      <div className="chrome-right">
        <div className="scene-nav" role="tablist" aria-label="Scenes">
          {copy.scenes.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={play.active === index}
              className={play.active === index ? 'is-on' : ''}
              onClick={() => goToScene(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="tools"
          style={{ opacity: play.reveal, pointerEvents: stylesOn ? 'auto' : 'none' }}
        >
          <div className="concepts" role="group" aria-label={copy.stylesLabel}>
            {CONCEPTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={concept === item.id ? 'is-on' : ''}
                aria-pressed={concept === item.id}
                tabIndex={stylesOn ? 0 : -1}
                onClick={() => selectConcept(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main>
        <section
          className="scene scene-solid scene-enter"
          ref={(node) => {
            scenes.current[0] = node
          }}
        >
          <div className="scene-sticky">
            <EnterScene progress={play.local[0]} />
          </div>
        </section>

        <section
          className="scene scene-solid"
          ref={(node) => {
            scenes.current[1] = node
          }}
        >
          <div className="scene-sticky">
            <PracticeStage progress={play.local[1]} />
          </div>
        </section>

        <section
          className="scene scene-solid scene-work"
          ref={(node) => {
            scenes.current[2] = node
          }}
        >
          <div className="scene-sticky">
            <WorkStage progress={play.local[2]} />
          </div>
        </section>

        <section
          className="scene scene-door"
          ref={(node) => {
            scenes.current[3] = node
          }}
          style={{ background: `rgba(0, 0, 0, ${1 - clamp01((door - 0.5) / 0.4)})` }}
        >
          <div className="scene-sticky">
            <DoorScene progress={play.local[3]} />
          </div>
        </section>

        <section
          className="scene scene-globe"
          ref={(node) => {
            scenes.current[4] = node
          }}
          aria-label={copy.officesLabel}
        >
          <div className="scene-sticky globe-sticky">
            <div className="globe-copy">
              <h2>{copy.officesLabel}</h2>
              <p>{copy.drag}</p>
            </div>
            <p className="contact">
              {copy.contact}
              <a className="slot-btn contact-mail" href={`mailto:${copy.email}`}>
                <span className="slot-btn__mask">
                  <span className="slot-btn__a">{copy.email}</span>
                  <span className="slot-btn__b">{copy.contact}</span>
                </span>
              </a>
            </p>
            <GlobeHud armed={play.armed} visible={play.reveal > 0.2} />
          </div>
        </section>
      </main>

      <div className="field" ref={field} style={{ opacity: play.reveal }} aria-hidden={play.reveal < 0.5}>
        {REGIONS.map((region) => (
          <article key={region.id} className="card" data-region={region.id}>
            <i className="dot" />
            <p className="kicker">{region.kicker}</p>
            <h2>{region.title}</h2>
            <p className="body">{region.text}</p>
          </article>
        ))}
      </div>

      <p className="credit" style={{ opacity: play.reveal * (1 - open * 0.85) }}>
        {concept === 'graticule' ? (
          <>
            {copy.coastlines}{' '}
            <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
              Natural Earth
            </a>
          </>
        ) : (
          <>
            {copy.globeTexture}{' '}
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

      <p className="sr-only">{copy.assist}</p>
      <Loader />
    </>
  )
}
