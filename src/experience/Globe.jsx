import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { AdditiveBlending, BackSide, MathUtils, SRGBColorSpace } from 'three'
import { boardOpen, commitProgress, getJourney } from './journey'

const RADIUS = 1.62

const earthVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const earthFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vec3 diffuse = texture2D(uMap, vUv).rgb;
    diffuse *= vec3(0.35, 0.5, 0.62);
    float rim = 1.05 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
    vec3 atmosphere = vec3(0.0, 0.85, 1.0) * pow(clamp(rim, 0.0, 1.5), 3.0);
    gl_FragColor = vec4(diffuse + atmosphere, 0.72);
    #include <colorspace_fragment>
  }
`

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.58 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 10.0);
    gl_FragColor = vec4(vec3(0.82, 0.95, 1.0), clamp(intensity, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`

function GlobeScene() {
  const map = useTexture('/textures/earth-day.jpg', (texture) => {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8
  })
  const globe = useRef(null)
  const idle = useRef(0.4)

  useFrame((_, delta) => {
    const journey = getJourney()
    const next = MathUtils.damp(journey.progress, journey.target, 2.5, delta)
    commitProgress(next)

    const open = boardOpen(next)
    idle.current += delta * (0.12 + (1 - open) * 0.05)
    const node = globe.current
    node.rotation.y = idle.current + next * Math.PI * 5.2
    node.rotation.x = 0.28 * (1 - open)
    node.position.y = open * 1.05
    const scale = 1 - open * 0.46
    node.scale.setScalar(scale)
  })

  return (
    <group ref={globe}>
      <mesh>
        <sphereGeometry args={[RADIUS * 0.985, 64, 64]} />
        <meshBasicMaterial color="#02060c" />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <shaderMaterial
          vertexShader={earthVertex}
          fragmentShader={earthFragment}
          uniforms={{ uMap: { value: map } }}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default GlobeScene
