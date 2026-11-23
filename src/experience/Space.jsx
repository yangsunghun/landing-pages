import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  MathUtils,
  NoColorSpace,
  SRGBColorSpace,
  Vector3,
} from 'three'
import {
  BODIES,
  SUN,
  commitProgress,
  getJourney,
  samplePath,
  setTarget,
} from './journey'

const MAPS = {
  earthDay: '/textures/earth-day.jpg',
  earthNight: '/textures/earth-night.jpg',
  earthClouds: '/textures/earth-clouds.jpg',
  moon: '/textures/moon.jpg',
  mars: '/textures/mars.jpg',
  saturn: '/textures/saturn.jpg',
  ring: '/textures/saturn-ring.png',
  stars: '/textures/stars.jpg',
}

const SUN_VEC = new Vector3(...SUN).normalize()

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const earthFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 normal = normalize(vNormal);
    float incidence = dot(normal, normalize(sunDirection));
    float day = smoothstep(-0.08, 0.32, incidence);
    vec3 dayColor = texture2D(dayMap, vUv).rgb;
    vec3 nightColor = texture2D(nightMap, vUv).rgb * vec3(1.15, 1.35, 1.85);
    vec3 color = mix(nightColor, dayColor, day);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
    color += vec3(0.35, 0.58, 0.95) * rim * 0.22 * day;
    gl_FragColor = vec4(color, 1.0);
  }
`

const cloudVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const cloudFragment = /* glsl */ `
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    float lum = texture2D(cloudMap, vUv).r;
    float alpha = smoothstep(0.28, 0.68, lum);
    float light = smoothstep(-0.15, 0.5, dot(normalize(vNormal), normalize(sunDirection)));
    float shade = mix(0.05, 1.0, light);
    gl_FragColor = vec4(vec3(0.93, 0.96, 1.0) * shade, alpha * 0.62);
  }
`

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const atmosphereFragment = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.7);
    gl_FragColor = vec4(glowColor, fresnel * intensity);
  }
`

const ringVertex = /* glsl */ `
  uniform float innerRadius;
  uniform float outerRadius;
  varying float vRadial;
  varying vec3 vNormal;
  void main() {
    float radius = length(position.xy);
    vRadial = clamp((radius - innerRadius) / (outerRadius - innerRadius), 0.0, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ringFragment = /* glsl */ `
  uniform sampler2D ringMap;
  uniform vec3 sunDirection;
  varying float vRadial;
  varying vec3 vNormal;
  void main() {
    vec4 tex = texture2D(ringMap, vec2(vRadial, 0.5));
    float light = abs(dot(normalize(vNormal), normalize(sunDirection)));
    light = mix(0.22, 1.0, light);
    gl_FragColor = vec4(tex.rgb * light, tex.a * 0.95);
  }
`

const skyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragment = /* glsl */ `
  uniform sampler2D starMap;
  varying vec2 vUv;
  void main() {
    vec3 color = texture2D(starMap, vUv).rgb * 0.42;
    gl_FragColor = vec4(color, 1.0);
  }
`

const dustVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec3 pos = position;
    pos.x += sin(uTime * 0.18 + position.y * 1.7) * 0.025;
    pos.y += cos(uTime * 0.16 + position.x) * 0.02;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(aSize * (42.0 / max(0.2, -mv.z)), 0.6, 6.5);
    gl_Position = projectionMatrix * mv;
  }
`

const dustFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.08, dist);
    float twinkle = 0.72 + 0.28 * sin(uTime * 1.4 + vColor.r * 24.0);
    gl_FragColor = vec4(vColor, alpha * twinkle);
  }
`

function prepareTexture(texture, color = true) {
  if (texture.userData.prepared) return texture
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace
  texture.anisotropy = 8
  texture.userData.prepared = true
  return texture
}

function CameraRig() {
  const camera = useThree((state) => state.camera)
  const look = useRef(new Vector3())
  const pointer = useRef({ x: 0, y: 0 })
  const smoothed = useRef({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const opening = samplePath(0)
    camera.position.set(...opening.cam)
    camera.lookAt(...opening.look)
  }, [camera])

  useLayoutEffect(() => {
    const onMove = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, delta) => {
    const journey = getJourney()
    const lambda = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 8 : 2.5
    const next = MathUtils.damp(journey.progress, journey.target, lambda, delta)
    commitProgress(next)

    const frame = samplePath(journey.progress)
    smoothed.current.x = MathUtils.damp(smoothed.current.x, pointer.current.x, 2.4, delta)
    smoothed.current.y = MathUtils.damp(smoothed.current.y, pointer.current.y, 2.4, delta)

    camera.position.set(
      frame.cam[0] + smoothed.current.x * 0.18,
      frame.cam[1] - smoothed.current.y * 0.1,
      frame.cam[2],
    )
    look.current.set(frame.look[0], frame.look[1], frame.look[2])
    camera.lookAt(look.current)
  })

  return null
}

function Dust() {
  const material = useRef(null)
  const buffers = useMemo(() => {
    const count = 4800
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const color = new Color()
    const palette = ['#c9daf0', '#e7d7b0', '#8ea4ee', '#f4f7fb']

    for (let i = 0; i < count; i += 1) {
      const roll = Math.random()
      let x
      let y
      let z
      if (roll < 0.5) {
        const angle = Math.random() * Math.PI * 2
        const radius = 1.48 + Math.random() ** 0.7 * 1.55
        const tilt = 0.78
        x = Math.cos(angle) * radius
        y = Math.sin(angle) * radius * Math.sin(tilt) + (Math.random() - 0.5) * 0.16
        z = Math.sin(angle) * radius * Math.cos(tilt)
      } else if (roll < 0.62) {
        const t = Math.random()
        const angle = t * Math.PI * 6
        const radius = 0.18 + Math.random() * 0.34
        x = Math.cos(angle) * radius
        y = (t - 0.5) * 3.6
        z = 1.35 + Math.sin(angle) * radius
      } else {
        const radius = 3.2 + Math.random() * 18
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        x = radius * Math.sin(phi) * Math.cos(theta)
        y = radius * Math.cos(phi) * 0.62
        z = radius * Math.sin(phi) * Math.sin(theta)
      }

      positions.set([x, y, z], i * 3)
      color.set(palette[i % palette.length])
      if (roll >= 0.5 && roll < 0.62) color.multiplyScalar(0.45)
      if (roll >= 0.62) color.multiplyScalar(0.32)
      colors.set([color.r, color.g, color.b], i * 3)
      sizes[i] = roll < 0.5 ? 0.7 + Math.random() * 1.1 : roll < 0.62 ? 0.35 + Math.random() * 0.55 : 0.45 + Math.random() * 0.9
    }

    return { positions, colors, sizes, count }
  }, [])

  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={dustVertex}
        fragmentShader={dustFragment}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

function Sky({ map }) {
  return (
    <mesh raycast={() => null} rotation={[0.15, 0.9, 0.05]}>
      <sphereGeometry args={[70, 48, 32]} />
      <shaderMaterial
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={{ starMap: { value: map } }}
        side={BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

function Atmosphere({ color, scale, intensity }) {
  return (
    <mesh scale={scale} raycast={() => null}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        uniforms={{
          glowColor: { value: new Color(color) },
          intensity: { value: intensity },
        }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

function Halo() {
  const group = useRef(null)
  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.05
  })

  return (
    <group ref={group}>
      <mesh rotation={[1.18, 0.15, 0.32]} raycast={() => null}>
        <torusGeometry args={[1.58, 0.0032, 8, 240]} />
        <meshBasicMaterial color="#d7e7ff" transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.42, 0.7, 1.05]} raycast={() => null}>
        <torusGeometry args={[1.92, 0.0022, 8, 220]} />
        <meshBasicMaterial color="#f0d8aa" transparent opacity={0.42} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Earth({ day, night, clouds }) {
  const spin = useRef(null)
  const cloud = useRef(null)

  useFrame((_, delta) => {
    spin.current.rotation.y += delta * 0.02
    cloud.current.rotation.y += delta * 0.012
  })

  return (
    <group>
      <group ref={spin} rotation={[0, 1.15, 0]}>
        <mesh
          onClick={(event) => {
            event.stopPropagation()
            setTarget(0.32)
          }}
        >
          <sphereGeometry args={[1, 96, 96]} />
          <shaderMaterial
            vertexShader={earthVertex}
            fragmentShader={earthFragment}
            uniforms={{
              dayMap: { value: day },
              nightMap: { value: night },
              sunDirection: { value: SUN_VEC },
            }}
          />
        </mesh>
        <mesh ref={cloud} scale={1.014} raycast={() => null}>
          <sphereGeometry args={[1, 80, 80]} />
          <shaderMaterial
            vertexShader={cloudVertex}
            fragmentShader={cloudFragment}
            uniforms={{
              cloudMap: { value: clouds },
              sunDirection: { value: SUN_VEC },
            }}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>
      <Atmosphere color="#7eb6ff" scale={1.075} intensity={0.95} />
      <Halo />
    </group>
  )
}

function Rocky({ position, radius, map, color, target, spinSpeed = 0.08, glow = 0.45 }) {
  const mesh = useRef(null)
  useFrame((_, delta) => {
    mesh.current.rotation.y += delta * spinSpeed
  })

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        onClick={(event) => {
          event.stopPropagation()
          setTarget(target)
        }}
      >
        <sphereGeometry args={[radius, 72, 72]} />
        <meshStandardMaterial map={map} roughness={0.96} metalness={0.02} />
      </mesh>
      <Atmosphere color={color} scale={radius * 1.045} intensity={glow} />
    </group>
  )
}

function Saturn({ map, ring }) {
  const mesh = useRef(null)
  useFrame((_, delta) => {
    mesh.current.rotation.y += delta * 0.06
  })

  return (
    <group position={BODIES.saturn} rotation={[-0.65, 0.35, 0.12]}>
      <mesh
        ref={mesh}
        onClick={(event) => {
          event.stopPropagation()
          setTarget(0.93)
        }}
      >
        <sphereGeometry args={[0.9, 72, 72]} />
        <meshStandardMaterial map={map} roughness={0.84} metalness={0.03} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[1.16, 2.18, 196, 1]} />
        <shaderMaterial
          vertexShader={ringVertex}
          fragmentShader={ringFragment}
          uniforms={{
            ringMap: { value: ring },
            sunDirection: { value: SUN_VEC },
            innerRadius: { value: 1.16 },
            outerRadius: { value: 2.18 },
          }}
          side={DoubleSide}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export default function Space() {
  const maps = useTexture(MAPS)
  prepareTexture(maps.earthDay)
  prepareTexture(maps.earthNight)
  prepareTexture(maps.earthClouds, false)
  prepareTexture(maps.moon)
  prepareTexture(maps.mars)
  prepareTexture(maps.saturn)
  prepareTexture(maps.ring)
  prepareTexture(maps.stars)

  return (
    <>
      <CameraRig />
      <color attach="background" args={['#03050a']} />
      <ambientLight intensity={0.035} />
      <directionalLight
        position={[SUN_VEC.x * 40, SUN_VEC.y * 40, SUN_VEC.z * 40]}
        intensity={3.5}
        color="#fff3e6"
      />
      <directionalLight
        position={[-SUN_VEC.x * 24, -4, -SUN_VEC.z * 18]}
        intensity={0.22}
        color="#1d2a44"
      />
      <Sky map={maps.stars} />
      <Dust />
      <Earth day={maps.earthDay} night={maps.earthNight} clouds={maps.earthClouds} />
      <Rocky
        position={BODIES.moon}
        radius={0.272}
        map={maps.moon}
        color="#d5dde8"
        target={0.52}
        spinSpeed={0.03}
        glow={0.18}
      />
      <Rocky
        position={BODIES.mars}
        radius={0.53}
        map={maps.mars}
        color="#e7a27a"
        target={0.76}
        spinSpeed={0.07}
        glow={0.42}
      />
      <Saturn map={maps.saturn} ring={maps.ring} />
    </>
  )
}
