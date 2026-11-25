const LOCK_MS = 1500
const FAILSAFE_MS = 8000

export function bindIntroGate({ onStart, lenis }) {
  let triggered = false
  lenis?.stop()
  document.documentElement.classList.add('is-intro-locked')

  const release = () => {
    document.documentElement.classList.remove('is-intro-locked')
    lenis?.start()
  }

  const trigger = (event) => {
    if (triggered) return
    if (event?.cancelable) event.preventDefault()
    triggered = true
    cleanup()
    onStart?.()
    window.setTimeout(release, LOCK_MS)
  }

  const onKey = (e) => {
    if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) trigger(e)
  }

  const timer = window.setTimeout(() => trigger(), FAILSAFE_MS)
  window.addEventListener('wheel', trigger, { passive: false })
  window.addEventListener('touchmove', trigger, { passive: false })
  window.addEventListener('keydown', onKey)

  function cleanup() {
    window.clearTimeout(timer)
    window.removeEventListener('wheel', trigger)
    window.removeEventListener('touchmove', trigger)
    window.removeEventListener('keydown', onKey)
  }

  return cleanup
}