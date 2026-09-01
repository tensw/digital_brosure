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
    ├─ index.html      17MB         빌드 산출물 = 실제 서비스되는 화면 (깃 밖)
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

# 3) 조각만 올린다. 보드(index.html)는 깃을 타지 않는다
git add v2/bk21/board/_src/build/exec.js
git commit && git push origin main
```

**푸시해도 서버 화면은 바뀌지 않는다.** 보드를 서버에 넣을 통로가 아직 없다. §9 참조.

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

| 대상 | 크기 | 이유 |
|---|---:|---|
| `board/index.html` | 17MB | 저장소가 공개다. 교수 성과 데이터와 타 대학 명단이 든 파일 |
| `_src/data/*.json` | 16MB | 같은 이유 + 갱신마다 저장소가 불어난다 |

`data/` 원본은 `biblo_rims_aws/bk21-src/` 에 있다.
보드 사본은 `~/Documents/biblo-운영/백업/` 에 있다.

## 8. 보드는 서버가 깃 밖에서 지킨다

2026-09-02 처리. 저장소 `github.com/tensw/digital_brosure` 는 공개라
보드 17MB 가 로그인 없이 받아지고 있었다. 깃에서 뺐다.

**이력도 다시 썼다.** 18개 판본 287MB 를 전 커밋에서 지웠다.

| | |
|---|---|
| 백업 | `~/Documents/biblo-운영/백업/digital_brosure_20260902_071245.bundle` (153MB · 전체 이력) |
| 이력 잔존 | 0건 |
| `.git` | 253MB → 149MB |
| 깃허브 `main` | 404 |

옛 커밋 번호로는 아직 받아진다. 깃허브가 끊어진 객체를 바로 지우지 않기 때문이다.
스스로 청소될 때까지 둔다 (2026-09-02 대표 판단).

### 배포가 보드를 지키는 방식

보드는 깃이 모르는 파일이라 EC2 의 `git reset --hard` 가 지운다.
`.github/workflows/deploy.yml` 이 앞뒤로 옮겨 둔다.

```
배포 전   v2/bk21/board/index.html  →  /home/ubuntu/bk21-keep/index.html
          git fetch && git reset --hard origin/main      (보드가 지워짐)
배포 후   /home/ubuntu/bk21-keep/index.html  →  v2/bk21/board/index.html
          pm2 restart biblo-ai
```

제대로 도는지는 Actions 로그로 본다. 서버에 붙지 않고 확인할 수 있는 유일한 길이다.

```bash
gh run view <실행번호> --log | grep '\[bk21\]'
#   [bk21] 보관함에 넣음 16997835 bytes
#   [bk21] 제자리로 되돌림
#   [bk21] 최종 16997835 bytes
```

잠긴 구간은 **파일이 없어도 로그인 화면을 내준다.** 그래서 주소를 열어 보는 것으로는
보드가 살아 있는지 알 수 없다. 반드시 로그로 확인한다.

## 9. 보드를 갱신할 통로가 없다

화면을 고치고 `build.sh` 를 돌리면 **이 맥에만** 새 보드가 생긴다.
깃을 타지 않으므로 서버에는 옛 보드가 그대로 남는다.

이 맥에 EC2 접속 수단이 없다. `EC2_HOST` 와 `EC2_SSH_KEY` 는 GitHub Secrets 안에만
있고 다시 꺼내 볼 수 없다. 로컬 `.pem` 은 다른 인스턴스 것이라 거절당한다.

여는 방법은 둘이다.

| | 하는 일 | 이후 |
|---|---|---|
| EC2 키를 이 맥에 | AWS 콘솔에서 `54.180.31.32` 인스턴스의 키페어 `.pem` 확보 | `rsync` 한 줄로 올린다. 우회로가 없어진다 |
| 비공개 저장소 경유 | 보드를 비공개 저장소에 두고 배포 워크플로가 받아 서버로 올림 | 시크릿 하나 추가 필요 |

앞의 것이 낫다. 뒤의 것은 배포마다 17MB 가 한 번 더 오간다.
