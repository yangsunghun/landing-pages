import { useEffect, useRef } from 'react'

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
  const sizeRef = useRef({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const draw = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      if (sizeRef.current.width === width && sizeRef.current.height === height) return
      sizeRef.current = { width, height }
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintHalftone(ctx, width, height)
    }

    let resizeFrame = 0
    const onResize = () => {
      cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(draw)
    }

    const bootstrap = () => draw()
    let idleId
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(bootstrap, { timeout: 2500 })
    } else {
      idleId = window.setTimeout(bootstrap, 120)
    }

    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(resizeFrame)
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId)
      else window.clearTimeout(idleId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="halftone-veil" aria-hidden="true" />
}