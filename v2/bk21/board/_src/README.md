# bk21-board 원본 부속 파일

여기 있는 것은 **bk21-board.vercel.app 에서 돌던 파일들**이다. biblo.ai 에서는 실행되지 않는다.
Vercel Edge Function 과 미들웨어라 이 서버(Node http)에서는 동작하지 않기 때문이다.
기록과 참고용으로만 둔다.

| 파일 | 원래 하던 일 | biblo.ai 에서 |
|---|---|---|
| `middleware.js` | 로그인 관문 (쿠키 `bk21_s` 검증) | 안 씀. biblo.ai 자체 관문이 `/bk21` 전체를 막는다 |
| `login.html` | bk21-board 전용 로그인 화면 | 안 씀. biblo.ai 로그인을 쓴다 |
| `api/login.js` | 아이디·비번 확인, 서명 쿠키 발급 | 안 씀 |
| `api/logout.js` | 쿠키 삭제 | 안 씀. `/api/auth/logout` 으로 바꿔 이었다 |
| `api/config.js` | 화면 숨김 설정 읽기·쓰기 (Supabase) | **동작 안 함.** 아래 참조 |
| `vercel.json` | 헤더·rewrite | 안 씀 |

## 옮기면서 달라진 것 둘

**1. 화면 숨김 설정이 동작하지 않는다**
대시보드가 `/api/config` 를 부르는데 biblo.ai 에는 그 경로가 없다.
호출이 `try/catch` 로 감싸져 있어 **화면은 멀쩡하고 기능만 빠진다.**
숨김 목록은 비어 있고(`VIS.hidden=[]`), 역할은 `user` 로 잡혀 우측 상단 설정 버튼이 안 보인다.
살리려면 서버에 `SB_URL` · `SB_SERVICE_KEY` 를 두고 `/api/config` 를 포팅해야 한다.

**2. 로그아웃**
원본은 `/api/logout` 을 불렀다. biblo.ai 것(`/api/auth/logout`)으로 바꿔 이었다.
