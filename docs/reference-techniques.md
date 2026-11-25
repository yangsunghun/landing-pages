# 레퍼런스 사이트 프론트엔드 기법 분석 및 구현 명세

세 레퍼런스 사이트(`onlines.com.ar`, `noth.in`, `spykercars.com`)의 실제 렌더링 DOM, 스타일시트, 스크롤/포인터 루프, WebGL 구성을 분석해 우리 랜딩페이지(`React 19 + Vite + Three.js / R3F`)에서 클린룸 방식으로 재구현할 수 있도록 정리한 기술 명세다.

> **구현 원칙**: 레퍼런스 사이트의 원본 번들 코드, 이미지·영상 에셋, 고유 문구·로고·브랜드 요소는 복제하지 않는다. 아래에 정리한 수학 공식, CSS 마스킹 규칙, 셰이더 파이프라인, 상태 전이 구조만 자체 코드로 구현한다.

---

## 1. 세 사이트의 공통 아키텍처

겉모습은 다르지만 세 사이트 모두 같은 4계층 구조 위에서 돌아간다.

| 계층 | 역할 | 레퍼런스 공통 선택 | 우리 프로젝트 대응 |
| --- | --- | --- | --- |
| 스크롤 정규화 | 휠·터치 입력을 감쇠된 연속 값으로 변환 | `Lenis` (`lerp: 0.1~0.2`, 모달·드로어에 `data-lenis-prevent`) | `lenis` 도입 후 `App.jsx`의 `measure()`와 단일 RAF에서 동기화 |
| 시간·진행도 구동 | 스크롤 위치를 `0..1` 순수 함수로 매핑 | `GSAP ScrollTrigger (scrub)` 또는 `getBoundingClientRect()` 정규화 | 짧은 전환은 CSS/GSAP, 연속 장면 재생은 순수 `clamp01` 진행도 유지 |
| 합성 레이어 분리 | 레이아웃 재계산 없이 60fps 유지 | `transform: translate3d()`, `opacity`, `clip-path`, `mask-image`만 변경 | `top/left/width/height` 애니메이션 금지, `will-change`는 활성 구간만 부여 |
| 화면 밖 휴면 | 보이지 않는 구간의 연산 차단 | `IntersectionObserver`로 RAF·비디오·셰이더 일시정지 | 장면별 `inView` 플래그로 비활성 장면 루프 및 WebGL 드로우콜 정지 |

---

## 2. `onlines.com.ar` — 협업 캔버스 UI, 제로 DOM 그리드, 하프톤 캔버스

### 2.1 감지된 기술 구성

- **타이포그래피**: `Inter Display` (700/500, 대형 타이틀 `-0.01em` 트래킹) + `JetBrains Mono` (역할 태그·코드 블록 `8px~12px`, 대문자)
- **스크롤·전환**: `Lenis` (`lerp: 0.2`, `smoothWheel: true`, `syncTouch: false`) + 브라우저 네이티브 `View Transitions API` (`pageswap`, `pagereveal`) + `Speculation Rules API` 프리렌더
- **구조 특징**: 무거운 프레임워크 없이 블록별 독립 스크립트가 **단일 마스터 RAF**와 **`IntersectionObserver`**로만 동작한다.

### 2.2 핵심 기법과 구현 명세

#### A. 히어로 첫 스크롤 게이트 (Intro Scroll Gate)

첫 휠·키보드 스크롤 입력을 가로채 페이지를 내리지 않고 히어로 인트로 시퀀스를 발화한 뒤, `1500ms` 뒤에 스크롤 잠금을 해제한다. 사용자가 아무 입력도 하지 않으면 `8000ms` 뒤 자동으로 인트로를 재생한다.

```js
// 첫 스크롤 시도를 인트로 트리거로 전환하는 패턴
const LOCK_MS = 1500
const FAILSAFE_MS = 8000

export function bindIntroGate({ onStart, lenis }) {
  let triggered = false
  lenis?.stop()
  document.documentElement.classList.add('is-intro-locked')

  const release = () => {
    document.documentElement.classList.remove('is-intro-locked')
    lenis?.start()
  }

  const trigger = (event) => {
    if (triggered) return
    if (event?.cancelable) event.preventDefault()
    triggered = true
    cleanup()
    onStart()
    window.setTimeout(release, LOCK_MS)
  }

  const onKey = (e) => {
    if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) trigger(e)
  }

  const timer = window.setTimeout(() => trigger(), FAILSAFE_MS)
  window.addEventListener('wheel', trigger, { passive: false })
  window.addEventListener('touchmove', trigger, { passive: false })
  window.addEventListener('keydown', onKey)

  function cleanup() {
    window.clearTimeout(timer)
    window.removeEventListener('wheel', trigger)
    window.removeEventListener('touchmove', trigger)
    window.removeEventListener('keydown', onKey)
  }

  return cleanup
}
```

#### B. 제로 DOM 블루프린트 격자 + 링 버퍼 하이라이트 풀

수백 개의 그리드 셀 `div`를 만들지 않는다. 격자선은 컨테이너의 `::before`/`::after`에서 `repeating-linear-gradient` 마스크로 그리고, 마우스가 지나간 칸의 발광 잔상은 **고정 12개 `div` 풀을 모듈로(`% 12`) 회전 재활용**해 해결한다.

1. **정수 분할 셀 크기 계산**: 컨테이너 폭·높이를 목표 셀 크기(`60px`)로 나눈 뒤 `Math.round`로 칸 수를 정해 `--cell-w`, `--cell-h`에 기록한다. 오른쪽·아래쪽 끝에서 격자가 잘리지 않는다.
2. **오브젝트 풀 재활용**: `pointermove`에서 `col = Math.floor(x / cellW)`, `row = Math.floor(y / cellH)`가 바뀔 때만 다음 풀 아이템을 꺼내 `translate3d(col * cellW, row * cellH, 0)`에 배치하고 `600ms` 뒤 비활성화한다.

```css
.blueprint-grid {
  --cell-target: 60px;
  --cell-w: 60px;
  --cell-h: 60px;
  --dash: 4px;
  --step: 8px;
  position: relative;
  overflow: hidden;
}

.blueprint-grid::before,
.blueprint-grid::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.12);
}

/* 세로 점선 격자 */
.blueprint-grid::before {
  mask-image:
    repeating-linear-gradient(to bottom, #000 0 var(--dash), transparent var(--dash) var(--step)),
    repeating-linear-gradient(to right, #000 0 1px, transparent 1px var(--cell-w));
  mask-composite: intersect;
}

/* 가로 점선 격자 */
.blueprint-grid::after {
  mask-image:
    repeating-linear-gradient(to right, #000 0 var(--dash), transparent var(--dash) var(--step)),
    repeating-linear-gradient(to bottom, #000 0 1px, transparent 1px var(--cell-h));
  mask-composite: intersect;
}

.blueprint-grid__lit {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--cell-w);
  height: var(--cell-h);
  background: rgba(255, 255, 255, 0.08);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.blueprint-grid__lit.is-lit {
  opacity: 1;
  transition: none; /* 켜질 때는 즉시 점등, 꺼질 때만 600ms 잔상 */
}
```

#### C. 포인터 스포트라이트 도트 매트릭스

도트 수천 개를 그리는 대신 `radial-gradient` 배경 하나와 두 겹의 원형 `mask-image`를 조합한다.

- 기본 레이어: `--dot-x`, `--dot-y`를 중심으로 반경 `350px` 영역만 은은하게 드러낸다.
- 발광 레이어(`::after`): `--lit-x`, `--lit-y`를 중심으로 반경 `50px` 영역의 도트만 더 밝게 비춘다.
- **디테일**: `mouseleave` 시 기본 마스크(`--dot-x/y`)는 중앙(`50%`)으로 복귀시키되, 발광 레이어(`--lit-x/y`) 좌표는 갱신하지 않고 `opacity`만 `0`으로 낮춘다. 헤일로가 중앙으로 날아가며 꺼지는 어색한 현상을 막는다.

```css
.dot-spotlight {
  --dot-x: 50%;
  --dot-y: 50%;
  --lit-x: 50%;
  --lit-y: 50%;
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, rgba(231, 238, 246, 0.22) 1px, transparent 1px);
  background-size: 14px 14px;
  mask-image: radial-gradient(350px circle at var(--dot-x) var(--dot-y), #000 0%, transparent 100%);
}

.dot-spotlight::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(231, 238, 246, 0.65) 1px, transparent 1px);
  background-size: 14px 14px;
  opacity: 0;
  transition: opacity 0.6s ease;
  mask-image: radial-gradient(64px circle at var(--lit-x) var(--lit-y), #000 0 65%, transparent 100%);
}

.dot-spotlight.is-active::after {
  opacity: 1;
}
```

#### D. 자율 주행 협업 커서 + 바운딩 박스 핸들 드래그

- **자율 커서**: 역할별 정규화 웨이포인트 배열(`[{ x, y, pause, click }]`)을 두고 단일 RAF에서 `easeInOutSine(t) = -(Math.cos(Math.PI * t) - 1) / 2`로 보간한다. `click: true` 지점에 도달하면 `.is-clicking` 클래스를 잠시 붙여 화살표 SVG는 `scale(0.9)`, 이름표 배지는 `translate(1px, 1px)`로 눌리는 촉감을 준다.
- **에디터 바운딩 박스**: 타이틀 둘레에 `1px` 테두리와 모서리·상하 핸들 점을 얹고, 포인터 드래그 시 카드 경계(`clamp`) 안에서 타이틀과 선택 상자가 함께 `translate3d`로 이동하게 만든다.

#### E. 스티키 핀 단어별 가역 리빌 (`100svh` 고정 + 구간 분할)

섹션 높이를 `300vh`로 잡고 내부 `.sticky`를 `100svh`로 고정한 뒤, 상태를 저장하지 않고 스크롤 위치만으로 단어 점등 개수를 계산한다. 내려갈 때와 올라갈 때가 완전히 대칭으로 동작한다.

```js
// 제목(0 ~ 0.73)과 부제(0.73 ~ 1.0) 구간을 나눈 순수 함수형 단어 리빌
const RANGES = {
  headline: [0, 0.73],
  subline: [0.73, 1],
}

export function revealedWordCount(progress, totalWords, [start, end]) {
  const local = Math.min(1, Math.max(0, (progress - start) / (end - start)))
  return Math.ceil(local * totalWords)
}
```

#### F. 테마 전환 중 페인트 병목 차단 (`body.theme-switching`) + 하프톤 셰이더

- **전환 최적화**: 스크롤 중 특정 섹션이 뷰포트에 들어와 배경 테마가 바뀔 때 `850ms` 동안만 `body.theme-switching` 클래스를 붙여 모든 유리 카드의 `backdrop-filter: none`을 강제한다. 배경 페이드와 블러 재합성이 겹쳐 프레임이 떨어지는 현상을 원천 차단한다.
- **하프톤 & 그레인 캔버스**: 카드 배경 위에 `mix-blend-mode: multiply`(어두운 배경에서는 `screen`)로 캔버스를 얹고, `512×512` 해시 노이즈 타일(`fract(sin(x * 12.9898 + y * 78.233) * 43758.5453)`)과 사각 격자 거리 함수를 결합해 밝기에 따라 구멍 반경이 변하는 하프톤 질감을 만든다.

---

## 3. `noth.in` — WebGL 유체 지우개 마스크, GSAP Flip 모핑, 듀얼 리플렉션 비디오

### 3.1 감지된 기술 구성

- **타이포그래피**: `PP Neue Montreal` (`500` 미디엄 중심, 타이트한 행간 `1.0`, `-0.01em`) + `IBM Plex Mono` (`400`)
- **렌더링·모션**: `Three.js` (Orthographic 풀스크린 쿼드 + 핑퐁 `WebGLRenderTarget`) + `GSAP` (`ScrollTrigger`, `Flip`) + `Lenis`
- **레이아웃 특징**: 극단적인 여백과 코너 고정 UI(`mix-blend-mode: difference`), 그리고 포인터가 지나간 자리만 뚫리는 인터랙티브 마스크.

### 3.2 핵심 기법과 구현 명세

#### A. WebGL 핑퐁 유체 마스크 리빌 (Fluid Trail Eraser Canvas)

히어로가 처음에는 단색 표면과 거대한 타이포만 보이지만, 포인터를 움직이면 표면이 액체처럼 닦이며 아래층의 3D 영상/장면이 드러난다.

**레이어 적층 구조**

1. **바닥층 (`z-index: 0`)**: 고대비 루프 비디오 또는 Three.js 3D 씬.
2. **마스크층 (`z-index: 1`, `pointer-events: none`)**: `alpha: true, premultipliedAlpha: false`로 초기화한 WebGL `canvas`. 단색 배경과 타이틀 SVG를 그린 베이스 텍스처에서 포인터 궤적 렌더 타겟(`uMask`) 값만큼 알파를 깎아낸다(`alpha = 1.0 - mask`).
3. **상단 크롬층 (`z-index: 2`, `mix-blend-mode: difference`)**: 흰색 텍스트·버튼을 얹어 배경이 흰색이든 검정이든 자동으로 반전되게 한다.

**핑퐁 트레일 프래그먼트 셰이더 (핵심 원리)**

```glsl
// 1패스: 이전 프레임 마스크(uPrev)를 감쇠시키고 포인터 위치(uPointer)에 부드러운 브러시를 더함
uniform sampler2D uPrev;
uniform vec2 uPointer;
uniform vec2 uVelocity;
uniform float uAspect;
varying vec2 vUv;

void main() {
  vec2 uv = vUv - uVelocity * 0.012; // 이동 방향으로 미세 이류(advection)
  float prev = texture2D(uPrev, clamp(uv, 0.0, 1.0)).r * 0.965; // 잔상 감쇠율

  vec2 diff = vUv - uPointer;
  diff.x *= uAspect;
  float speed = clamp(length(uVelocity) * 18.0, 0.35, 1.4);
  float brush = smoothstep(0.11 * speed, 0.0, length(diff));

  gl_FragColor = vec4(max(prev, brush), 0.0, 0.0, 1.0);
}
```

```glsl
// 2패스: 베이스 표면(uBase)에서 마스크(uMask)만큼 투명 구멍을 뚫어 하단 레이어를 노출
uniform sampler2D uBase;
uniform sampler2D uMask;
varying vec2 vUv;

void main() {
  vec4 base = texture2D(uBase, vUv);
  float hole = smoothstep(0.05, 0.65, texture2D(uMask, vUv).r);
  gl_FragColor = vec4(base.rgb, base.a * (1.0 - hole));
}
```

#### B. 스티키 `difference` 워드 + GSAP `Flip` 스크롤 모핑

작업 섹션 상단에 고정된 단어(`W O R K S`)가 스크롤 구간 동안 뭉쳐 있던 배열(상태 1)에서 화면 전체로 벌어지는 배열(상태 2)로 변형되었다가 돌아온다.

1. 같은 글자 노드들을 상태 1 컨테이너에서 상태 2 컨테이너로 옮기기 직전에 `Flip.getState(chars)`를 기록한다.
2. DOM 이동 후 `const tl = Flip.from(state, { duration: 1.4, ease: 'power4.inOut', stagger: { each: 0.2, from: 'end' }, repeat: 1, yoyo: true, paused: true })` 타임라인을 생성한다.
3. 이동 중간 구간에 각 글자의 `scale: 0.2 -> 1` 트윈을 겹쳐 공간감을 주고, `ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', scrub: 3, animation: tl })`로 스크롤에 연결한다.

#### C. 비대칭 에디토리얼 그리드 + 이중 감쇠 패럴랙스

작업물을 균일한 2열·3열 목록으로 쌓지 않고, 인덱스별 컬럼 범위와 세로 오프셋 프리셋 배열을 순환 적용한다.

```js
const EDITORIAL_SLOTS = [
  { col: '1 / 6', rowOffset: 0, height: '520px', alignSelf: 'start' },
  { col: '8 / 13', rowOffset: 1, height: '360px', alignSelf: 'end' },
  { col: '3 / 9', rowOffset: 3, height: '500px', alignSelf: 'center' },
  { col: '9 / 13', rowOffset: 5, height: '340px', alignSelf: 'start' },
]
```

- **외곽 카드 래퍼**: `scrub: 1.5`로 완만하게 이동.
- **내부 미디어(`overflow: hidden` 안쪽 `120%` 높이 요소)**: `yPercent: -5 -> -20`, `scrub: 3`으로 더 무겁게 따라오게 해 깊이 차이를 만든다.

#### D. 듀얼 싱크 앰비언트 리플렉션 비디오

시네마틱 영상 섹션에서 비디오 하나만 띄우지 않고 두 개를 겹친다.

- **전면 비디오**: 선명한 원본(`z-index: 2`, `border-radius`, 정밀 크롭).
- **배경 리플렉션 레이어**: 동일 타임라인으로 재생되는 저해상도 복제본(또는 동일 `<video>`를 `drawImage`로 복사하는 소형 `<canvas>`)을 뒤에 깔고 `transform: scale(1.35)`, `filter: blur(48px) saturate(1.4)`, `opacity: 0.55`를 주어 주변 어두운 공간에 빛이 번지는 효과를 낸다.

#### E. 디센더 잘림 없는 라인 마스크 리빌 & 역방향 카운트다운 로더

- **디센더 보정 공식**: 텍스트 줄 단위 슬라이드 업(`overflow: hidden`)에서 영문 `g, j, p, q, y` 아랫부분이 잘리는 문제를 막기 위해 내부 줄에 `padding-bottom: 0.15em`, 바깥 마스크 래퍼에 `margin-bottom: -0.15em`을 쌍으로 준다.
- **1회성 커튼 로더**: `sessionStorage`에 재생 여부를 기록해 재방문 시 즉시 건너뛰고, 첫 진입 시에는 숫자가 `0 -> 100`이 아니라 **`100 -> 000`으로 비워지며** 마지막에 로더 높이가 `height: 0`(`1.8s`, `cubic-bezier(0.76, 0, 0.24, 1)`)으로 접혀 올라간다.

---

## 4. `spykercars.com` — 스크롤 스크럽 스테이지, `clip-path` 확장 무대, 계기판 UI

### 4.1 감지된 기술 구성

- **프레임워크·스타일**: Next.js + Tailwind CSS v4 (`oklch()` 색공간 토큰) + `Swiss 721`
- **모션·3D**: `GSAP` + `Lenis (lenis-autoToggle)` + `Three.js WebGPU` (고정 뷰포트 프레임/장면 스크러버) + 벡터 아이콘 애니메이션
- **설계 특징**: 모든 인터랙티브 요소를 `data-*` 속성 계약으로 선언하고, 정밀 기계(항공기·스포츠카 계기판) 감성의 수치·다이얼·슬롯 모션을 사용한다.

### 4.2 핵심 기법과 구현 명세

#### A. 히어로 축소 후퇴 (`scale: 1 -> 0.8`) + 윈도우 내부 패럴랙스

페이지 최상단에서 스크롤을 내리기 시작할 때 히어로가 그냥 위로 밀려 올라가지 않는다.

- 히어로 루트 컨테이너(`transform-origin: center center`)가 스크롤 진행도 `0 -> 1` 동안 `scale(1) -> scale(0.8)`로 작아지며 뒤로 물러난다.
- 동시에 히어로 내부 배경 래퍼(`position: absolute; left: 0; right: 0; top: -10%; bottom: -10%`)는 `translate3d(0, progress * 18%, 0)`로 움직여 창문 너머 풍경이 따로 움직이는 시차를 만든다.

#### B. `clip-path: inset()` 풀블리드 확장 다크 스테이지 + 헤더 자동 반전

밝은 여백 구간에서 어두운 핵심 장면으로 진입할 때 배경색을 갑자기 바꾸지 않고, 여백이 있는 카드 형태(`clip-path: inset(10% round 12px)`)에서 스크롤 스크럽에 맞춰 화면 전체(`clip-path: inset(0% round 0px)`)로 펼쳐지게 만든다.

```css
.expanding-stage {
  position: relative;
  background: #000;
  color: #f7fbff;
  will-change: clip-path;
  /* --stage-open: 0(진입 전) -> 1(완전 개방) */
  clip-path: inset(calc((1 - var(--stage-open, 0)) * 10%));
}
```

- **헤더 테마 동기화**: 고정 헤더 높이에 맞춘 `1px` 수평 밴드 `rootMargin`으로 `[data-section-dark]` 섹션을 `IntersectionObserver`에 등록해, 헤더가 어두운 무대 위를 지나는 동안에만 `data-header-white` 상태를 켠다. 스크롤 이벤트 리스너 없이도 정확한 위치에서 로고·네비게이션 색상이 반전된다.

#### C. 멀티 플레인 마우스 패럴랙스 콜라주 (`100svh` 깊이 무대)

중앙에 짧은 핵심 문장을 고정하고, 주변 공간에 5~7개의 비주얼 레이어를 서로 다른 깊이값으로 배치한다.

| 레이어 깊이 | `mouseFactor` | `opacity` | 등장 방향 (`reveal`) | 역할 |
| --- | --- | --- | --- | --- |
| 전면 주역 | `0.85 ~ 1.20` | `0.90 ~ 1.00` | `center` (`scale` 동반) | 시선을 잡는 핵심 장치·오브제 |
| 중경 보조 | `0.55 ~ 0.75` | `0.28 ~ 0.35` | `left` / `right` | 공간의 좌우 균형 형성 |
| 원경 잔상 | `0.40 ~ 0.50` | `0.14 ~ 0.20` | 고정 페이드 | 과밀함 없이 깊이감만 부여 |

포인터 좌표 `px, py ∈ [-1, 1]`를 목표값으로 두고 RAF에서 `current += (target - current) * 0.08`로 감쇠 보간한 뒤 각 레이어에 `translate3d(cx * 36 * mouseFactor, cy * 24 * mouseFactor, 0)`를 적용한다.

#### D. 듀얼 슬롯 버튼 (`label-a` / `label-b`) & 중앙 수평 와이프 등장

- **뷰포트 진입**: 버튼이 나타날 때 `clip-path: inset(0 50%)`에서 `inset(0 0%)`로 중앙에서 좌우 끝을 향해 펼쳐진다.
- **호버 슬롯 교대**: 버튼 내부 텍스트와 화살표 아이콘을 각각 위아래 두 벌(`A`, `B`)씩 겹쳐 두고 `overflow: hidden` 마스크 안에서 호버 시 `A`는 `translateY(-110%)`, `B`는 `translateY(110%) -> translateY(0)`으로 교대시킨다.

```css
.slot-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  overflow: hidden;
}

.slot-btn__mask {
  position: relative;
  display: inline-block;
  overflow: hidden;
  line-height: 1.1;
}

.slot-btn__a,
.slot-btn__b {
  display: block;
  transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.slot-btn__b {
  position: absolute;
  inset: 0;
  transform: translateY(115%);
}

.slot-btn:hover .slot-btn__a,
.slot-btn:focus-visible .slot-btn__a {
  transform: translateY(-115%);
}

.slot-btn:hover .slot-btn__b,
.slot-btn:focus-visible .slot-btn__b {
  transform: translateY(0);
}
```

#### E. 장거리 스티키 스테이지 + 플로우 게이트 사이드 패널 + 기계식 오도미터

제품 상세 경험(`/c8-preliator`)의 핵심 구조다.

1. **스티키 무대 + 플로우 게이트**: `600vh ~ 1200vh` 트랙 안에 `100svh` WebGL 캔버스를 `position: sticky`로 고정하고, 스크롤 구간마다 보이지 않는 게이트 마커(`flow-gate`)를 배치한다. 게이트를 통과할 때 우측 보조 패널 카드들이 이전 카드는 뒤로 접히며(`data-stacked="true"`) 새 카드가 활성화(`data-active="true"`)된다.
2. **슬롯 마스크 오도미터(Odometer)**: 숫자를 `textContent`로 즉시 바꾸지 않고, 자리수마다 `0~9` 세로 숫자 스트립을 `overflow: hidden` 창 안에 넣어 `translate3d(0, -digit * stepPx, 0)`(`1.4s`, `cubic-bezier(0.16, 1, 0.3, 1)`)로 굴린다.
3. **궤도 각도 커서 & 눈금 다이얼 HUD**: 드래그 가능한 3D 무대 위에서 커서 주변에 작은 호(arc)와 현재 각도(`270.0°`) 리드아웃, 활성 범위 안의 눈금만 밝아지는(`data-in-range="true"`) 계기판 링을 표시한다.

---

## 5. 우리 랜딩페이지(`MERIDIAN`) 장면별 결합 설계

현재 프로젝트의 5개 장면 구조(`docs/landing-plan.md`, `src/App.jsx`, `src/scenes.jsx`, `src/experience/Globe.jsx`)를 유지하면서 세 레퍼런스의 기법을 충돌 없이 배정한 매핑이다.

| 장면 | 현재 파일 | 적용할 레퍼런스 기법 | 기대 효과 |
| --- | --- | --- | --- |
| **전역 스크롤·크롬** | `src/App.jsx`, `src/index.css` | `Lenis` 스무스 스크롤 + 디센더 보정 라인 마스크 + 듀얼 슬롯 버튼(`STYLE 1~3`, `WORK WITH US`) + 테마 전환 시 `backdrop-filter` 일시 해제 | 페이지 전체의 감속감과 버튼·타이포 마감 밀도 상승 |
| **01 입구 (`EnterScene`)** | `src/scenes.jsx` | `onlines`의 **포인터 스포트라이트 도트 매트릭스** 또는 **제로 DOM 블루프린트 격자 풀** + `spykercars`의 **스크롤 시 `scale(1 -> 0.88)` 후퇴 전환** | 글자 드래그·밀치기 주변으로 배경 격자/도트가 반응하며 입체적으로 열림 |
| **02 하는 일 (`PracticeStage`)** | `src/scenes.jsx` | `spykercars`의 **플로우 게이트 스테이지 전환** + **기계식 눈금 다이얼·오도미터 리드아웃** + **멀티 플레인 포인터 감쇠 패럴랙스** | `BRAND`, `PRODUCT`, `DIRECTION` 교대 시 계기판이 실제로 맞물려 돌아가는 촉감 확보 |
| **03 작업 (`WorkStage`)** | `src/scenes.jsx` | `noth.in`의 **스티키 `difference` 타이틀 모핑** + **이중 감쇠 스크럽(`1.5` vs `3.0`)** + `spykercars`의 **슬롯 마스크 숫자 스트립(`NOMAD` 환율 리드아웃)** | 작업 사진을 쓰지 않고도 타이포와 기구 장치만으로 강한 시각적 밀도 형성 |
| **04 문 (`DoorScene`)** | `src/scenes.jsx`, `src/App.jsx` | `spykercars`의 **`clip-path: inset()` 원형/사각 확장 포털** + `onlines`의 **가역 단어 리빌** (`SIX CITIES`) | 검은 문이 열리며 뒤쪽 고정 WebGL 지구 캔버스가 끊김 없이 드러남 |
| **05 지구 (`GlobeScene`)** | `src/experience/Globe.jsx`, `src/App.jsx` | `spykercars`의 **궤도 각도 커서(`DRAG` + 현재 경도/각도 HUD)** + `noth.in`의 **미세 그레인/비네트 합성** | 지구를 돌릴 때 정밀 계기판을 조작하는 감각과 지부 카드 가독성 강화 |

---

## 6. 권장 구현 순서

1. **기반 계층 (`lenis` + 단일 RAF 버스)**
   - `pnpm add lenis` 설치 후 `src/App.jsx`의 스크롤 측정 루프와 `Lenis` RAF를 하나로 통합한다.
   - `prefers-reduced-motion: reduce` 환경에서는 스무스 스크롤과 연속 패럴랙스를 즉시 비활성화한다.
2. **공통 마이크로 인터랙션 컴포넌트화 (`src/components/`)**
   - `LineReveal`: `padding-bottom: 0.15em` / `margin-bottom: -0.15em` 마스크 텍스트 리빌.
   - `SlotButton`: 상하 복제 레이블 슬라이드 + 중앙 `clip-path` 와이프 버튼.
   - `OdometerReadout`: 자리수 스트립 스크롤 카운터(`WorkStage` 환율·`Globe` 좌표 겸용).
   - `BlueprintGrid` / `DotSpotlight`: CSS 마스크 기반 제로 DOM 반응형 배경.
3. **장면별 고도화 (`src/scenes.jsx` -> `src/experience/Globe.jsx`)**
   - `EnterScene` 배경에 `DotSpotlight`와 스크롤 축소 후퇴(`scale`) 연결.
   - `PracticeStage`와 `WorkStage`에 감쇠 포인터 보간(`lerp 0.08`)과 오도미터 연결.
   - `DoorScene`에 `clip-path` 확장 전환을 적용해 `GlobeScene` 진입 경계를 매끄럽게 연결.
   - `GlobeScene` 드래그 시 커서 각도 링 HUD 추가.
4. **성능 검증 체크리스트**
   - 각 장면 루프가 뷰포트 밖(`IntersectionObserver`)에서 `cancelAnimationFrame`으로 완전히 멈추는지 확인.
   - 스타일·테마 전환 구간에서 `backdrop-filter` 중첩으로 인한 프레임 드롭이 없는지 DevTools Performance 패널에서 확인.
   - 모바일 폭(`<= 860px`) 및 터치 환경(`(hover: none)`)에서 커서 전용 효과(`DotSpotlight` 발광, `BlueprintGrid` 풀, 궤도 커서)가 자동으로 정적 모드로 전환되는지 확인.
