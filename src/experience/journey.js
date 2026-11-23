const state = {
  target: 0,
  progress: 0,
}

const listeners = new Set()
let lastEmit = 0

export const SUN = [-0.92, 0.28, 0.32]

export const BODIES = {
  earth: [0, 0, 0],
  moon: [2.25, 0.22, -0.55],
  mars: [5.35, -0.28, -1.35],
  saturn: [-5.15, 0.62, -3.55],
}

export const STOPS = [
  { t: 0, cam: [0.18, 0.36, 4.7], look: [0, 0.05, 0] },
  { t: 0.16, cam: [0.28, 0.16, 3.15], look: [0, 0.02, 0] },
  { t: 0.32, cam: [0.36, 0.14, 2.12], look: [0, 0.02, 0] },
  { t: 0.42, cam: [1.45, 0.7, 1.85], look: [1.1, 0.2, -0.2] },
  { t: 0.52, cam: [2.5, 0.4, 0.35], look: [2.25, 0.22, -0.55] },
  { t: 0.64, cam: [4.15, 0.72, 0.85], look: [5.2, -0.1, -1.1] },
  { t: 0.76, cam: [6.28, 0.08, -0.22], look: [5.35, -0.22, -1.35] },
  { t: 0.86, cam: [1.6, 2.35, 2.4], look: [-1.5, 0.45, -1.6] },
  { t: 0.93, cam: [-1.62, 1.15, -1.05], look: [-5.15, 0.55, -3.55] },
  { t: 1, cam: [1.35, 3.5, 12.6], look: [0.7, 0.15, -0.85] },
]

export const NAV = [
  { id: 'earth', label: '지구', t: 0.32 },
  { id: 'moon', label: '달', t: 0.52 },
  { id: 'mars', label: '화성', t: 0.76 },
  { id: 'saturn', label: '토성', t: 0.93 },
  { id: 'system', label: '궤도', t: 1 },
]

export const CAPTIONS = [
  { from: 0.1, to: 0.44, index: '01', title: '지구', text: '얇은 공기 한 겹을 두른 푸른 점' },
  { from: 0.44, to: 0.63, index: '02', title: '달', text: '가장 가까이 머무는 정적' },
  { from: 0.63, to: 0.84, index: '03', title: '화성', text: '식어 버린 붉은 낮' },
  { from: 0.84, to: 0.965, index: '04', title: '토성', text: '고리가 남긴 가장자리' },
  { from: 0.965, to: 1.02, index: '05', title: '궤도', text: '네 개의 세계, 한 장의 밤' },
]

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

export function samplePath(t) {
  const keys = STOPS
  if (t <= keys[0].t) return keys[0]
  const last = keys[keys.length - 1]
  if (t >= last.t) return last

  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t < a.t || t > b.t) continue
    const u = (t - a.t) / (b.t - a.t)
    const s = u * u * (3 - 2 * u)
    return {
      cam: a.cam.map((value, index) => value + (b.cam[index] - value) * s),
      look: a.look.map((value, index) => value + (b.look[index] - value) * s),
    }
  }

  return last
}

export function activeNav(progress) {
  if (progress < 0.2) return null
  if (progress < 0.44) return 'earth'
  if (progress < 0.63) return 'moon'
  if (progress < 0.84) return 'mars'
  if (progress < 0.965) return 'saturn'
  return 'system'
}

export function visibleCaption(progress) {
  return CAPTIONS.find((caption) => progress >= caption.from && progress < caption.to) ?? null
}
