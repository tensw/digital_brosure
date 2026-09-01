#!/bin/bash
# BK21 대시보드 빌드 — 조각(build/) + 데이터(data/) 를 한 파일로 합쳐 ../index.html 을 만든다.
#
# 정본은 이 폴더다. 다른 곳에 있는 옛 소스는 쓰지 않는다.
#   기본        biblo.ai/bk21/board/ 용  → ../index.html
#   --vercel    옛 Vercel 프로젝트용     → $VOUT (인증 경로만 되돌린 사본)
#
# 화면을 새로 만들면 손볼 곳이 세 군데다. 하나라도 빠지면 화면이 안 보인다.
#   1) build/body.html  에 v-<이름> 컨테이너
#   2) build/vis.js     VIEWS 등록
#   3) build/exec.js    setView 의 화면 목록
set -e
S="$(cd "$(dirname "$0")" && pwd)"
B="$S/build"; D="$S/data"
OUT="$S/../index.html"
VOUT=/Users/karis/dev/biblo_rims_aws/bk21-board/index.html

# 상수이름:파일명 — 순서가 곧 <script> 안 선언 순서다.
DATA="DATA:bk21_tree KPI:kpi NET:net RECO:reco GL:glob EX:explore FAI:fieldai TMAP:topicmap UV:univ FT:fieldtopic CONTACT:contact POOL:pool SRC:source UCMP:ucmp"
JS="app exec net glob explore univ live sheet oa pool ucmp src vis boot"

for f in $JS; do node --check "$B/$f.js" || exit 1; done
for d in $DATA; do
  f="$D/${d##*:}.json"
  [ -s "$f" ] || { echo "데이터 없음: $f"; exit 1; }
done

TMP="$S/.build.html"
{ cat "$B/head.html"; cat "$B/body.html"; printf '<script>\n'
  for d in $DATA; do printf 'const %s=' "${d%%:*}"; cat "$D/${d##*:}.json"; printf ';\n'; done
  for j in $JS; do cat "$B/$j.js"; done
  printf '\n</script>\n'; } > "$TMP"

cp "$TMP" "$OUT"

# 옛 Vercel 프로젝트는 로그아웃 경로가 다르다. 요청할 때만 사본을 만든다.
if [ "$1" = "--vercel" ]; then
  perl -0pe "s{'/api/auth/logout'}{'/api/logout'}g; s{location\.replace\('/login/'\)}{location.replace('/login')}g" \
    "$TMP" > "$VOUT"
  echo "Vercel 사본 $(du -h "$VOUT" | cut -f1)  $VOUT"
fi

rm -f "$TMP"
echo "빌드 완료 $(du -h "$OUT" | cut -f1)  $OUT"
