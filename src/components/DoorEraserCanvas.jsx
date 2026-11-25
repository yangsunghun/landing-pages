import { useEffect, useRef } from 'react'
import { clamp01 } from '../lib/motion'

function punchHole(ctx, x, y, radius) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
  g.addColorStop(0.55, 'rgba(255, 255, 255, 0.38)')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

export function DoorEraserCanvas({ progress, reveal, opacity, hole, live = true }) {
  const view = useRef(null)
  const trail = useRef(null)
  const pointer = useRef({ x: 0.5, y: 0.46 })
  const size = useRef({ w: 0, h: 0 })

  useEffect(() => {
    if (!live || opacity < 0.02) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none)').matches
    if (reduced || coarse) return undefined

    const canvas = view.current
    const trailEl = document.createElement('canvas')
    trail.current = trailEl

    const onMove = (event) => {
      const { w, h } = size.current
      if (!w) return
      pointer.current.x = event.clientX / w
      pointer.current.y = event.clientY / h
    }

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      size.current = { w, h, dpr }
      if (canvas) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      trailEl.width = Math.floor(w * dpr)
      trailEl.height = Math.floor(h * dpr)
      const trailCtx = trailEl.getContext('2d')
      trailCtx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      trailCtx?.clearRect(0, 0, w, h)
    }

    layout()

    let frame = 0
    let running = true

    const tick = () => {
      if (!running || !canvas) return
      const { w, h, dpr } = size.current
      const trailCtx = trailEl.getContext('2d')
      const out = canvas.getContext('2d')
      if (!trailCtx || !out) return

      trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      trailCtx.globalCompositeOperation = 'source-over'
      trailCtx.fillStyle = 'rgba(0, 0, 0, 0.055)'
      trailCtx.fillRect(0, 0, w, h)

      const px =
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px-smooth')) || 0
      const py =
        Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--py-smooth')) || 0

      const cx = (0.5 + px * 0.07) * w
      const cy = (0.46 + py * 0.05) * h
      const openR = (0.14 + hole * 0.5) * Math.min(w, h)
      const ptrX = pointer.current.x * w
      const ptrY = pointer.current.y * h
      const brushR = 38 + Math.hypot(px, py) * 26

      trailCtx.globalCompositeOperation = 'source-over'
      punchHole(trailCtx, ptrX, ptrY, brushR)

      out.setTransform(dpr, 0, 0, dpr, 0, 0)
      out.clearRect(0, 0, w, h)
      out.globalAlpha = opacity
      out.fillStyle = '#000'
      out.fillRect(0, 0, w, h)
      out.globalCompositeOperation = 'destination-out'
      punchHole(out, cx, cy, openR * clamp01(progress / 0.12 + reveal * 0.35))
      out.drawImage(trailEl, 0, 0, w * dpr, h * dpr, 0, 0, w, h)
      out.globalCompositeOperation = 'source-over'
      out.globalAlpha = 1

      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('resize', layout)
    frame = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', layout)
      trail.current = null
    }
  }, [progress, reveal, opacity, hole, live])

  if (opacity < 0.02) return null

  return <canvas ref={view} className="door-eraser-canvas" aria-hidden="true" />
}