# 회사 랜딩 기획 (MERIDIAN)

회사 소개 페이지다. 한 화면에는 하나의 장면만 있고, 스크롤은 그 장면을 재생한다. 마지막 장면에서 지구가 나타나고, 글로벌 지부를 돌려 본다.

회사 이름은 **MERIDIAN(메리디안)**이다. 개인 창립자 이름은 붙이지 않는다.
화면에 나오는 모든 문장은 `apps/meridian/src/copy.js`에 모아 두었다.

## 구성 원칙

- 기존 타이포와 흐름(`MERIDIAN` 입구 → `BRAND · PRODUCT · DIRECTION` → `NOMAD · KIT · LEDGER` → `SIX CITIES` → 지구 `OFFICES`)은 그대로 유지한다.
- **2번째(`BRAND · PRODUCT · DIRECTION`)와 4번째(`NOMAD · KIT · LEDGER`) 사이에 건축·공간 사진 3장을 활용한 신규 섹션(`03 SPACES`)을 배치**해 총 **여섯 장면(`01`–`06`)**으로 구성한다.
- 화면에 나오는 문장은 모두 영어다.
- 지도·텍스처 및 사진 출처는 화면에 띄우지 않고 `README.md`에 기록한다.

## 여섯 장면

각 장면은 화면 높이에 고정된다. 그 장면의 스크롤 길이 동안 재생되고, 끝나면 다음 장면으로 넘어간다.

| 순서 | 장면 | 재생 |
| --- | --- | --- |
| `01` | 입구 (`EnterScene`) | `MERIDIAN` 글자를 따로 끌어당긴다. 포인터가 다가가면 글자와 점들이 밀려난다. 두 문장이 차례로 나타나고, 스크롤하면 위로 빠진다. |
| `02` | 하는 일 (`PracticeStage`) | `BRAND`, `PRODUCT`, `DIRECTION`이 세로 원근 무대로 교대한다. 다이얼, 칸, 선이 포인터와 스크롤을 따라 움직인다. |
| `03` | 공간 화보 (`SpacesStage`) | **신규 사진 섹션.** 세 장의 건축·공간 화보(`CONCOURSE`, `PAVILION`, `HORIZON`)가 **아코디언 트립틱 블레이드**로 펼쳐진다. 스크롤과 클릭으로 활성 블레이드가 전환되고, 열린 사진 위에 마우스를 움직이면 **실시간 광학 루페(Optical Loupe, `1.5×`)**가 따라붙어 디테일을 선명하게 비춘다. 마우스를 누르고 있으면(`Hold`) **`2.2×` 고배율 줌**으로 당겨진다. |
| `04` | 작업 (`WorkStage`) | `NOMAD`, `KIT`, `LEDGER`가 가로 덱으로 놓인다. 스크롤, 가로 드래그, 포인터 호버가 작업을 정돈해 보여 준다. |
| `05` | 문 (`DoorScene`) | `SIX CITIES`가 켜지고 지우개 베일이 열린다. 단어가 걷히면 그 자리에서 지구가 떠오른다. |
| `06` | 지구 (`GlobeScene`) | 화면이 고정된다. 지구는 지부 카드와 연락이 남는 크기까지 다가온 뒤 멈춘다. 여섯 도시 점이 차례로 켜지고, 드래그로 도시를 앞으로 보낸다. `STYLE 1`–`STYLE 3`으로 지구의 얼굴을 바꾼다. |

6번 뒤로 다음 장면을 두지 않는다.

고정으로 남는 UI:

- 왼쪽 위, `MERIDIAN`. 누르면 입구(`TOP`)로 돌아간다.
- 오른쪽 위, 장면 번호 `01`–`06`. 지금 장면만 밝다.
- `STYLE 1` · `STYLE 2` · `STYLE 3`은 마지막 지구 장면에서만 밝아지고 누를 수 있다.

## 03 공간 화보 (`SpacesStage`) 상세

`public/projects/`에 배치된 고대비 건축 사진 3종과 광학 뷰파인더 인터랙션을 결합한다.

1. **`01 · CONCOURSE`** (`HAMBURG · TRANSIT` / `84.0M SPAN`)
   - 사진: `/projects/concourse.jpg`
   - 설명: `Spatial identity and daylight structure across a glass-vaulted terminal.`
2. **`02 · PAVILION`** (`CAPE TOWN · GALLERY` / `42.0M VOID`)
   - 사진: `/projects/pavilion.jpg`
   - 설명: `Monolithic circulation and exhibition rooms carved from dark concrete.`
3. **`03 · HORIZON`** (`ROTTERDAM · TOWER` / `138M ELEV`)
   - 사진: `/projects/horizon.jpg`
   - 설명: `Architectural facade grid and environmental systems on the harborfront.`
