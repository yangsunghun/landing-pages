import { CanvasTexture } from 'three'
import coastlines from './coastline-110m.json'
import land from './land-110m.json'
import { anchorPosition } from './regions'

const bundleCache = new Map()

export function getGraticuleBundle(radius) {
  if (bundleCache.has(radius)) return bundleCache.get(radius)
  const landMap = new CanvasTexture(buildLandCanvas())
  landMap.flipY = true
  landMap.needsUpdate = true
  const bundle = {
    grid: buildGraticulePositions(radius),
    coast: buildCoastPositions(radius * 1.006),
    landMap,
  }
  bundleCache.set(radius, bundle)
  return bundle
}

export function warmupGraticule(radius) {
  getGraticuleBundle(radius)
}

function pushPoint(out, lat, lng, radius) {
  const [x, y, z] = anchorPosition(lat, lng, radius)
  out.push(x, y, z)
}

export function buildGraticulePositions(radius) {
  const out = []
  const step = 20
  const segment = 4
  for (let lat = -80; lat <= 80; lat += step) {
    for (let lng = -180; lng < 180; lng += segment) {
      pushPoint(out, lat, lng, radius)
      pushPoint(out, lat, lng + segment, radius)
    }
  }
  for (let lng = -180; lng < 180; lng += step) {
    for (let lat = -80; lat < 80; lat += segment) {
      pushPoint(out, lat, lng, radius)
      pushPoint(out, lat + segment, lng, radius)
    }
  }
  return new Float32Array(out)
}

export function buildCoastPositions(radius) {
  const out = []
  for (const feature of coastlines.features) {
    const line = feature.geometry.coordinates
    for (let i = 1; i < line.length; i += 1) {
      const [lng0, lat0] = line[i - 1]
      const [lng1, lat1] = line[i]
      if (Math.abs(lng1 - lng0) > 35 || Math.abs(lat1 - lat0) > 35) continue
      pushPoint(out, lat0, lng0, radius)
      pushPoint(out, lat1, lng1, radius)
    }
  }
  return new Float32Array(out)
}

export function buildLandCanvas(width = 2048, height = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#ffffff'
  context.beginPath()
  for (const feature of land.features) {
    for (const ring of feature.geometry.coordinates) {
      ring.forEach(([lng, lat], index) => {
        const x = ((lng + 180) / 360) * width
        const y = ((90 - lat) / 180) * height
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.closePath()
    }
  }
  context.fill('evenodd')
  return canvas
}
