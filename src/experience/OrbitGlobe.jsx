import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { dossierOpen, getJourney } from './journey'

const RADIUS = 1.48

const greenVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const greenFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    float shade = texture2D(uMap, vUv).r;
    float land = 1.0 - smoothstep(0.008, 0.055, shade);
    vec3 ocean = vec3(0.05, 0.27, 0.36);
    vec3 ground = vec3(0.02, 0.15, 0.12);
    vec3 color = mix(ocean, ground, land);
    vec3 normal = normalize(vNormal);
    vec3 light = normalize(vec3(0.55, 0.32, 0.78));
    float ndl = clamp(dot(normal, light), 0.0, 1.0);
    float spec = pow(clamp(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 28.0);
    float rim = pow(1.0 - clamp(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 1.35);
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    color *= 0.34 + ndl * 0.82;
    color += vec3(0.52, 0.74, 0.9) * spec * 0.12 * (1.0 - land);
    color *= mix(1.0, 0.38, rim);
    color += (grain - 0.5) * 0.04;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

const streakVertex = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const streakFragment = /* glsl */ `
  uniform float uTime;
  uniform float uCount;
  uniform float uFade;
  varying float vT;
  void main() {
    float phase = fract(vT * uCount - uTime);
    float tail = smoothstep(0.62, 0.0, phase);
    float head = smoothstep(0.0, 0.02, phase) * smoothstep(0.16, 0.03, phase);
    float alpha = (0.035 + tail * 0.34 + head) * uFade;
    if (alpha < 0.02) discard;
    vec3 color = mix(vec3(0.55, 0.36, 0.12), vec3(1.0, 0.94, 0.74), clamp(head + tail * 0.35, 0.0, 1.0));
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

const RINGS = [
  { radius: 1.86, tilt: [1.2, 0.18, 0.42], speed: 0.11, count: 5 },
  { radius: 2.16, tilt: [0.62, -0.24, -0.7], speed: -0.07, count: 4 },
]

function makeRing(radius) {
  const segments = 320
  const positions = new Float32Array(segments * 3)
  const ts = new Float32Array(segments)
  for (let index = 0; index < segments; index += 1) {
    const t = index / segments
    const angle = t * Math.PI * 2
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = 0
    positions[index * 3 + 2] = Math.sin(angle) * radius
    ts[index] = t
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aT', new BufferAttribute(ts, 1))
  return geometry
}

export function GreenGlobe({ map }) {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <shaderMaterial
        vertexShader={greenVertex}
        fragmentShader={greenFragment}
        uniforms={{ uMap: { value: map } }}
        toneMapped={false}
      />
    </mesh>
  )
}

export function OrbitRings() {
  const rings = useMemo(() => RINGS.map((ring) => ({ ...ring, geometry: makeRing(ring.radius) })), [])
  const spins = useRef([])
  const materials = useRef([])

  useEffect(
    () => () => {
      rings.forEach((ring) => ring.geometry.dispose())
    },
    [rings],
  )

  useFrame(({ clock }) => {
    const fade = 1 - dossierOpen(getJourney().progress) * 0.45
    rings.forEach((ring, index) => {
      const spin = spins.current[index]
      const material = materials.current[index]
      if (spin) spin.rotation.y = clock.elapsedTime * ring.speed * 2.4
      if (material) {
        material.uniforms.uTime.value = clock.elapsedTime * ring.speed * 6
        material.uniforms.uFade.value = fade
      }
    })
  })

  return (
    <group>
      {rings.map((ring, index) => (
        <group key={ring.radius} rotation={ring.tilt}>
          <group
            ref={(node) => {
              spins.current[index] = node
            }}
          >
            <lineLoop geometry={ring.geometry} frustumCulled={false}>
              <shaderMaterial
                ref={(material) => {
                  materials.current[index] = material
                }}
                vertexShader={streakVertex}
                fragmentShader={streakFragment}
                uniforms={{
                  uTime: { value: 0 },
                  uCount: { value: ring.count },
                  uFade: { value: 1 },
                }}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </lineLoop>
          </group>
        </group>
      ))}
    </group>
  )
}
