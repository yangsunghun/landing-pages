const state = { id: null, facing: 0 }
const listeners = new Set()

export function setActiveRegion(id, facing = 0) {
  const nextId = id && facing > 0.2 ? id : null
  const nextFacing = nextId ? facing : 0
  if (state.id === nextId && Math.abs(state.facing - nextFacing) < 0.02) return
  state.id = nextId
  state.facing = nextFacing
  listeners.forEach((listener) => listener(state))
}

export function subscribeActiveRegion(listener) {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}