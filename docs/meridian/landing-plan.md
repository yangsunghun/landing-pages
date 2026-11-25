# 회사 랜딩 기획 (MERIDIAN)

실제 운영 중인 **글로벌 건축·도시·인프라 디자인 그룹**(Foster + Partners, Snøhetta 계열)처럼 보이도록 설계한 회사 소개 페이지다. 한 화면에는 하나의 장면만 있고, 스크롤은 그 장면을 재생한다. 마지막 장면에서 지구가 나타나고, 여섯 개 대륙의 스튜디오 거점을 돌려 본다.

회사 이름은 **MERIDIAN(메리디안)**이다. 개인 창립자 이름은 내세우지 않는다.
사명인 '자오선(Meridian)'은 **대지 측량의 기준선이자 일조·기후·시간대를 관통하는 건축적 축**을 뜻한다.

장면 재생으로 구현되어 있으며, 화면에 나오는 모든 문장은 `apps/meridian/src/copy.js`에 모아 두었다.

## 컨셉과 톤앤매너

- **업종 정체성**: 초고층 건축, 문화 파빌리온, 공항·교통 인프라와 도시 마스터플랜을 통합 설계하는 **글로벌 건축·엔지니어링 디자인 오피스**.
- **타이포그래피**: **모던 스위스 산세리프 단일 축**을 사용한다. 대형 건축 프로젝트 타이틀과 정밀한 엔지니어링·도시 메타데이터(번호, 도시, 건물 유형, 완공 연도, 스팬·방위각 지표, 표준시) 사이의 대비로 건축 모노그래프(작품집) 인상을 만든다.
- **기존 기구와의 결합**:
  - 입구의 `BlueprintGrid`와 `DotSpotlight`는 **건축 청사진 도면과 측량 기준점**이 된다.
  - 02 장면의 `180.0°` 다이얼, 16칸 그리드, 5줄 레일은 각각 **태양 방위각(Solar Azimuth), 도시 블록 밀도(Urban Matrix), 구조 스팬·교통 동선(Structural Span)** 시뮬레이션 기구로 작동한다.
  - 03 장면에는 **고대비 다크·모노크롬 건축 사진(Unsplash)** 3장을 카드 비주얼로 배치하고, 기존 오도미터·막대·슬래브 정렬 기구를 각 건축물의 **채광 투과율, 어쿠스틱 루버 잔향, 초고층 코어·슬래브 구조 지표**와 결합한다.
- **지구 장면(05) 색감**: 지구는 페이지 맨 끝에만 나온다. `STYLE 1`(기후·해안 대기권), `STYLE 2`(위경도·해안선 지형도), `STYLE 3`(태양 궤도 Sun-path와 구체) 세 가지 얼굴을 그대로 유지하며 이 장면에서만 전환한다.
- **언어와 출처 표기**: 화면 문장은 모두 영어다. 지도·텍스처 및 건축 사진 출처는 화면에 띄우지 않고 `README.md`에 기록한다.

## 참고에서 가져오는 인터랙션

참고 사이트:

- Active Theory, https://activetheory.net/
- Petrillo.studio, https://petrillo.studio/
- Nothin', https://www.noth.in/?ref=minimal.gallery
- Spyker Cars, https://spykercars.com/?ref=minimal.gallery
- Onlines, https://onlines.com.ar/?ref=minimal.gallery

| 사이트 | 가져오는 동작 | 가져오지 않는 것 |
| --- | --- | --- |
| Active Theory | 스크롤이 다음 글을 드러내는 대신 장면을 교체한다. 이전 장면은 밀려나고 다음 장면이 화면을 차지한다. | 그들의 3D 세계 자체 |
| Petrillo.studio | 입구 글자는 밀치고 끌어 만진다. 프로젝트는 가로로 긁어 넘긴다. 지구를 드래그하고, 스타일 버튼은 셔플처럼 얼굴을 바꾼다. | 빨간 시계, 소리, 그 사이트의 작업물 |
| Nothin' | 작업은 목록으로 쌓지 않는다. 프로젝트 하나와 건축 화보·엔지니어링 장치가 화면을 차지한다. | FAQ, 견적, 창립자 이름, 반복되는 마르키 |
| Spyker Cars | 전문 영역은 원근이 있는 장면으로 넘어간다. 스크롤이 계기 장치를 문지른다. 끝은 글로벌 거점과 프로젝트 의뢰다. | 자동차 사진, 부티크, 가격 |
| Onlines | 점선 청사진 격자, 스포트라이트 도트, 가역 단어 리빌, 테마 전환 연출. | 원본 브랜드 컬러와 일러스트 |

소리는 넣지 않는다. 포인터와 스크롤만으로 장면이 움직인다.

## 다섯 장면

각 장면은 화면 높이에 고정된다. 그 장면의 스크롤 길이 동안 재생되고, 끝나면 다음 장면으로 넘어간다.

| 순서 | 장면 | 재생 |
| --- | --- | --- |
| 1 | 입구 (`01`) | 청사진 도면 격자 위에 놓인 `MERIDIAN` 워드마크 글자를 따로 끌어당긴다. 포인터가 다가가면 글자와 측량 점들이 밀려난다. 그룹 소개 두 문장이 차례로 나타나고, 스크롤하면 위로 정리되며 빠진다. |
| 2 | 분야 (`02`) | 세 핵심 영역인 `ARCHITECTURE`, `URBANISM`, `INFRASTRUCTURE`가 원근 무대로 교대한다. **태양 방위각 다이얼(`°`), 도시 블록 그리드, 대스팬 동선 레일**이 포인터와 스크롤을 따라 움직인다. |
| 3 | 대표작 (`03`) | 3대 랜드마크 프로젝트(`CONCOURSE`, `PAVILION`, `HORIZON`)가 **건축 화보 + 구조·환경 지표 기구**와 함께 가로 덱으로 놓인다. 스크롤·가로 드래그·포인터 호버가 프로젝트를 정돈해 보여 준다. |
| 4 | 문 (`04`) | `SIX CITIES`가 켜지고 베일이 열린다. 서울 본사에서 시작해 여섯 위도·시간대로 이어진다는 문장이 걷히면 그 자리에서 지구가 떠오른다. |
| 5 | 지구 (`05`) | 화면이 고정된다. 지구는 스튜디오 카드와 의뢰 메일이 남는 크기까지 다가온 뒤 멈춘다. 여섯 도시 점이 차례로 켜지고, 드래그로 각 대륙 스튜디오를 앞으로 보낸다. 스타일을 누르면 짧은 전환과 함께 지구의 얼굴이 바뀐다. |

5번 뒤로 다음 장면을 두지 않는다.

고정으로 남는 UI:

- 왼쪽 위, `MERIDIAN`. 누르면 입구(`TOP`)로 돌아간다.
- 오른쪽 위, 장면 번호 `01`–`05`. 지금 장면만 밝다.
- `STYLE 1` · `STYLE 2` · `STYLE 3`은 5번 지구 장면에서만 밝아지고 누를 수 있다.

## 문장 (`copy.js` 기준안)

화면에 보이는 글은 모두 영어다. 큰 디스플레이 타이틀과 캡션·제원 메타데이터의 위계를 분리한다.

### 01 입구

> **MERIDIAN**
>
> Architecture, urbanism, and civic infrastructure.
> Six global studios building on one standard.

### 02 하는 일 (Practice)

단어가 중앙을 차지하고, 아래에 설계 영역 정의가 놓인다.

> **ARCHITECTURE** — `01 / FORM & CLIMATE`
> Cultural landmarks and low-carbon towers shaped by solar geometry and local climate.
> *(장치: 태양 방위각·일조 각도 다이얼 `180.0°` ~ `380.0°`)*
>
> **URBANISM** — `02 / MASTERPLAN`
> Waterfront districts, public realms, and high-density city blocks planned for century-scale growth.
> *(장치: 16칸 도시 블록·필지 밀도 매트릭스)*
>
> **INFRASTRUCTURE** — `03 / TRANSIT & SPAN`
> Aviation terminals, bridges, and rail concourses engineered with long-span structural clarity.
> *(장치: 5줄 대스팬 구조·여객 동선 레일)*

### 03 대표 프로젝트 (Selected Works — 사진 + 엔지니어링 장치)

각 카드에는 `public/projects/`의 고대비 건축 사진과 함께 도시·용도·연도 메타데이터 및 실시간 기구가 들어간다.

> `01 · HAMBURG · AVIATION HUB · 2025`
> **CONCOURSE**
> Long-span steel diagrid roof and daylight vault engineered for twenty million annual passengers.
> `AVIATION · STRUCTURAL ENGINEERING`
> *(사진: `/projects/concourse.jpg` — 다크 스틸 트러스 & 스카이라이트 천장 / 기구: 주간 채광·스팬 계수 오도미터)*
>
> `02 · CAPE TOWN · CONTEMPORARY ARTS · 2024`
> **PAVILION**
> Carved concrete atrium and acoustic galleries tuned for Chamber music and public exhibitions.
> `CULTURAL · ACOUSTIC GEOMETRY`
> *(사진: `/projects/pavilion.jpg` — 모노크롬 조각적 보이드 나선 계단 / 기구: 실내 음향 잔향 스펙트럼 막대)*
>
> `03 · ROTTERDAM · HIGH-RISE CAMPUS · 2026`
> **HORIZON**
> Inclined high-rise tower with a braced structural mast and net-zero facade grid on the harborfront.
> `HIGH-RISE · FACADE SYSTEM`
> *(사진: `/projects/horizon.jpg` — 흑백 기하학 파사드 & 대각선 구조 파일론 / 기구: 층간 코어·슬래브 정렬 그리드)*

### 04 문

> **SIX CITIES**
>
> Founded in Seoul. Six regional studios working across latitudes, from masterplan to completion.

### 05 지구 및 의뢰 문의

> **STUDIOS** *(또는 `OFFICES`)*

하단 프로젝트 의뢰 문의:

> **COMMISSIONS** *(또는 `INQUIRIES`)*
> `seoul@meridian-arch.com`

## 스튜디오 거점 (6개 도시)

카드의 도시, 권역·표준시(`kicker`), 본문은 모두 영어다. 좌표는 도시 위에 점이 놓이게 맞춘다.

| 도시 | 역할 · 시간대 | 카드 문장 | 위도 | 경도 |
| --- | --- | --- | --- | --- |
| SEOUL | `HQ · UTC+9` | Global headquarters. Founding partners, structural research, and civic masterplans. | 37.57 | 126.98 |
| LONDON | `EUROPE · UTC+0` | Cultural institutions, adaptive reuse, and urban regeneration across Europe. | 51.51 | -0.13 |
| NEW YORK | `NORTH AMERICA · UTC-5` | High-rise towers, waterfront campuses, and transit hubs in North America. | 40.71 | -74.01 |
| SÃO PAULO | `SOUTH AMERICA · UTC-3` | Tropical architecture, public pavilions, and infrastructure across Latin America. | -23.55 | -46.63 |
| SINGAPORE | `ASIA · UTC+8` | Aviation terminals, climate-responsive towers, and coastal districts in Asia. | 1.35 | 103.82 |
| SYDNEY | `OCEANIA · UTC+10` | Harborfront precincts, civic venues, and sustainable timber structures in Oceania. | -33.87 | 151.21 |

## 지구 스타일 (유지)

| 버튼 | 얼굴 | 건축적 맥락 |
| --- | --- | --- |
| `STYLE 1` | 청록 가장자리, 바다와 해안, 후광 | 기후·대기 환경 뷰 |
| `STYLE 2` | 흰 해안선과 위도 눈금 | 대지 측량·지형도 뷰 |
| `STYLE 3` | 따뜻한 구체와 고리 | 일조·태양 궤적(Sun-path) 뷰 |

## 코드 반영 순서

1. **`copy.js` 및 `regions.js` 갱신**: 입구 선언문, 3대 건축·도시·인프라 영역 정의, 3개 대표작 메타데이터·이미지 경로·설명, 6개 스튜디오 `UTC` 거점 문구, `seoul@meridian-arch.com` 반영.
2. **03 장면 건축 화보 카드 레이아웃 (`scenes.jsx`, `index.css`)**: 각 `deck-card`에 `/projects/*.jpg` 건축 화보 프레임을 다크 에디토리얼 톤(미세한 패럴랙스·비네트 마감)으로 통합하고, 기존 오도미터·어쿠스틱 바·슬래브 정렬 장치를 카드 위/옆의 정밀 건축 지표 오버레이로 결합.
3. **02 장면 타이틀 및 캡션 타이포 조정 (`scenes.jsx`, `index.css`)**: `INFRASTRUCTURE`(14글자)가 긴 화면과 좁은 화면 모두에서 잘리지 않도록 폰트 스케일(`clamp`)과 에디토리얼 라벨(`01 / FORM & CLIMATE` 등)을 정밀 조정.
