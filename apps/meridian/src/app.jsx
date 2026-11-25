import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import GlobeScene from './experience/globe'
import { bindPainter } from './experience/links'
import { CONCEPTS } from './experience/concepts'
import { REGIONS } from './experience/regions'
import { dossierOpen, setTarget, subscribeJourney } from './experience/journey'
import { copy } from './copy'
import { ConceptTools } from './components/concept-tools'
import { SlotButton } from './components/slot-button'
import { CurtainLoader } from './components/curtain-loader'
import { setActiveRegion } from './experience/active-region'
import { HalftoneVeil } from './components/halftone-veil'
import { SceneNav } from './components/scene-nav'
import { useHeaderOnDark } from './hooks/use-header-on-dark'
import { useLenisScroll } from './hooks/use-lenis-scroll'
import { useSceneInView } from './hooks/use-scene-in-view'
import { useSmoothPointer } from './hooks/use-smooth-pointer'
import { bindIntroGate } from './lib/intro-gate'
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
  if (!root) {
    setActiveRegion(null, 0)
    return
  }
  if (!points.length) {
    setActiveRegion(null, 0)
    return
  }
  const ranked = [...points].sort((a, b) => b.facing - a.facing)
  const lead = ranked[0]
  setActiveRegion(lead?.id, lead?.facing ?? 0)
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
  const [introBurst, setIntroBurst] = useState(0)
  const field = useRef(null)
  const scenes = useRef([])
  const swapLock = useRef(false)
  const measureRef = useRef(() => {})

  const { scrollTo, lenisRef } = useLenisScroll(() => measureRef.current())
  const sceneLive = useSceneInView(scenes)
  useHeaderOnDark(scenes)
  const smoothPointer = sceneLive.slice(0, 4).some(Boolean)
  useSmoothPointer(smoothPointer)

  useEffect(() => {
    document.documentElement.dataset.concept = concept
  }, [concept])

  useEffect(() => subscribeJourney(setJourney), [])
  useEffect(() => bindPainter((points) => paintCards(field.current, points)), [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || window.scrollY > 48) return undefined
    if (sessionStorage.getItem('meridian-intro-played')) return undefined

    let cleanup = () => {}
    let attempts = 0
    const wait = window.setInterval(() => {
      attempts += 1
      const lenis = lenisRef.current
      if (!lenis && attempts < 120) return
      window.clearInterval(wait)
      cleanup = bindIntroGate({
        lenis: lenis ?? null,
        onStart: () => {
          sessionStorage.setItem('meridian-intro-played', '1')
          setIntroBurst((value) => value + 1)
        },
      })
    }, 50)

    return () => {
      window.clearInterval(wait)
      cleanup()
    }
  }, [lenisRef])

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
      const doorReveal = clamp01((local[3] - 0.48) / 0.42)
      const globeReveal = clamp01((local[4] - 0.02) / 0.38)
      const reveal = Math.max(doorReveal, globeReveal)
      const armed = globeRect ? globeRect.top <= view * 0.08 && globeRect.bottom >= view * 0.8 : false
      const journeyDrive = Math.max(doorReveal * 0.42, local[4] * 0.9)
      setTarget(journeyDrive * 0.16)
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
    setConcept(id)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching')
        swapLock.current = false
      })
    })
  }

  const goToScene = (index) => {
    const node = scenes.current[index]
    if (node) scrollTo(node, { offset: 0 })
  }

  const door = play.local[3]
  const open = dossierOpen(journey)
  const stylesOn = play.reveal > 0.65
  const globeActive = play.reveal > 0.05 || door > 0.42 || play.armed

  return (
    <>
      <CurtainLoader />
      <HalftoneVeil />
      <Canvas
        className="stage"
        frameloop={globeActive ? 'always' : 'never'}
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
          <GlobeScene concept={concept} armed={play.armed} active={globeActive} />
        </Suspense>
      </Canvas>
      <div
        className={`veil${play.reveal > 0.32 ? ' is-globe-veil' : ''}`}
        style={{ opacity: play.reveal * (0.75 + open * 0.25) }}
      />
      <SlotButton className="mark scene-tab" labelA={copy.brand} labelB="TOP" onClick={() => scrollTo(0)} />

      <div className="chrome-right">
        <SceneNav labels={copy.scenes} active={play.active} onPick={goToScene} />
        <ConceptTools
          concept={concept}
          stylesOn={stylesOn}
          reveal={play.reveal}
          onSelect={selectConcept}
        />
      </div>

      <main>
        <section
          className="scene scene-solid scene-enter"
          ref={(node) => {
            scenes.current[0] = node
          }}
        >
          <div className="scene-sticky">
            <EnterScene progress={play.local[0]} live={sceneLive[0]} introBurst={introBurst} />
          </div>
        </section>

        <section
          className="scene scene-solid"
          ref={(node) => {
            scenes.current[1] = node
          }}
        >
          <div className="scene-sticky">
            <PracticeStage progress={play.local[1]} live={sceneLive[1]} />
          </div>
        </section>

        <section
          className="scene scene-solid scene-work"
          ref={(node) => {
            scenes.current[2] = node
          }}
        >
          <div className="scene-sticky">
            <WorkStage progress={play.local[2]} live={sceneLive[2]} />
          </div>
        </section>

        <section
          className="scene scene-door"
          data-section-dark=""
          ref={(node) => {
            scenes.current[3] = node
          }}
          style={{ background: `rgba(0, 0, 0, ${1 - clamp01((door - 0.5) / 0.4)})` }}
        >
          <div className="scene-sticky">
            <DoorScene progress={play.local[3]} reveal={play.reveal} live={sceneLive[3]} />
          </div>
        </section>

        <section
          className="scene scene-globe"
          data-section-dark=""
          ref={(node) => {
            scenes.current[4] = node
          }}
          aria-label={copy.officesLabel}
        >
          <div className="scene-sticky globe-sticky">
            <div className="globe-copy">
              <h2>{copy.officesLabel}</h2>
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

      <p className="sr-only">{copy.assist}</p>
      <Loader />
    </>
  )
}
