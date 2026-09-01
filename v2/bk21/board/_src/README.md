# BK21 대시보드 소스 — 정본

2026-09-02 이관. **이 폴더가 정본이다.**
`biblo.ai/bk21/board/` 화면을 만드는 모든 조각이 여기 있다.
`~/dev/biblo_rims_aws/bk21-src/` 에 있던 옛 소스는 더 쓰지 않는다.

## 구성

```
_src/
├─ build.sh            빌드기 (실행하면 ../index.html 생성)
├─ build/              화면 조각 16
│  ├─ head.html        CSS 전부 · 디자인 토큰
│  ├─ body.html        좌측 레일 · 화면 컨테이너
│  └─ *.js             화면 13 + 공통 3
├─ data/               데이터 14 (깃 제외 — 아래 참조)
└─ vercel-legacy/      옛 Vercel 프로젝트 부속 (안 씀)
```

## 빌드

```bash
bash _src/build.sh              # → v2/bk21/board/index.html
bash _src/build.sh --vercel     # 옛 Vercel 프로젝트용 사본도 함께
```

`build.sh` 가 하는 일은 셋이다.
1. `build/*.js` 를 `node --check` 로 문법 검사. 하나라도 깨지면 멈춘다
2. `data/*.json` 이 다 있는지 확인
3. `head.html` + `body.html` + `const 데이터` + `스크립트` 를 한 파일로 이어붙인다

산출물은 **17MB 단일 HTML** 하나다. 외부 요청 없이 혼자 뜬다.

## 화면을 새로 만들 때 손볼 곳 셋

하나라도 빠지면 `hidden` 이 안 풀려 **화면이 아예 안 보인다.** 실제로 `ucmp` 에서 겪었다.

| 순서 | 파일 | 넣을 것 |
|---|---|---|
| 1 | `build/body.html` | `<section id="v-이름" class="hidden">` |
| 2 | `build/vis.js` | `VIEWS` 에 등록 (좌측 레일 노출) |
| 3 | `build/exec.js` | `setView` 의 화면 목록 배열 |

데이터를 새로 붙일 때는 `build.sh` 의 `DATA` 에 `상수이름:파일명` 을 더한다.

## build/ 안에 무엇이 있나

| 파일 | 화면 |
|---|---|
| `app.js` | 성과관리 트리 · 개인 창 · 환산점수 내역 |
| `exec.js` | 경영자 KPI · SGCPI+ 환산 · 역량 레이더 · 화면 전환(`setView`) · 해시 라우팅 |
| `net.js` | 공저 관계망 |
| `glob.js` | 국제 협력 |
| `explore.js` | 분야 탐색 |
| `univ.js` | 대학 연구력 |
| `live.js` | 실시간 지표 |
| `sheet.js` | 대학별 성과표 |
| `oa.js` | 연구자 팝업 (슬라이드 16 이식본 · 어댑터 `toPerfShape`) |
| `pool.js` | 데이터풀 |
| `ucmp.js` | 대학 BK21 비교 |
| `src.js` | 데이터 출처 |
| `vis.js` | 좌측 레일 · 화면 숨김 |
| `boot.js` | 첫 화면 진입 · 로그아웃 |

## 깃에 넣지 않는 것 둘

`.gitignore` 로 뺐다. 저장소(`github.com/tensw/digital_brosure`)가 **공개**이기 때문이다.

| 대상 | 크기 | 어디 있나 |
|---|---:|---|
| `../index.html` (보드) | 17MB | 서버가 `/home/ubuntu/bk21-keep/` 에서 지킨다 |
| `data/*.json` | 16MB | `~/dev/biblo_rims_aws/bk21-src/` |

2026-09-02 에 **이력도 다시 썼다.** 보드 18개 판본 287MB 를 전 커밋에서 지웠다.

**`build.sh` 를 돌리고 푸시해도 서버 화면은 안 바뀐다.** 보드를 서버에 넣을 통로가 없다.
[`../../docs/source-map.md`](../../docs/source-map.md) §9 참조.

## 배포

푸시하면 GitHub Actions 가 EC2 에 붙어 `git reset --hard` 후 pm2 를 다시 띄운다.
보드는 깃이 모르는 파일이라 그 reset 이 지운다. 워크플로가 앞뒤로 옮겨 둔다.
제대로 도는지는 Actions 로그로 본다.

```bash
gh run view <실행번호> --log | grep '\[bk21\]'
```

잠긴 구간은 파일이 없어도 로그인 화면을 내주므로, 주소를 열어 보는 것으로는
보드가 살아 있는지 알 수 없다.

## 인증 경로

`boot.js` 는 **biblo.ai 기준**으로 박혀 있다 (`/api/auth/logout` · `/login/`).
옛 Vercel 것(`/api/logout` · `/login`)은 `build.sh --vercel` 이 되돌려 준다.
이관 초기에는 빌드 후 손으로 두 줄을 고쳐 붙였는데, 그 단계를 없앴다.

## vercel-legacy/ 는 안 돈다

`bk21-board.vercel.app` 에서 돌던 파일이다. biblo.ai(Node http)에서는 실행되지 않는다.

| 파일 | 원래 하던 일 | 지금 |
|---|---|---|
| `middleware.js` | 로그인 관문 | 안 씀. biblo.ai 관문이 `/bk21` 전체를 막는다 |
| `login.html` | 전용 로그인 화면 | 안 씀 |
| `api/login.js` `api/logout.js` | 쿠키 발급·삭제 | 안 씀 |
| `api/config.js` | 화면 숨김 설정 (Supabase) | **동작 안 함** |
| `vercel.json` `robots.txt` | 헤더·색인 | 안 씀 |

**화면 숨김 설정이 동작하지 않는다.** 대시보드가 `/api/config` 를 부르는데 biblo.ai 에 그 경로가 없다.
`try/catch` 로 감싸져 있어 화면은 멀쩡하고 기능만 빠진다.
숨김 목록은 비고(`VIS.hidden=[]`) 역할은 `user` 로 잡혀 우측 상단 설정 버튼이 안 보인다.
살리려면 서버에 `SB_URL` · `SB_SERVICE_KEY` 를 두고 `/api/config` 를 포팅해야 한다.
