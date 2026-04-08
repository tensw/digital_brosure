# 성균관대학교 학술정보관 AX 사례 — 디지털 브로슈어

> 학술정보관의 AI 도입 사례를 시연 중심으로 전달하는 인터랙티브 디지털 브로슈어

**Live URL**: https://digbro.vercel.app/v2/

---

## 프로젝트 개요

성균관대학교 학술정보관의 3대 AI 솔루션을 시연 중심으로 보여주는 디지털 브로슈어입니다.
카드뉴스 형태로 구성하되, iframe과 유튜브 임베딩을 활용하여 솔루션을 직접 체험하거나 시연 영상을 볼 수 있도록 설계했습니다.

### 3대 솔루션

| 솔루션 | 핵심 기능 | 카드 |
|--------|----------|------|
| **연구물 홍보** | 텍스트 기반 연구물 → AI 영상 자동 생성 (롱폼/숏폼) | Card 1~3 |
| **연구자 매칭 및 성과 관리** | 연구자 핑거프린트 기반 추적·분석·리포트 | Card 4~5 |
| **네비게이션 에이전트** | 지식 그래프 관리 + AI FAQ 채팅봇 | Card 6~7 |

---

## 카드 구성

| 순서 | 내용 | 비주얼 타입 |
|------|------|-----------|
| Card 0 | 커버 — 학술정보관의 지능화, AI 도입 사례 | 타이틀 + 그리드 배경 |
| Card 1 | 연구물 분석 및 영상 생성 | 유튜브 임베딩 |
| Card 2 | AI 생성 숏폼 영상 | 논문 페이지 뷰어 + 폰 프레임 비디오 |
| Card 3 | AI 생성 롱폼 영상 | 유튜브 임베딩 |
| Card 4 | 연구자 매칭 및 성과 관리 | iframe (대시보드) |
| Card 5 | 연구자 성과 분석 리포트 | iframe (리포트) |
| Card 6 | 지식 그래프로 관리하는 FAQ | 유튜브 임베딩 |
| Card 7 | FAQ 채팅봇 | iframe (채팅봇) |

---

## 버전 히스토리

### v1 (`/index-scroll.html`)

단일 HTML 파일, `scrollIntoView` 기반 카드 전환.

**한계점:**
- `scrollIntoView`의 불안정성으로 카드 건너뛰기 현상 발생 (Card 2 → Card 5로 점프)
- iframe 내부 이벤트(채팅봇 응답, 유튜브 포커스)가 부모 페이지 스크롤에 영향
- `scroll-snap`, `overflow: hidden`, `transform: translateY` 등 다양한 접근을 시도했으나 근본적 한계 존재
- 브라우저의 스크롤 메커니즘에 의존하는 한, iframe과의 이벤트 충돌을 완전히 제거할 수 없음

### v2 (`/v2/index.html`) — 현재 메인

컴포넌트 기반, `display: none/flex` 토글 방식. **스크롤을 아예 사용하지 않음.**

**v1의 문제를 해결한 핵심 설계:**
- 한 번에 하나의 카드만 `display: flex`로 표시, 나머지는 `display: none`
- DOM에 스크롤 가능한 요소가 없으므로, 카드 건너뛰기가 구조적으로 불가능
- iframe 내부 이벤트가 부모 페이지에 영향을 줄 수 없음

---

## 제작 과정에서의 주요 고민

### 1. iframe 스크롤 전파 문제

**문제**: FAQ 채팅봇 iframe 내에서 답변이 생성되면, 부모 페이지가 다음 카드로 넘어가는 현상.

**시도한 해결책:**
- `overscroll-behavior: contain` → iframe 내부 스크롤 체이닝은 막지만, 레이아웃 변화에 의한 snap 트리거는 못 막음
- `scroll-snap-type: y proximity` → 덜 공격적이지만 여전히 불안정
- `overflow: hidden` + focus 감지 → blur/focus 이벤트가 iframe 내부 변화를 잡지 못함
- `setInterval`로 iframe 포커스 감지 → 타이밍 이슈

**최종 해결**: v2에서 스크롤 자체를 제거. `display` 토글 방식으로 전환하여 원천 차단.

### 2. 카드 건너뛰기 문제

**문제**: Card 2에서 다음으로 넘어갈 때 Card 4나 5로 점프.

**원인 분석:**
- `scrollIntoView({ behavior: 'smooth' })`는 카드 높이가 다를 때 목표 위치를 부정확하게 계산
- 특히 Card 2(폰 프레임 680px)처럼 높이가 큰 카드에서 오차 발생
- 트랙패드 모멘텀 스크롤 이벤트가 잠금 해제 후 잔존하여 추가 네비게이션 트리거

**시도한 해결책:**
- `goTo` 함수에서 `n = current ± 1` 강제 → 단일 호출에서는 방지되지만, 모멘텀에 의한 연속 호출은 못 막음
- `isScrolling` 타이머 증가 (600ms → 900ms → 1000ms) → 부분적 개선
- 쿨다운 추가 (isScrolling 해제 후 800ms 추가 차단) → 부분적 개선
- `window.scrollTo` 좌표 계산 방식 → 오히려 더 부자연스러움
- `transform: translateY` 방식 → 동작은 하지만 스크롤 느낌이 아닌 슬라이드 느낌

**최종 해결**: v2에서 `display` 토글. 스크롤 자체가 없으므로 건너뛰기 불가능.

### 3. 유튜브 iframe 포커스 문제

**문제**: 유튜브 영상 클릭 후, 휠/키보드로 다음 카드 이동 불가. 화면을 한 번 클릭해야 포커스가 돌아옴.

**원인**: 브라우저는 cross-origin iframe에 포커스가 있으면 모든 입력 이벤트를 iframe으로 보냄. 부모 페이지의 이벤트 리스너에 도달하지 않음.

**시도한 해결책:**
- `isChatbotFocused()` 함수로 채팅봇만 차단 → 유튜브에도 동일 현상 (브라우저 동작)
- 투명 오버레이 + `onmousedown` → 클릭이 2번 필요한 문제 발생
- `pointer-events` 토글 → 타이밍이 불안정

**최종 해결**: `window.blur` 이벤트로 유튜브 iframe 포커스 감지 후 1초 뒤 자동 `blur()`. 사용자가 재생 클릭 → 1초 후 포커스 자동 반환 → 휠/키보드 즉시 사용 가능.

### 4. iframe 배율 조정 (채팅봇)

**문제**: 채팅봇 iframe 내용이 브로슈어 내에서 너무 크게 보여서 배율 축소 필요.

**시도한 방법:**
- `transform: scale(0.75)` → 시각적으로는 축소되지만, 레이아웃 공간은 원래 크기를 차지하여 큰 빈 공간 발생

**최종 해결**: `.iframe-scaler` 클래스 — `position: relative` 컨테이너에 고정 높이(70vh) + `overflow: hidden`, iframe은 `position: absolute`로 배치. 스케일된 iframe이 컨테이너 밖으로 넘치는 부분을 잘라냄.

### 5. 로딩 성능 최적화

**문제**: 8개 카드의 iframe/유튜브가 동시 로딩되어 초기 페이지 로딩이 느림.

**해결:**
- 모든 iframe의 `src` → `data-src`로 변경 (lazy-load)
- 카드 활성화 시 최초 1회만 `src` 설정
- `current + 1`, `current + 2` preload (2칸 앞까지 미리 로드)
- 카드 1(유튜브)과 카드 4(대시보드)는 페이지 초기에 미리 로드 (로딩이 특히 느린 리소스)

---

## 기술 스택

- **순수 HTML + CSS + Vanilla JS** (외부 라이브러리 없음)
- **Vercel** 배포
- iframe, YouTube embed (`enablejsapi=1`), `<video>` 태그
- `postMessage` API로 유튜브 재생/정지 제어

## 파일 구조

```
dig_bro/
├── index-scroll.html          # v1 (세로 스크롤)
├── index-slide.html           # v1 (좌우 슬라이드)
├── v2/
│   ├── index.html             # v2 메인 (컴포넌트 기반)
│   └── cards/
│       ├── card-0.html ~ card-7.html  # 개별 카드 컴포넌트
├── assets/
│   ├── pages/
│   │   └── page-01.png ~ page-12.png  # 논문 페이지 이미지
│   ├── video.mp4              # 숏폼 영상
│   ├── shorts-video.mp4       # 숏폼 영상 (이전 버전)
│   └── paper-sample.png       # 논문 샘플 이미지
└── docs/
    └── superpowers/specs/     # 설계 문서
```

## 조작 방법

| 입력 | 동작 |
|------|------|
| ↑↓ 버튼 (우측) | 카드 이동 |
| 마우스 휠 | 카드 이동 |
| 키보드 ↑↓ / PageUp/Down | 카드 이동 |
| 스페이스바 | 유튜브/숏폼 영상 재생·정지 |
| 카드 2 폰 프레임 클릭 | 숏폼 영상 재생·정지 |
| 카드 2 ◁▷ 버튼 | 논문 페이지 넘기기 |
