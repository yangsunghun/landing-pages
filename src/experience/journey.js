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

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function diveAmount(progress) {
  return smoothstep(progress / 0.64)
}

export function regionOpen(progress, index) {
  return smoothstep((progress - (0.6 + index * 0.07)) / 0.13)
}

export function dossierOpen(progress) {
  return smoothstep((progress - 0.58) / 0.24)
}
