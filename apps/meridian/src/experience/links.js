let painter = () => {}

export function bindPainter(fn) {
  painter = fn
  return () => {
    if (painter === fn) painter = () => {}
  }
}

export function pushAnchors(points) {
  painter(points)
}
