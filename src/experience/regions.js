export const LOCK_Y = (-105 * Math.PI) / 180

export const REGIONS = [
  {
    id: 'north',
    lat: 52,
    lng: 10,
    side: 'left',
    slot: 'nw',
    kicker: '52°N  ·  10°E',
    title: '북해 연안',
    text: '얕은 바다와 낮은 구름이 겹치는 가장자리.',
  },
  {
    id: 'west',
    lat: 18,
    lng: -18,
    side: 'left',
    slot: 'sw',
    kicker: '18°N  ·  18°W',
    title: '서안 사구',
    text: '모래가 바다 쪽으로 기울어진 건조한 면.',
  },
  {
    id: 'east',
    lat: 24,
    lng: 48,
    side: 'right',
    slot: 'ne',
    kicker: '24°N  ·  48°E',
    title: '동쪽 고원',
    text: '해가 오래 머무는 건조한 고지.',
  },
  {
    id: 'south',
    lat: -28,
    lng: 22,
    side: 'right',
    slot: 'se',
    kicker: '28°S  ·  22°E',
    title: '남쪽 대지',
    text: '평평하고 어두운 내륙. 바람이 먼저 도착한다.',
  },
]

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
