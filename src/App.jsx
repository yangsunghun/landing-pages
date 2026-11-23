import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import Space from './experience/Space'
import {
  NAV,
  activeNav,
  nudgeTarget,
  setTarget,
  subscribeJourney,
  visibleCaption,
} from './experience/journey'

function useJourneyInput() {
  useEffect(() => {
    const onWheel = (event) => {
      event.preventDefault()
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      nudgeTarget(event.deltaY * line * 0.00042)
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
      lastY = event.touches[0].clientY
    }
    const onTouchMove = (event) => {
      if (lastY == null) return
      const y = event.touches[0].clientY
      nudgeTarget((lastY - y) * 0.00135)
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

function useDrone(enabled) {
  const drone = useRef(null)

  useEffect(() => {
    const fade = (value) => {
      const node = drone.current
      if (!node) return
      const now = node.ctx.currentTime
      node.master.gain.cancelScheduledValues(now)
      node.master.gain.linearRampToValueAtTime(value, now + 0.6)
    }

    if (!enabled) {
      fade(0)
      return undefined
    }

    if (!drone.current) {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = 0
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 380
      filter.connect(master)
      master.connect(ctx.destination)

      const tone = (frequency, type, level) => {
        const oscillator = ctx.createOscillator()
        oscillator.type = type
        oscillator.frequency.value = frequency
        const gain = ctx.createGain()
        gain.gain.value = level
        oscillator.connect(gain)
        gain.connect(filter)
        oscillator.start()
        return oscillator
      }

      const voices = [tone(52, 'sine', 0.28), tone(78, 'sine', 0.09), tone(104, 'triangle', 0.035)]
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer
      noise.loop = true
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = 0.035
      noise.connect(noiseGain)
      noiseGain.connect(filter)
      noise.start()
      drone.current = { ctx, master, voices, noise }
    }

    drone.current.ctx.resume()
    fade(0.2)

    return () => fade(0)
  }, [enabled])

  useEffect(() => {
    return () => {
      const node = drone.current
      if (!node) return
      node.voices.forEach((voice) => voice.stop())
      node.noise.stop()
      node.ctx.close()
    }
  }, [])
}

function Cursor() {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    const onMove = (event) => {
      node.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return <div ref={ref} className="cursor" />
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

function Hud() {
  const [progress, setProgress] = useState(0)
  const [sound, setSound] = useState(false)
  const caption = visibleCaption(progress)
  const current = activeNav(progress)
  const hintOpacity = progress < 0.02 ? 1 : progress > 0.16 ? 0 : 1 - (progress - 0.02) / 0.14
  const coarse =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  useDrone(sound)

  useEffect(() => subscribeJourney(setProgress), [])

  return (
    <>
      <button className="mark" type="button" onClick={() => setTarget(0)}>
        <strong>원일점</strong>
        <em>APHELION</em>
      </button>

      <div className="nav-wrap">
        <button
          className="sound"
          type="button"
          aria-pressed={sound}
          onClick={() => setSound((value) => !value)}
        >
          {sound ? '소리 켜짐' : '소리'}
        </button>
        <nav className="nav" aria-label="행성">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={current === item.id}
              onClick={() => setTarget(item.t)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <p className="hint" style={{ opacity: hintOpacity }}>
        {coarse ? '위로 밀어 올리기' : '스크롤'}
        <i />
      </p>

      {caption ? (
        <div className="caption" key={caption.title}>
          <span>{caption.index}</span>
          <h1>{caption.title}</h1>
          <p>{caption.text}</p>
        </div>
      ) : null}

      <div className="track" aria-hidden="true">
        <i style={{ top: `${progress * 100}%` }} />
      </div>

      <p className="credit">
        텍스처{' '}
        <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
          Solar System Scope
        </a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
      </p>

      <p className="sr-only">
        스크롤하거나 행성 이름을 눌러 지구, 달, 화성, 토성으로 다가갑니다. 소리 버튼은 낮은
        드론을 켭니다.
      </p>
    </>
  )
}

export default function App() {
  useJourneyInput()

  return (
    <>
      <Canvas
        className="stage"
        camera={{ fov: 42, near: 0.08, far: 180, position: [0.18, 0.36, 4.7] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
        }}
      >
        <Suspense fallback={null}>
          <Space />
        </Suspense>
      </Canvas>
      <div className="veil" />
      <div className="grain" />
      <Hud />
      <Cursor />
      <Loader />
    </>
  )
}
