import { useEffect, useState } from 'react'

export function useSceneInView(sectionRefs) {
  const [live, setLive] = useState([true, false, false, false, false, false, false])

  useEffect(() => {
    const nodes = sectionRefs.current.filter(Boolean)
    if (!nodes.length) return undefined

    const visible = new Set()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = nodes.indexOf(entry.target)
          if (index < 0) return
          if (entry.isIntersecting) visible.add(index)
          else visible.delete(index)
        })
        const next = nodes.map((_, index) => visible.has(index))
        setLive((current) =>
          current.length === next.length && current.every((value, i) => value === next[i])
            ? current
            : next,
        )
      },
      { root: null, rootMargin: '12% 0px 12% 0px', threshold: 0.08 },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sectionRefs])

  return live
}
