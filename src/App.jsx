import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import GlobeScene from './experience/Globe'
import { POSTS } from './experience/posts'
import { boardOpen, nudgeTarget, setTarget, subscribeJourney } from './experience/journey'

function useJourneyInput() {
  useEffect(() => {
    const onWheel = (event) => {
      const board = event.target.closest?.('.board')
      if (board && board.scrollHeight > board.clientHeight + 4) {
        const atTop = board.scrollTop <= 0
        const atBottom = board.scrollTop + board.clientHeight >= board.scrollHeight - 4
        const scrollingInside = (event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)
        if (scrollingInside) return
      }
      event.preventDefault()
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      nudgeTarget(event.deltaY * line * 0.00036)
    }

    const onKey = (event) => {
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault()
        nudgeTarget(0.07)
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault()
        nudgeTarget(-0.07)
      } else if (event.key === 'Home') {
        setTarget(0)
      } else if (event.key === 'End') {
        setTarget(1)
      }
    }

    let lastY = null
    const onTouchStart = (event) => {
      if (event.target.closest('a, button, .board')) {
        lastY = null
        return
      }
      lastY = event.touches[0].clientY
    }
    const onTouchMove = (event) => {
      if (lastY == null) return
      const y = event.touches[0].clientY
      nudgeTarget((lastY - y) * 0.0015)
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

function Board({ open }) {
  return (
    <section
      className="board"
      style={{
        opacity: open,
        transform: `translateY(${(1 - open) * 56}px)`,
        pointerEvents: open > 0.45 ? 'auto' : 'none',
      }}
      aria-hidden={open < 0.35}
    >
      <header>
        <p>Board</p>
        <h2>게시판</h2>
      </header>
      <ol>
        {POSTS.map((post) => (
          <li key={post.no}>
            <span>{post.no}</span>
            <div>
              <strong>{post.title}</strong>
              <em>{post.text}</em>
            </div>
            <time>{post.date}</time>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function App() {
  const [progress, setProgress] = useState(0)
  useJourneyInput()

  useEffect(() => subscribeJourney(setProgress), [])

  const open = boardOpen(progress)
  const hint = progress < 0.04 ? 1 : progress > 0.22 ? 0 : 1 - (progress - 0.04) / 0.18

  return (
    <>
      <Canvas
        className="stage"
        camera={{ fov: 30, near: 0.1, far: 40, position: [0, 0.15, 7.4] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#000000']} />
        <Suspense fallback={null}>
          <GlobeScene />
        </Suspense>
      </Canvas>
      <div className="veil" />

      <button className="mark" type="button" onClick={() => setTarget(0)}>
        <strong>원일점</strong>
        <em>APHELION</em>
      </button>

      <button className="jump" type="button" onClick={() => setTarget(1)}>
        게시판
      </button>

      <p className="hint" style={{ opacity: hint }}>
        스크롤
        <i />
      </p>

      <Board open={open} />

      <p className="credit" style={{ opacity: 1 - open }}>
        지구 텍스처{' '}
        <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noreferrer">
          Solar System Scope
        </a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
      </p>

      <p className="sr-only">
        스크롤하면 행성이 회전하고, 이어서 게시판이 나타납니다. 게시판 버튼으로 바로 열 수 있습니다.
      </p>
      <Loader />
    </>
  )
}
