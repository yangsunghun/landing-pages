# 회사 랜딩 기획

회사 홍보 페이지다. 한 화면에는 하나의 장면만 있고, 스크롤은 그 장면을 재생한다. 마지막 장면에서 지구가 나타나고, 글로벌 지부를 돌려 본다.

가칭은 **메리디안**이다. 사람 이름은 붙이지 않는다.

장면 재생으로 구현되어 있다. 화면에 나오는 문장은 `src/copy.js`에 모아 두었다.

## 정한 것

- 주제는 브랜드와 제품을 한 팀이 만드는 디자인 회사다.
- 지구는 페이지 맨 끝에만 나온다. 지부 홍보가 그 장면의 역할이다.
- 스타일 1, 2, 3은 남긴다. 지구 장면에서만 얼굴을 바꾼다.
- 말투는 짧고 평이하다. 회사가 하는 일이 먼저 나온다.
- 화면에 나오는 문장은 모두 영어다. 다국어는 이번 버전에 넣지 않고, 문장을 한곳에 모아 두어 나중에 언어를 추가할 수 있게 한다.
- 바탕은 검다. 참고 사이트의 색, 사진, 소리, 클라이언트 이름은 가져오지 않는다.
- 제품 사진은 넣지 않는다. 화려한 부분은 장면 전환, 포인터, 지구다.

## 참고에서 가져오는 인터랙션

참고 사이트:

- Active Theory, https://activetheory.net/
- Petrillo.studio, https://petrillo.studio/
- Nothin', https://www.noth.in/
- Spyker Cars, https://spykercars.com/

| 사이트 | 가져오는 동작 | 가져오지 않는 것 |
| --- | --- | --- |
| Active Theory | 스크롤이 다음 글을 드러내는 대신 장면을 교체한다. 이전 장면은 밀려나고 다음 장면이 화면을 차지한다. | 그들의 3D 세계 자체 |
| Petrillo.studio | 마지막 장면은 만지는 악기다. 지구를 드래그하고, 스타일 버튼은 셔플처럼 얼굴을 바꾼다. 작업 이름 위에 포인터를 올리면 그 줄이 반응한다. | 빨간 시계, 소리, 그 사이트의 작업물 |
| Nothin' | 작업은 목록으로 쌓지 않는다. 이름 하나와 한 줄이 화면을 차지한다. | FAQ, 견적, 창립자 이름, 반복되는 마르키 |
| Spyker Cars | 한 문장이 화면을 잡고, 스크롤하면 다음 문장으로 넘어간다. 끝은 본사와 연락이다. | 자동차 사진, 부티크, 가격 |

소리는 원본이 없으므로 넣지 않는다. 포인터와 스크롤만으로 장면이 움직인다.

## 다섯 장면

각 장면은 화면 높이에 고정된다. 그 장면의 스크롤 길이 동안 재생되고, 끝나면 다음 장면으로 넘어간다.

| 순서 | 장면 | 재생 |
| --- | --- | --- |
| 1 | 입구 | `MERIDIAN`이 화면을 차지한다. 포인터를 아주 조금 따라간다. 두 문장은 이름을 올린 뒤 차례로 나타난다. 스크롤하면 이름이 위로 빠지며 다음 장면이 들어온다. |
| 2 | 하는 일 | `BRAND`, `PRODUCT`, `DIRECTION`이 한 단어씩 화면 중앙을 차지한다. 스크롤이 단어를 교대한다. 이전 단어는 작아지며 남고, 영어 설명은 그 아래에 둔다. |
| 3 | 작업 | `NOMAD`, `KIT`, `LEDGER`가 스크롤로 교대한다. 앞에 온 이름만 크고, 영어 한 줄과 역할이 따라온다. 이름 위에 포인터를 올리면 그 작업이 앞으로 당겨진다. |
| 4 | 문 | `SIX CITIES`가 한 화면을 차지한다. 스크롤하면 단어가 걷히고, 그 자리에서 지구가 떠오른다. |
| 5 | 지구 | 화면이 고정된다. 지구는 지부 카드와 연락이 남는 크기까지 다가온 뒤 멈춘다. 도시 점이 차례로 켜진다. 드래그로 도시를 앞으로 보낸다. 스타일을 누르면 얼굴이 짧게 넘어가며 바뀐다. 연락은 이 장면 아래 한 줄. |

5번 뒤로 다음 장면을 두지 않는다.

고정으로 남는 UI:

- 왼쪽 위, `MERIDIAN`. 누르면 입구로 돌아간다.
- 오른쪽 위, 장면 번호 `01`–`05`. 지금 장면만 밝다.
- `STYLE 1` · `STYLE 2` · `STYLE 3`은 5번에서만 밝아진다. 그 전에는 누르지 못한다.
- 5번의 짧은 안내. `DRAG` 하면 다른 지부가 앞으로 온다.

## 문장

화면에 보이는 글은 모두 영어다. 큰 단어와 그 아래 문장을 같은 크기로 섞지 않는다.

입구

> MERIDIAN
>
> One team for brand and product.
> Six cities, one standard.

하는 일. 단어가 중앙을 차지하고, 문장은 그 아래다.

> BRAND. Name, voice, and campaign, held to one standard.
> PRODUCT. Screens and design systems, designed in the form that ships.
> DIRECTION. The same impression, in every city.

작업. 앞에 온 이름만 크다.

> NOMAD. One account for many currencies. The app and the campaign. BRAND, PRODUCT.
> KIT. Tools for making music. The brand and the plugin. BRAND, PRODUCT, DIRECTION.
> LEDGER. The screen where a finance team closes the books. PRODUCT, DESIGN SYSTEM.

문

> SIX CITIES
>
> Seoul is home. Each office handles the launches and clients in its region.

지구

> OFFICES
> DRAG A CITY FORWARD.

연락

> WORK WITH US
> seoul@meridian.example

크레딧도 영어다. `Globe texture`, `Coastlines`.

작업 세 개는 이 페이지를 위한 가상 사례다. 실제 클라이언트가 생기면 이름과 문장만 바꾼다. 문장은 나중에 언어를 추가할 수 있도록 한 파일에 모은다.

## 이미지

제품 사진은 넣지 않는다. 스톡, 실제 서비스 화면, 참고 사이트의 이미지, 생성한 가짜 제품 화면도 쓰지 않는다.

페이지의 이미지는 지구 텍스처뿐이다. 스타일 1과 3은 WebGL Globe, 스타일 2는 Natural Earth 해안선이다. 크레딧은 지구 장면에 남긴다.

## 지부

카드의 도시, 역할, 본문은 모두 영어다. 좌표는 도시 위에 점이 놓이게 맞춘다.

| 도시 | 역할 | 카드 문장 | 위도 | 경도 |
| --- | --- | --- | --- | --- |
| SEOUL | HQ | Where the brand and product standard is set. | 37.57 | 126.98 |
| LONDON | EUROPE | Launches and accounts in Europe. | 51.51 | -0.13 |
| NEW YORK | NORTH AMERICA | Campaigns and product in North America. | 40.71 | -74.01 |
| SÃO PAULO | SOUTH AMERICA | Brand work in South America. | -23.55 | -46.63 |
| SINGAPORE | ASIA | Product launches in Asia. | 1.35 | 103.82 |
| SYDNEY | OCEANIA | Accounts in Oceania. | -33.87 | 151.21 |

여섯을 넘기지 않는다. 점이 겹치면 앞을 향한 카드만 읽힌다. 좁은 화면에서도 카드는 화면 안에 둔다.

지구는 화면을 가득 채울 때까지 확대하지 않는다. 카드와 연락이 남는 거리에서 멈춘다.

## 스타일

세 스타일은 같은 지부를 다른 얼굴로 보여 준다. 도시 이름과 문장은 바뀌지 않는다.

| 버튼 | 얼굴 |
| --- | --- |
| STYLE 1 | 청록 가장자리, 바다와 해안, 후광 |
| STYLE 2 | 흰 해안선과 위도 눈금 |
| STYLE 3 | 따뜻한 구체와 고리 |

버튼 글자는 `STYLE 1`, `STYLE 2`, `STYLE 3`이다. 누르면 즉시 갈아끼우지 않고, 짧은 전환으로 얼굴이 넘어간다.

## 다음 구현

유지하는 것:

- 영어 문장, 작업 세 개의 내용, 지부 여섯의 좌표
- 지구, 드래그, 앞을 향한 카드, 세 가지 얼굴
- 로더와 문서 제목은 `MERIDIAN`

바꾸는 것:

1. 입구부터 문까지를 쌓인 문서에서 고정된 장면으로 바꾼다. 각 장면은 자신의 스크롤 구간 동안 재생된다.
2. 하는 일과 작업은 한 줄이 화면을 차지하고, 스크롤이 다음 줄로 넘긴다.
3. 작업 이름은 포인터에 반응한다.
4. 문 장면의 스크롤이 지구를 그 자리에서 불러온다. 지구는 그 전에 보이지 않는다.
5. 지구 장면의 스크롤은 읽히는 크기까지만 다가온다. 그 뒤로는 드래그가 도시를 고른다.
6. 스타일 전환은 짧은 넘김이다.
7. 입구의 회사 이름은 포인터를 조금 따라간다.

## 확인

- 입구, 하는 일, 작업, 문에서 지구가 보이지 않는지.
- 스크롤이 목록을 내리지 않고, 한 장면 안에서 다음 문장으로 넘기는지.
- 작업 이름에 포인터를 올리면 그 작업이 앞으로 오는지.
- 문 다음에 지구가 떠오르고, 카드와 연락이 화면 안에 남는지.
- 드래그로 여섯 도시가 앞으로 오는지.
- `STYLE 1`, `STYLE 2`, `STYLE 3`이 지구 장면에서만, 짧은 전환과 함께 바뀌는지. 도시 문장은 그대로인지.
- 화면에 보이는 문장, 카드, 버튼, 크레딧이 모두 영어인지.
- 앞 장면으로 돌아가면 드래그가 글을 돌리지 않는지.
- 좁은 화면에서 카드가 잘리지 않는지.
