import { useEffect, useState } from 'react'
import { OdometerReadout } from './OdometerReadout'
import { REGIONS } from '../experience/regions'
import { subscribeActiveRegion } from '../experience/activeRegion'

function formatLng(lng) {
  const abs = Math.abs(lng).toFixed(1)
  const hem = lng >= 0 ? 'E' : 'W'
  return `${abs}°${hem}`
}

export function GlobeLeadout({ armed, reveal }) {
  const [active, setActive] = useState({ id: null, facing: 0 })

  useEffect(() => subscribeActiveRegion(setActive), [])

  if (reveal < 0.35 || !armed) return null
  const region = REGIONS.find((item) => item.id === active.id)
  if (!region) return null

  return (
    <p className="globe-leadout" style={{ opacity: active.facing }}>
      <span className="globe-leadout__city">{region.title}</span>
      <span className="globe-leadout