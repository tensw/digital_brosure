# BK21 보드 소스 지도

2026-09-02 이관 · 정본 위치와 재생성 절차

`biblo.ai/bk21/board/` 화면을 만드는 소스가 세 곳에 흩어져 있었다.
빌드 조각은 `biblo_rims_aws/bk21-src/`, 데이터 산출 스크립트는 임시폴더,
배포본만 홈페이지 저장소에 있었다. 임시폴더는 세션이 끝나면 지워진다.
**한 곳으로 모아 `bibloai-homepage/v2/bk21/board/_src/` 를 정본으로 삼았다.**

## 1. 지금 어디에 무엇이 있나

```
bibloai-homepage/v2/bk21/          ← 정본
├─ index.html                       BK21 관리자료 인덱스
├─ docs/                            문서 9
│   └─ source-map.md                이 문서
└─ board/
    ├─ index.html      17MB         빌드 산출물 = 실제 서비스되는 화면
    └─ _src/                        소스 전부
        ├─ build.sh                 빌드기
        ├─ build/       16개 572K   화면 조각 (CSS·HTML·JS)
        ├─ data/        14개  16M   화면에 박히는 데이터 (깃 제외)
        ├─ gen/         18개        데이터 산출 스크립트
        │   └─ bk4/     12개        타 대학 명단 정제 · 대학비교
        ├─ port/         3개        연구자 팝업 이식 스크립트
        ├─ qa/          45개        Playwright 화면 검증
        └─ vercel-legacy/           옛 Vercel 부속 (안 씀)
```

`biblo_rims_aws/bk21-src/` 와 `biblo_rims_aws/bk21-board/` 는 **원본 보관용**으로만 남긴다.
그쪽을 고쳐도 서비스에 반영되지 않는다.

## 2. 화면을 고치는 절차

```bash
# 1) 조각을 고친다
vi v2/bk21/board/_src/build/exec.js

# 2) 빌드한다 (문법검사 → 데이터 확인 → 한 파일로 합침)
bash v2/bk21/board/_src/build.sh

# 3) 확인하고 올린다
git add v2/bk21/board/index.html v2/bk21/board/_src/build/exec.js
git commit && git push origin main
```

산출물은 **외부 요청 없이 혼자 뜨는 단일 HTML** 하나다.
데이터가 `const` 로 박혀 있어 DB 연결도 API 도 필요 없다.

화면을 **새로** 만들 때는 세 군데를 함께 고친다. 하나라도 빠지면 화면이 안 보인다.

| 순서 | 파일 | 넣을 것 |
|---|---|---|
| 1 | `build/body.html` | `<section id="v-이름" class="hidden">` |
| 2 | `build/vis.js` | `VIEWS` 등록 (좌측 레일 노출) |
| 3 | `build/exec.js` | `setView` 의 화면 목록 배열 |

## 3. 데이터 14종 — 무엇이 어디서 왔나

`build.sh` 의 `DATA` 목록 순서대로다. 상수이름이 화면 코드에서 쓰는 이름이다.

| 상수 | 파일 | 크기 | 담긴 것 | 만든 것 |
|---|---|---:|---|---|
| `DATA` | `bk21_tree.json` | 12.6M | 계열·학과·교수·논문 전체 트리 | `gen/score.py` → `agg2.py` → `enrich.py` |
| `KPI` | `kpi.json` | 37K | 경영자 KPI 집계 | 보드 원본 |
| `NET` | `net.json` | 73K | 공저 관계망 | 보드 원본 |
| `RECO` | `reco.json` | 833K | 추천 | 보드 원본 |
| `GL` | `glob.json` | 28K | 국제 협력 | 보드 원본 |
| `EX` | `explore.json` | 2.2M | 분야 탐색 | 보드 원본 |
| `FAI` | `fieldai.json` | 67K | 분야별 AI | 보드 원본 |
| `TMAP` | `topicmap.json` | 24K | 토픽 지도 | 보드 원본 |
| `UV` | `univ.json` | 73K | 대학 연구력 | 보드 원본 |
| `FT` | `fieldtopic.json` | 229K | 분야·토픽 | 보드 원본 |
| `CONTACT` | `contact.json` | 166K | 연락처 | 보드 원본 |
| `POOL` | `pool.json` | 7.3K | 데이터풀 현황 | `gen/cov.py` |
| `SRC` | `source.json` | 14K | 데이터 출처 | 보드 원본 |
| `UCMP` | `ucmp.json` | 17K | 대학 BK21 비교 | `gen/bk4/mkjson.py` |

「보드 원본」은 이관 전 bk21-board 프로젝트에서 만들어져 그대로 이어받은 것이다.
그 생성 스크립트는 `biblo_rims_aws/tools/` 에 있다 (`build_exec.mjs` · `build_net.mjs` 등).

## 4. 데이터 재생산 — 원천에서 화면까지

### 4-1. SGCPI+ 환산점수 (`bk21_tree.json`)

```
dev.paper_citation_metric (덤프)
   │  IF_PUB_RANK = "순위/전체"
   ├─ gen/pcm.py    형태 확인
   ├─ gen/pct.py    백분위 환산 → jrank.tsv (저널 4,216종 대표 백분위)
   │                ISSN 전파로 등급 회수 (미판정 42.3% → 5.5%)
   ├─ gen/score.py  SGCPI+ 배점표 적용 → bk21_tree_scored.json
   ├─ gen/agg2.py   학과·계열 집계
   └─ gen/enrich.py 신설 필드 부착 → bk21_tree.json
```

배점 기준은 [`score-standard.md`](./score-standard.md) 에 있다.
저널등급 g 는 계열별로 표가 다르고, 역할가중 w 는 주저자 1 · 공저자 1/2 이다.

### 4-2. AI 관련 논문

```
gen/extract.py  보드에서 논문 목록 추출 → papers.json
gen/tf.py       용어 빈도 → 규칙 후보
gen/rule.py     1군 38어 단순 매칭
gen/rule2.py    2군 문맥조건 · 회색 분리
gen/ai.py       판정 결과를 보드 데이터에 되먹임
```

규칙 전문은 [`ai-paper-rule.md`](./ai-paper-rule.md) 에 있다.
실측 30,872건 중 자동 1,775 · 회색 107(사람 확인 필요).

### 4-3. RQ · IQ · SQ 세부지표

```
gen/rq.py    RQ 를 학술지 · 학회 · AI 로 분해
gen/iqsq.py  저자 소속으로 IQ 해외공동연구 · SQ 산업계협업 판정
gen/cov.py   등급 커버리지 → pool.json
```

29지표 전수와 수집 여부는 [`sgcpi-indicator-map.md`](./sgcpi-indicator-map.md) 에 있다.

### 4-4. 대학 BK21 비교 (`ucmp.json`)

```
~/Downloads/BK4 학교 별 *.xlsx  (10파일)
   ├─ bk4/extract.py  명단 추출 → roster_raw.json (8개 대학 4,226명)
   │                  연세대·한양대는 성명이 마지막 열 덩어리에 있어 따로 판다
   ├─ bk4/map.py      학과 175종 → 표준분야 25종 (미분류 5.0%)
   ├─ bk4/mask.py     성명 가림 (성 1자 + *)
   ├─ bk4/inst.py     OpenAlex 기관 ID 조회
   ├─ bk4/build.sql   paper.oa_work × oa_work_author → bk21.univ_work (90만 행)
   ├─ bk4/agg.py      대학 · 연도 · 분야 집계
   └─ bk4/mkjson.py   → ucmp.json
```

`bk4/match.py` 는 인물 단위 매칭(학교·이름골격·분야·활동연도·규모·ORCID 채점)을 시도한 것인데
**검증하지 못했다.** OpenAlex 일일 예산이 소진돼(HTTP 429) 확인을 못 했다.
지금 화면은 인물 매칭 없이 **기관 단위 집계**만 쓴다.

### 4-5. 연구자 팝업 이식

```
v2/2026/biblo-researcher-perf.html  (슬라이드 16 원본)
   ├─ port/port.py     CSS · JS 분리
   ├─ port/scope.py    .rpwrap 스코프 + 충돌 클래스 8개 접두사
   └─ port/adapter.js  우리 데이터 → 원본 P 형태 (toPerfShape)
                       → build/oa.js 에 들어가 있음
```

원본과 닿는 곳은 어댑터 하나다. 원본 코드는 손대지 않았다.

## 5. 데이터 원천 접속

| 무엇 | 어디 |
|---|---|
| 논문 원천 | Supabase `zghartrwhjfqydlbhigs` · `paper` 스키마 |
| | `oa_work` 1억 772만 · `oa_work_author` 3억 2,641만 |
| 대학비교 산출물 | 같은 DB · `bk21.univ_work` (8개 대학 90만 행) |
| 덤프 | `biblo_rims_aws/biblo_rims_dev_20260820_174432.dump` (1.29GB) |
| 접속 문자열 | `~/Documents/biblo-운영/보안/BIBLO_접속정보.md` (깃 밖) |

긴 조회는 MCP 가 끊긴다. `psql` 로 직접 붙는다.

## 6. QA

`_src/qa/` 에 Playwright 스크립트 45개가 있다. 화면을 실제로 띄워 눌러 본다.

```bash
node v2/bk21/board/_src/qa/qa33.mjs
```

**DOM 에 있는지가 아니라 보이는 크기로 판정한다.** `getBoundingClientRect()` 를 쓴다.
노드 개수만 세다가 `hidden` 걸린 화면을 두 번 통과시킨 적이 있다.

## 7. 깃에 넣지 않는 것

`.gitignore` 로 뺐다.

| 대상 | 이유 |
|---|---|
| `_src/data/*.json` | 16MB · 교수 실명 포함 · 저장소가 공개 |

`data/` 원본은 `biblo_rims_aws/bk21-src/` 에 있다.

## 8. 저장소가 공개다

`github.com/tensw/digital_brosure` 는 **PUBLIC** 이다.
`v2/bk21/board/index.html` (17MB) 이 이미 커밋돼 있어 로그인 없이 받아진다.

```
$ curl -I https://raw.githubusercontent.com/tensw/digital_brosure/main/v2/bk21/board/index.html
200  16,997,835 bytes
```

biblo.ai 의 로그인 관문(`server.js` `GATED=['/2026','/admin','/bk21']`)은 **웹 제공만** 막는다.
깃허브에서 받아 가는 것은 막지 못한다. 그 파일 안에 성균관대 교수 성과 데이터와
타 대학 명단 4,226명(가림 처리분)이 들어 있다.

지우려면 이력을 다시 써야 하고(force push) 되돌릴 수 없어, 대표 판단 전에는 손대지 않았다.
고르는 안은 셋이다.

| 안 | 하는 일 | 걸리는 것 |
|---|---|---|
| 저장소를 비공개로 | `gh repo edit --visibility private` | EC2 가 git pull 로 배포 중이면 배포키 필요 |
| 보드만 이력에서 제거 | `git filter-repo` 후 force push | 되돌릴 수 없음 · 협업자 재클론 |
| 보드를 깃 밖으로 | `.gitignore` + 서버에 직접 올림 | 배포 절차가 갈라짐 |
