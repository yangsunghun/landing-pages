import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  MathUtils,
  Vector3,
} from 'three'
import { commitProgress, diveAmount, dossierOpen, getJourney } from './journey'
import { buildCoastPositions, buildGraticulePositions, buildLandCanvas } from './graticule'
import { GreenGlobe, OrbitRings } from './OrbitGlobe'
import { pushAnchors } from './links'
import { LOCK_Y, REGIONS, anchorPosition } from './regions'

const vectorLineVertex = /* glsl */ `
  varying float vFront;
  void main() {
    vec3 viewNormal = normalize(mat3(modelViewMatrix) * normalize(position));
    vFront = viewNormal.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const vectorLineFragment = /* glsl */ `
  uniform float uStrength;
  uniform float uBack;
  varying float vFront;
  void main() {
    float front = smoothstep(-0.05, 0.4, vFront);
    float alpha = mix(uBack, uStrength, front);
    gl_FragColor = vec4(vec3(0.9, 0.93, 0.96), alpha);
    #include <colorspace_fragment>
  }
`

const landVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  void main() {
    vUv = uv;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const landFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vViewNormal;
  void main() {
    float mask = texture2D(uMap, vUv).r;
    float front = smoothstep(-0.05, 0.35, vViewNormal.z);
    gl_FragColor = vec4(1.0, 1.0, 1.0, mask * mix(0.08, 0.34, front));
    #include <colorspace_fragment>
  }
`

const RADIUS = 1.48
const TURNS = 2
const worldPoint = new Vector3()
const cameraDirection = new Vector3()

function facingFade(value) {
  const t = Math.min(1, Math.max(0, (value - 0.12) / 0.3))
  return t * t * (3 - 2 * t)
}

const surfaceVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const surfaceFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uSweep;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    float shade = texture2D(uMap, vUv).r;
    float ocean = smoothstep(0.01, 0.075, shade);
    float coast = smoothstep(0.0, 0.02, shade) * (1.0 - smoothstep(0.028, 0.07, shade));
    vec3 color = mix(vec3(0.012, 0.016, 0.022), vec3(0.035, 0.15, 0.175), ocean);
    color += vec3(0.35, 0.85, 0.9) * coast * 0.7;
    float sweep = exp(-pow((vUv.x - uSweep) * 9.0, 2.0));
    color += vec3(0.25, 0.75, 0.85) * sweep * 0.28;
    float rim = 1.05 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
    vec3 atmosphere = vec3(0.0, 1.0, 1.0) * pow(clamp(rim, 0.0, 1.4), 3.0);
    gl_FragColor = vec4(color + atmosphere * 0.8, 1.0);
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
    float intensity = pow(0.8 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 12.0);
    gl_FragColor = vec4(vec3(0.82, 0.96, 1.0), clamp(intensity, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`

const hazeFragment = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 4.0);
    gl_FragColor = vec4(vec3(0.15, 0.55, 0.7), clamp(intensity, 0.0, 1.0) * 0.55);
    #include <colorspace_fragment>
  }
`

const starVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uRoll;
  varying float vSeed;
  void main() {
    vSeed = aSeed;
    float cx = cos(uPitch);
    float sx = sin(uPitch);
    vec3 p = vec3(position.x, cx * position.y - sx * position.z, sx * position.y + cx * position.z);
    float cy = cos(uYaw);
    float sy = sin(uYaw);
    p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
    float cz = cos(uRoll);
    float sz = sin(uRoll);
    p = vec3(cz * p.x - sz * p.y, sz * p.x + cz * p.y, p.z);
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    float prominent = smoothstep(0.97, 1.0, aSeed);
    gl_PointSize = mix(mix(1.7, 3.4, pow(aSeed, 2.6)), mix(4.4, 6.4, aSeed), prominent);
    gl_Position = projectionMatrix * view;
  }
`

const starFragment = /* glsl */ `
  varying float vSeed;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float core = pow(smoothstep(0.5, 0.0, d), 1.15);
    float magnitude = mix(0.62, 1.0, pow(vSeed, 0.7));
    vec3 warm = vec3(1.0, 0.95, 0.86);
    vec3 cool = vec3(0.92, 0.96, 1.0);
    vec3 color = mix(cool, warm, smoothstep(0.35, 0.8, vSeed));
    gl_FragColor = vec4(color, core * magnitude);
    #include <colorspace_fragment>
  }
`

function makeStars(count) {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    const radius = 42 + Math.random() * 24
    const theta = Math.random() * Math.PI * 2
    const unit = Math.random() * 2 - 1
    const ring = Math.sqrt(1 - unit * unit)
    positions[i * 3] = radius * ring * Math.cos(theta)
    positions[i * 3 + 1] = radius * unit
    positions[i * 3 + 2] = radius * ring * Math.sin(theta)
    seeds[i] = Math.random()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  return geometry
}

function Stars({ sky }) {
  const material = useRef(null)
  const geometry = useMemo(() => makeStars(4800), [])

  useFrame(() => {
    const uniforms = material.current?.uniforms
    if (!uniforms) return
    uniforms.uYaw.value = sky.current.y
    uniforms.uPitch.value = sky.current.x
    uniforms.uRoll.value = sky.current.z
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={starVertex}
        fragmentShader={starFragment}
        uniforms={{ uYaw: { value: 0 }, uPitch: { value: 0 }, uRoll: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

function Halos() {
  const inner = useRef(null)
  const outer = useRef(null)
  const innerMaterial = useRef(null)
  const outerMaterial = useRef(null)

  useFrame(({ clock }) => {
    const progress = getJourney().progress
    const dive = diveAmount(progress)
    const open = dossierOpen(progress)
    const time = clock.elapsedTime
    const spin = 0.18 + (1 - dive) * 1.7
    if (inner.current) {
      inner.current.rotation.x = 1.02 - dive * 0.22
      inner.current.rotation.y = time * spin
      inner.current.rotation.z = Math.sin(dive * Math.PI) * 0.45
    }
    if (outer.current) {
      outer.current.rotation.x = 1.28 - dive * 0.62
      outer.current.rotation.y = -time * spin * 0.65
      outer.current.rotation.z = 0.35
    }
    if (innerMaterial.current) innerMaterial.current.opacity = 0.62 - open * 0.34
    if (outerMaterial.current) outerMaterial.current.opacity = 0.32 - open * 0.18
  })

  return (
    <group>
      <mesh ref={inner}>
        <torusGeometry args={[1.78, 0.0055, 12, 240]} />
        <meshBasicMaterial
          ref={innerMaterial}
          color="#8eebff"
          transparent
          opacity={0.62}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={outer}>
        <torusGeometry args={[2.05, 0.0032, 12, 220]} />
        <meshBasicMaterial
          ref={outerMaterial}
          color="#ffffff"
          transparent
          opacity={0.32}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function VectorLines({ positions, strength, back }) {
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(positions, 3))
    return next
  }, [positions])

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        vertexShader={vectorLineVertex}
        fragmentShader={vectorLineFragment}
        uniforms={{
          uStrength: { value: strength },
          uBack: { value: back },
        }}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </lineSegments>
  )
}

function GraticuleGlobe() {
  const grid = useMemo(() => buildGraticulePositions(RADIUS), [])
  const coast = useMemo(() => buildCoastPositions(RADIUS * 1.006), [])
  const landMap = useMemo(() => {
    const texture = new CanvasTexture(buildLandCanvas())
    texture.flipY = true
    texture.needsUpdate = true
    return texture
  }, [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[RADIUS * 0.994, 96, 96]} />
        <shaderMaterial
          vertexShader={landVertex}
          fragmentShader={landFragment}
          uniforms={{ uMap: { value: landMap } }}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <VectorLines positions={grid} strength={0.16} back={0.035} />
      <VectorLines positions={coast} strength={0.55} back={0.1} />
    </group>
  )
}

function GlobeScene({ concept = 'atmosphere', armed = false }) {
  const map = useTexture('/textures/world.jpg')
  const globe = useRef(null)
  const sky = useRef({ x: 0, y: 0, z: 0 })
  const surface = useRef(null)
  const conceptRef = useRef(concept)
  const armedRef = useRef(armed)
  conceptRef.current = concept
  armedRef.current = armed
  const anchors = useRef([])
  const cores = useRef([])
  const blooms = useRef([])
  const drag = useRef({ active: false, yaw: 0, pitch: 0, vy: 0, vp: 0, x: 0, y: 0, t: 0 })
  const intro = useRef(0)

  useEffect(() => {
    if (armed) return undefined
    drag.current.active = false
    drag.current.vy = 0
    drag.current.vp = 0
    document.documentElement.classList.remove('is-turning')
    return undefined
  }, [armed])

  useEffect(() => {
    const onDown = (event) => {
      if (!armedRef.current) return
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      if (event.target.closest?.('a, button, .sheet')) return
      drag.current.active = true
      drag.current.x = event.clientX
      drag.current.y = event.clientY
      drag.current.t = performance.now()
      drag.current.vy = 0
      drag.current.vp = 0
      document.documentElement.classList.add('is-turning')
    }
    const onMove = (event) => {
      if (!drag.current.active) return
      const dx = event.clientX - drag.current.x
      const dy = event.clientY - drag.current.y
      drag.current.x = event.clientX
      drag.current.y = event.clientY
      const now = performance.now()
      const dt = Math.min(0.05, Math.max(0.008, (now - drag.current.t) / 1000))
      drag.current.t = now
      const yaw = dx * 0.007
      const pitch = dy * 0.004
      drag.current.yaw += yaw
      drag.current.pitch = MathUtils.clamp(drag.current.pitch + pitch, -0.65, 0.65)
      drag.current.vy = MathUtils.clamp(yaw / dt, -1.4, 1.4)
      drag.current.vp = MathUtils.clamp(pitch / dt, -0.8, 0.8)
    }
    const end = () => {
      if (!drag.current.active) return
      drag.current.active = false
      document.documentElement.classList.remove('is-turning')
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.documentElement.classList.remove('is-turning')
    }
  }, [])

  useFrame(({ camera, size }, delta) => {
    const journey = getJourney()
    const next = MathUtils.damp(journey.progress, journey.target, 2.6, delta)
    commitProgress(next)

    const dive = diveAmount(next)
    const narrow = size.width < 860
    const swing = Math.sin(dive * Math.PI)
    camera.position.set(
      swing * (narrow ? 0.7 : 1.55),
      (narrow ? 0.7 : 1.15) - dive * (narrow ? 0.55 : 1) + swing * 0.42,
      (narrow ? 12.2 : 9.8) - dive * (narrow ? 4.6 : 4.3),
    )
    camera.lookAt(0, 0.02, 0)
    camera.rotateZ(swing * 0.07)
    camera.updateMatrixWorld()

    const node = globe.current
    const orbit = conceptRef.current === 'orbit'
    if (!drag.current.active) {
      drag.current.yaw += delta * 0.09
      drag.current.yaw += drag.current.vy * delta
      drag.current.pitch = MathUtils.clamp(drag.current.pitch + drag.current.vp * delta, -0.65, 0.65)
      const decay = Math.exp(-delta * 6)
      drag.current.vy *= decay
      drag.current.vp *= decay
    }
    node.rotation.y = LOCK_Y + dive * Math.PI * 2 * TURNS + drag.current.yaw
    const yawDeg = (((drag.current.yaw * 180) / Math.PI) % 360 + 360) % 360
    document.documentElement.style.setProperty('--globe-yaw-deg', yawDeg.toFixed(1))
    node.rotation.x = swing * 0.22 + drag.current.pitch
    node.rotation.z = swing * -0.12
    sky.current.x = node.rotation.x
    sky.current.y = node.rotation.y
    sky.current.z = node.rotation.z
    const scale = 1 + swing * 0.055
    node.scale.setScalar(scale)
    node.updateWorldMatrix(true, true)

    if (surface.current?.uniforms?.uSweep) {
      surface.current.uniforms.uSweep.value = (dive * 1.4) % 1
    }
    const graticule = conceptRef.current === 'graticule'
    intro.current = Math.min(1, Math.max(0, intro.current + delta * (armedRef.current ? 0.45 : -1.2)))

    cameraDirection.copy(camera.position).normalize()
    const points = []
    REGIONS.forEach((region, index) => {
      const anchor = anchors.current[index]
      if (!anchor) return
      anchor.getWorldPosition(worldPoint)
      const facing = worldPoint.dot(cameraDirection) / worldPoint.length()
      const distance = worldPoint.distanceTo(camera.position)
      const radius = RADIUS * node.scale.x
      const reach = camera.position.length()
      const front = Math.max(0.5, reach - radius)
      const limb = Math.sqrt(Math.max(front * front, reach * reach - radius * radius))
      const depth = Math.min(1, Math.max(0, (distance - front) / Math.max(0.001, limb - front)))
      const cardScale = 1 - depth * depth * 0.42
      const projected = worldPoint.project(camera)
      const lit = Math.min(1, Math.max(0, (intro.current - index * 0.1) / 0.16))
      const face = (projected.z > 1 ? 0 : facingFade(facing)) * lit
      const core = cores.current[index]
      const bloom = blooms.current[index]
      if (core) {
        core.color.set(graticule ? '#ffffff' : orbit ? '#f4ecd4' : '#f4feff')
        core.opacity = face
      }
      if (bloom) {
        bloom.color.set(graticule ? '#ffffff' : orbit ? '#e7c56b' : '#7adfff')
        bloom.opacity = face * (graticule ? 0.45 : orbit ? 0.28 : 0.55)
      }
      points.push({
        id: region.id,
        x: (projected.x * 0.5 + 0.5) * size.width,
        y: (-projected.y * 0.5 + 0.5) * size.height,
        facing: face,
        scale: cardScale,
      })
    })
    pushAnchors(points)
  })

  return (
    <>
      <Stars sky={sky} />
      {concept === 'atmosphere' && <Halos />}
      {concept === 'orbit' && <OrbitRings />}
      <group ref={globe}>
        <mesh visible={concept === 'atmosphere'}>
          <sphereGeometry args={[RADIUS, 96, 96]} />
          <shaderMaterial
            ref={surface}
            vertexShader={surfaceVertex}
            fragmentShader={surfaceFragment}
            uniforms={{
              uMap: { value: map },
              uSweep: { value: 0 },
            }}
            toneMapped={false}
          />
        </mesh>
        {concept === 'graticule' && <GraticuleGlobe />}
        {concept === 'orbit' && <GreenGlobe map={map} />}
        <mesh visible={concept === 'atmosphere'} scale={1.045}>
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
        <mesh visible={concept === 'atmosphere'} scale={1.16}>
          <sphereGeometry args={[RADIUS, 48, 48]} />
          <shaderMaterial
            vertexShader={atmosphereVertex}
            fragmentShader={hazeFragment}
            side={BackSide}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {REGIONS.map((region, index) => (
          <group
            key={region.id}
            position={anchorPosition(region.lat, region.lng, RADIUS * 1.012)}
            ref={(node) => {
              anchors.current[index] = node
            }}
          >
            <mesh>
              <sphereGeometry args={[0.022, 14, 14]} />
              <meshBasicMaterial
                ref={(material) => {
                  cores.current[index] = material
                }}
                color="#f4feff"
                transparent
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.055, 14, 14]} />
              <meshBasicMaterial
                ref={(material) => {
                  blooms.current[index] = material
                }}
                color="#7adfff"
                transparent
                opacity={0}
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>
    </>
  )
}

export default GlobeScene
