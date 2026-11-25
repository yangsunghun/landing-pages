import { useEffect } from 'react'

export function useHeaderOnDark(sectionRefs) {
  useEffect(() => {
    const nodes = sectionRefs.current.filter((node) => node?.hasAttribute('data-section-dark'))
    if (!nodes.length) return undefined

    const headerBand = 56

    const observer = new IntersectionObserver(
      (entries) => {
        const lit = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.06)
        document.documentElement.classList.toggle('chrome-on-dark', lit)
      },
      {
        root: null,
        rootMargin: `-${headerBand}px 0px -${Math.max(0, window.innerHeight - headerBand - 2)}px 0px`,
        threshold: [0, 0.08, 0.2],
      },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sectionRefs])
}