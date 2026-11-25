import { useEffect, useRef } from 'react'
import { lerp } from '../lib/motion'

export function useSmoothPointer(amount = 0.08) {
  const smooth = useRef({ x: 0, y: 0, frame: 0 })

  useEffect(() => {
    const target = { x: 0, y: 0 }

    const onMove = (event) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1
      target.y = (event.clientY / window.innerHeight) * 2 - 1
      document.documentElement.style.setProperty('--px', target.x.toFixed(3))
      document.documentElement.style.setProperty('--py', target.y.toFixed(3))
    }

    let frame = 0
    const tick = () => {
      smooth.current.x = lerp(smooth.current.x, target.x, amount)
      smooth.current.y = lerp(smooth.current.y, target.y, amount)
      document.documentElement.style.setProperty('--px-smooth', smooth.current.x.toFixed(3))
      document.documentElement.style.setProperty('--py-smooth', smooth.current.y.toFixed(3))
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove)
    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [amount])
}