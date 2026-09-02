#!/usr/bin/env node
/* 사람 단위 답변(p01~p03)용 people.json 을 만든다.
   입력: bk21_tree.json 또는 보드 index.html(안에 박힌 const DATA=…;) · 출력: people.json
   공개 저장소에 두지 않는다(.gitignore). 배포 때 서버에서 보드 html 로부터 만들어 /bk21/board/people.json 로 두고 로그인 뒤에서만 읽는다.
   빼는 것: sid · 이메일 · 영문 이름 · 학위 · 재학 기간. 남기는 것: 이름 · 학과 · 신분 · 연도별 편수 · 상위 논문 5 · 등급별/역할별 점수 · 0점 사유 · 보드 점수 */
const fs = require('fs');
const [,, src, out] = process.argv;
if (!src || !out) { console.error('usage: build_people.js <bk21_tree.json|index.html> <people.json>'); process.exit(2); }
const raw = fs.readFileSync(src, 'utf8');
let T;
if (/\.html?$/i.test(src)) {
  const i = raw.indexOf('const DATA='); if (i < 0) { console.error('const DATA= 없음'); process.exit(1); }
  const j = raw.indexOf(';\n', i); T = JSON.parse(raw.slice(i + 11, j));
} else T = JSON.parse(raw);
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025], P = T.papers || {};
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };   /* 긴 제목은 말줄임표로 */
const KIND = p => p.part === '대학원생' ? '대학원생' : p.kind === 'jr' ? '신진연구인력' : p.kind === 'prof' ? '참여교수' : (p.pos || p.part || '구성원').replace(/^신진$/, '신진연구인력');
const people = [];
function one(p, dept) {
  const L = P[p.sid] || [], yr = YEARS.map(y => L.filter(x => +x.y === y).length);
  const tr = {}, rl = {}, z = {}; let sum = 0;
  L.forEach(x => { const s = +x.sc || 0; sum += s;
    (tr[x.tr] = tr[x.tr] || [0, 0]); tr[x.tr][0]++; tr[x.tr][1] += s;
    (rl[x.r] = rl[x.r] || [0, 0]); rl[x.r][0]++; rl[x.r][1] += s;
    if (!s) { const w = x.why || '사유 없음'; z[w] = (z[w] || 0) + 1; } });
  Object.values(tr).forEach(a => a[1] = Math.round(a[1] * 10) / 10); Object.values(rl).forEach(a => a[1] = Math.round(a[1] * 10) / 10);
  const seen = new Set(), U = L.filter(x => { const k = String(x.doi || '').toLowerCase() || (String(x.t || '').toLowerCase() + '|' + x.y); if (seen.has(k)) return false; seen.add(k); return true; });
  const top = U.slice().sort((a, b) => (b.c || 0) - (a.c || 0) || (+b.y) - (+a.y)).slice(0, 5)
    .map(x => ({ t: cut(x.t, 90), j: cut(x.j, 60), y: +x.y, c: x.c || 0, tr: x.tr, r: x.r }));
  const o = { n: p.name, d: dept, k: KIND(p), yr, np: L.length, cite: p.cite || 0, top, tr, r: rl, z, sum: Math.round(sum * 10) / 10 };
  if (L.length > U.length) o.dup = L.length - U.length;
  if (p.RQ != null) { o.RQ = Math.round(p.RQ * 10) / 10; if (p.RQ_ai) o.ai = Math.round(p.RQ_ai * 10) / 10; }   /* 보드가 보여주는 환산점수(RQ = 논문별 합 + AI 가산) */
  if (p.Spct != null) o.pct = p.Spct;
  people.push(o);
}
Object.entries(T.depts || {}).forEach(([d, dd]) => {
  (dd.profs || []).forEach(p => { one(p, d); (p.kids || []).forEach(k => one(k, d)); });
  (dd.unassigned || []).forEach(u => one(u, d));
});
const names = {}; people.forEach(p => names[p.n] = (names[p.n] || 0) + 1);
const dup = Object.values(names).filter(c => c > 1).length;
const doc = { built: new Date().toISOString().slice(0, 10), period: [YEARS[0], YEARS[YEARS.length - 1]], n: people.length, dup, people };
fs.writeFileSync(out, JSON.stringify(doc));
console.log(`people.json 사람 ${people.length}명 (동명 ${dup}) · ${(fs.statSync(out).size / 1024).toFixed(0)}KB`);
