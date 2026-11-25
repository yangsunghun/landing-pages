import { useEffect, useRef } from 'react'
import { lerp } from '../lib/motion'

export function useSmoothPointer(enabled = true, amount = 0.08) {
  const smooth = useRef({ x: 0, y: 0, frame: 0 })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none)').matches
    if (reduced) return undefined

    const target = { x: 0, y: 0 }
    const follow = coarse ? 1 : amount
    const smoothOn = enabled

    const onMove = (event) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1
      target.y = (event.clientY / window.innerHeight) * 2 - 1
      document.documentElement.style.setProperty('--px', target.x.toFixed(3))
      document.documentElement.style.setProperty('--py', target.y.toFixed(3))
      if (!smoothOn) {
        document.documentElement.style.setProperty('--px-smooth', target.x.toFixed(3))
        document.documentElement.style.setProperty('--py-smooth', target.y.toFixed(3))
      }
    }

    window.addEventListener('pointermove', onMove)

    if (!smoothOn) {
      return () => window.removeEventListener('pointermove', onMove)
    }

    let frame = 0
    const tick = () => {
      smooth.current.x = lerp(smooth.current.x, target.x, follow)
      smooth.current.y = lerp(smooth.current.y, target.y, follow)
      document.documentElement.style.setProperty('--px-smooth', smooth.current.x.toFixed(3))
      document.documentElement.style.setProperty('--py-smooth', smooth.current.y.toFixed(3))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [amount, enabled])
}