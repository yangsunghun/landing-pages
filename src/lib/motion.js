export function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

export function lerp(current, target, amount) {
  return current + (target - current) * amount
}

export function easeInOutSine(t) {
  const x = clamp01(t)
  return -(Math.cos(Math.PI * x) - 1) / 2
}

export function revealedByProgress(progress, total, start, end) {
  const local = clamp01((progress - start) / Math.max(0.0001, end - start))
  return Math.ceil(local * total)
}