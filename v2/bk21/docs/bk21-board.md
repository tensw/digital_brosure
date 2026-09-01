# bk21-board 운영 기록

정리 2026-09-01 · 대상 https://bk21-board.vercel.app

BK21 학과·교수·연구원 성과관리 대시보드. 배포와 연동, 지금까지의 작업 내역을 한곳에 적어 둔다.

## 1. 어디에 있나

| | |
|---|---|
| 소스 폴더 | `/Users/karis/dev/biblo_rims_aws/bk21-board` |
| 주소 | https://bk21-board.vercel.app |
| Vercel 팀 | tensw (`team_HYPWxAYan0Mr2zS9qIGosroW`) |
| Vercel 프로젝트 | bk21-board (`prj_i5xMvvRdu9BPZhhcjvFy4yjdGbrL`) |
| 관리 화면 | https://vercel.com/tensw/bk21-board |

**깃 저장소가 아니다.** 이 폴더도, 상위 `biblo_rims_aws` 도 버전관리 밖에 있다.
되돌릴 수단은 Vercel 롤백뿐이다.

## 2. 파일 구성

```
bk21-board/
  index.html      13,238,510자 (14MB)   대시보드 본체. 데이터가 파일 안에 통째로 박혀 있다
  login.html      43KB                  로그인 화면
  middleware.js   2KB                   관문. 요청이 파일에 닿기 전에 막는다
  api/
    login.js      아이디·비번 확인 → 서명 쿠키 발급
    logout.js     쿠키 삭제
    config.js     «일반 사용자에게 숨길 화면» 목록 읽기·쓰기
  vercel.json     헤더·rewrite·cleanUrls
  robots.txt
  .vercel/        프로젝트 연결 정보
```

## 3. 인증 구조

로그인은 **HMAC-SHA256 서명 쿠키** 방식이다. 세션 저장소가 없고 쿠키 자체가 증명이다.

```
로그인  POST /api/login   {id, pw}
        → AUTH_USERS 에서 대조
        → payload {u, role, exp} 를 AUTH_SECRET 으로 서명
        → 쿠키 두 장 발급
             bk21_s  HttpOnly·Secure·SameSite=Lax   관문 검증용 (스크립트가 못 읽음)
             bk21_u  Secure·SameSite=Lax            화면 표시용 (스크립트가 읽음)
        → 유효기간 7일

관문   middleware.js 가 모든 경로에서 bk21_s 를 검증
       열린 경로: /login, /login.html, /api/login, /api/logout, /robots.txt
       실패하면 302 → /login?next=<원래주소>

로그아웃 POST /api/logout → 두 쿠키 Max-Age=0
```

비밀번호가 틀리면 **600ms 지연**을 준다. 무차별 대입을 늦추기 위한 것.

역할은 `user` 와 `admin` 두 가지. 화면 숨김 설정 저장은 `admin` 만 된다.

## 4. 환경변수 (Vercel 프로젝트에 설정)

값은 여기 적지 않는다. 이름과 쓰임만 남긴다.

| 이름 | 쓰임 | 없으면 |
|---|---|---|
| `AUTH_SECRET` | 쿠키 서명·검증 키 | **관문이 통째로 열린다** (아래 4-1 참조) |
| `AUTH_USERS` | 계정 목록. 형식 `아이디:비번:역할,아이디:비번:역할` | 로그인 불가 |
| `SB_URL` | Supabase 프로젝트 주소 | 화면 숨김 설정 읽기·쓰기 불가 |
| `SB_SERVICE_KEY` | Supabase service_role 키 | 위와 같음 |

### 4-1. 위험한 기본값

`middleware.js` 에 이 줄이 있다.

```js
const secret = process.env.AUTH_SECRET;
if (!secret) return;   // 비밀키가 없으면 관문을 걸지 않는다(설정 누락 시 잠김 방지)
```

`AUTH_SECRET` 이 빠지면 로그인이 풀리고 **전체가 공개된다.** 설정 누락으로 못 들어가는 것을 막으려던 것인데, 사고는 반대 방향으로 난다. 잠기는 쪽으로 바꾸는 것이 맞다.

## 5. Supabase 연동

화면 숨김 설정 하나만 외부에 저장한다. 대시보드 데이터는 Supabase 를 쓰지 않는다.

| | |
|---|---|
| 테이블 | `bk21_ui_visibility` |
| 행 | `id = 1` 한 줄만 쓴다 |
| 칼럼 | `hidden`(문자열 배열) · `updated_at` · `updated_by` |
| 읽기 | 로그인한 사람 누구나 (`GET /api/config`) |
| 쓰기 | `admin` 역할만 (`POST /api/config`) |
| 상한 | 한 번에 500개까지 |

접근은 서버(Edge Function)에서 `SB_SERVICE_KEY` 로 직접 REST 를 부른다. 브라우저에는 키가 나가지 않는다.

## 6. 대시보드 구성

`index.html` 안에 화면과 데이터가 함께 들어 있다. script 블록 하나가 13,065,074자다.

주요 화면
- SKKU BK21 학과별·교수·연구원 성과관리
- SKKU BK21 KPI
- SKKU BK21(교내) 공저자 관계망
- SKKU 글로벌 공저자 관계망
- 글로벌 분야 공저자 탐색
- 대학 연구력 비교
- 대학별 성과표

데이터 변수 52개가 파일에 박혀 있다. 큰 것부터
`DATA`(@173KB, 대시보드 본체 데이터) · `KPI`(@9.87MB) · `NET`(공저 관계망) ·
`RECO`(추천) · `GL`(글로벌) · `EX` · `FAI` · `TMAP` · `UV` · `FT` · `CONTACT` · `POOL`

데이터를 갱신하려면 이 파일을 다시 만들어 통째로 배포하는 구조다.

## 7. 배포 내역

전부 **같은 계정 · 깃 연동 없이 CLI 로 직접** 올렸다.

| | |
|---|---|
| 배포 계정 | chkim-4639 · ch.kim@tsw.im |
| 배포 주체 | `claude-code_…_agent` (클로드가 CLI 로 실행) |
| 최근 20건 | 전부 production, 전부 READY |

최근 배포
- 2026-08-28 02:57
- 2026-08-28 02:36
- 2026-08-27 07:56
- 2026-08-27 05:54
- 2026-08-25 18:21

로컬 파일 최종 수정
- `index.html` 2026-08-28 02:55
- `middleware.js` 2026-08-27 07:25
- `login.html` · `vercel.json` 2026-08-27 07:22
- `api/` 2026-08-27 07:44
- `robots.txt` 2026-08-24 06:02

## 8. vercel.json 설정

```json
headers  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
         Referrer-Policy: no-referrer
         X-Content-Type-Options: nosniff
rewrites /login → /login.html
cleanUrls true
```

검색엔진 색인을 막아 뒀다. 참조자 정보도 밖으로 안 나간다.

## 9. 지금 걸리는 것

**① 버전관리가 없다**
14MB `index.html` 이 이 맥북에만 있다. 지우면 끝이다. Vercel 롤백은 배포본만 되돌릴 뿐, 소스를 되찾아 주지 않는다.

**② 관문이 꺼질 수 있다**
`AUTH_SECRET` 이 빠지면 전체가 공개된다. 4-1 참조.

**③ 데이터 갱신이 통짜 배포다**
숫자 하나 바꾸려면 14MB 파일을 다시 만들어 전체를 올려야 한다. 무엇이 바뀌었는지 남지 않는다.

**④ 계정이 환경변수 평문이다**
`AUTH_USERS` 에 아이디와 비밀번호가 그대로 들어간다. 해시가 아니다. Vercel 대시보드를 볼 수 있는 사람은 비밀번호를 그대로 본다.

## 10. 손볼 순서 (제안)

1. 폴더를 깃에 올린다. 14MB 파일은 Git LFS 나 별도 데이터 파일로 뺀다
2. `AUTH_SECRET` 없을 때 열지 말고 막는다 (`return Response.redirect(...)`)
3. `AUTH_USERS` 를 해시로 바꾼다
4. 데이터를 파일에서 분리해 갱신 때 전체 배포를 피한다

## 11. biblo.ai 로 옮긴 기록 (2026-09-01)

`bk21-board.vercel.app` 의 내용을 `biblo.ai/bk21` 안으로 그대로 가져왔다.
원본 Vercel 배포는 그대로 두었다. 둘이 병존한다.

| 여기 | 무엇 |
|---|---|
| `/bk21/` | 자료 목록 |
| `/bk21/board/` | 대시보드 본체 (`index.html` 13,238,516자) |
| `/bk21/board/_src/` | 원본 부속 파일 (관문·로그인·API). **실행되지 않는다.** 기록용 |
| `/bk21/docs/` | 이 문서 |

### 옮기며 바꾼 것 두 줄

```
'/api/logout'                →  '/api/auth/logout'      biblo.ai 로그아웃으로 연결
location.replace('/login')   →  location.replace('/login/')
```

그 외 13MB 본문은 손대지 않았다.

### 옮겨서 달라진 것

**① 로그인이 biblo.ai 것으로 바뀐다**
원본의 관문(`middleware.js`)과 로그인 화면은 Vercel Edge 에서만 돈다.
biblo.ai 에서는 `server.js` 의 `GATED` 목록에 `/bk21` 을 넣어 막는다.
계정도 biblo.ai 계정을 쓴다. `AUTH_USERS` 는 여기서 쓰이지 않는다.

**② 화면 숨김 설정이 동작하지 않는다**
대시보드가 `/api/config` 를 부르는데 biblo.ai 에 그 경로가 없다. `try/catch` 로 감싸져 있어
화면은 멀쩡하고 기능만 빠진다. 숨김 목록은 빈 배열, 역할은 `user` 로 잡혀 설정 버튼이 안 보인다.
살리려면 서버에 `SB_URL`·`SB_SERVICE_KEY` 를 두고 `/api/config` 를 포팅해야 한다.

**③ 논문 검색은 그대로 된다**
브라우저에서 Supabase RPC(`search_papers_exact` 등)를 직접 부른다.
공개키(`sb_publishable_…`)만 쓰고 그 함수들은 SECURITY DEFINER + anon 허용이라 옮겨도 그대로 동작한다.

### 확인한 것

- 로그인 없이 `/bk21`, `/bk21/board/`, `/bk21/board/index.html`, `/bk21/docs/*.md` 전부 막힘
- 대시보드 렌더 정상 — 좌측 8개 화면, 카드 16개, 실패한 요청 0건
- 유일한 콘솔 오류는 `/api/config` 호출 하나. 위 ②번 그대로다

### 남는 문제

`index.html` 14MB 가 깃에 들어갔다. 한 번은 괜찮지만 **갱신할 때마다 14MB 가 새로 쌓인다.**
데이터를 파일에서 분리하거나 Git LFS 로 빼는 것이 맞다.
