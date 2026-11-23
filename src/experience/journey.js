const state = {
  target: 0,
  progress: 0,
}

const listeners = new Set()
let lastEmit = 0

export function getJourney() {
  return state
}

export function setTarget(value) {
  state.target = Math.min(1, Math.max(0, value))
}

export function nudgeTarget(delta) {
  setTarget(state.target + delta)
}

export function commitProgress(value) {
  state.progress = value
  if (Math.abs(value - lastEmit) > 0.0012 || Math.abs(state.target - value) < 0.0006) {
    lastEmit = value
    listeners.forEach((listener) => listener(value))
  }
}

export function subscribeJourney(listener) {
  listeners.add(listener)
  listener(state.progress)
  return () => listeners.delete(listener)
}

export function boardOpen(progress) {
  const start = 0.58
  const t = (progress - start) / (1 - start)
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}
