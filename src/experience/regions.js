import { copy } from '../copy'

export const LOCK_Y = (-105 * Math.PI) / 180

const PLACES = [
  { id: 'seoul', lat: 37.57, lng: 126.98 },
  { id: 'london', lat: 51.51, lng: -0.13 },
  { id: 'new-york', lat: 40.71, lng: -74.01 },
  { id: 'sao-paulo', lat: -23.55, lng: -46.63 },
  { id: 'singapore', lat: 1.35, lng: 103.82 },
  { id: 'sydney', lat: -33.87, lng: 151.21 },
]

export const REGIONS = PLACES.map((place, index) => ({
  ...place,
  ...copy.offices[index],
}))

export function anchorPosition(lat, lng, radius) {
  const phi = ((lng + 180) / 360) * Math.PI * 2
  const theta = ((90 - lat) * Math.PI) / 180
  const sinTheta = Math.sin(theta)
  return [
    -radius * Math.cos(phi) * sinTheta,
    radius * Math.cos(theta),
    radius * Math.sin(phi) * sinTheta,
  ]
}
