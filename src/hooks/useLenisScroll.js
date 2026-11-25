import { useEffect, useRef } from 'react'

export function useLenisScroll(onScroll) {
  const lenisRef = useRef(null)
  const onScrollRef = useRef(onScroll)

  useEffect(() => {
    onScrollRef.current = onScroll
  }, [onScroll])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return undefined

    let lenis = null
    let frame = 0
    let disposed = false

    const boot = async () => {
      const { default: Lenis } = await import('lenis')
      if (disposed) return
      lenis = new Lenis({
        autoRaf: false,
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.2,
      })
      lenisRef.current = lenis

      const tick = (time) => {
        lenis.raf(time)
        onScrollRef.current?.()
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      onScrollRef.current?.()
    }

    boot()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      lenis?.destroy()
      lenisRef.current = null
    }
  }, [])

  const scrollTo = (target, options) => {
    const node = typeof target === 'number' ? null : target
    if (lenisRef.current) {
      if (node) lenisRef.current.scrollTo(node, options)
      else lenisRef.current.scrollTo(target, options)
    } else if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }

  return { lenisRef, scrollTo }
}