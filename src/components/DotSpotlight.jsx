import { useEffect, useRef } from 'react'

export function DotSpotlight({ active = true }) {
  const root = useRef(null)
  const lit = useRef({ x: '50%', y: '50%' })

  useEffect(() => {
    const node = root.current
    if (!node || !active) return undefined

    const coarse = window.matchMedia('(hover: none)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduce) {
      node.classList.remove('is-active')
      return undefined
    }

    const stage = node.closest('.enter-stage') ?? node.parentElement ?? node

    const onMove = (event) => {
      const rect = stage.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      node.style.setProperty('--dot-x', `${x}%`)
      node.style.setProperty('--dot-y', `${y}%`)
      node.style.setProperty('--lit-x', `${x}%`)
      node.style.setProperty('--lit-y', `${y}%`)
      lit.current = { x: `${x}%`, y: `${y}%` }
      node.classList.add('is-active')
    }

    const onLeave = () => {
      node.style.setProperty('--dot-x', '50%')
      node.style.setProperty('--dot-y', '50%')
      node.classList.remove('is-active')
    }

    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [active])

  return <div ref={root} className="dot-spotlight" aria-hidden="true" />
}