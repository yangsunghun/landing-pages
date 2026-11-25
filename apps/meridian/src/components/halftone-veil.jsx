import { useEffect, useRef, useState } from 'react'

function paintHalftone(ctx, width, height) {
  const step = 5
  ctx.clearRect(0, 0, width, height)
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const n = Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1)
      const radius = step * (0.08 + n * 0.3)
      ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + n * 0.07})`
      ctx.beginPath()
      ctx.arc(x + step * 0.5, y + step * 0.5, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function HalftoneVeil() {
  const canvasRef = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => setActive(document.documentElement.classList.contains('theme-switching'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!active) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintHalftone(ctx, window.innerWidth, window.innerHeight)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [active])

  if (!active) return null

  return <canvas ref={canvasRef} className="halftone-veil" aria-hidden="true" />
}