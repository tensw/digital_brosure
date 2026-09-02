/* 사람 단위 답변 장치 (p01 꾸준함 · p02 대표작 · p03 점수 구성).
   자료: people.json (배포 때 서버가 보드에서 만든다 · 로그인 뒤에서만 읽힌다). 화면에는 미리 박지 않는다.
   흐름: 질문·주목 대상에서 이름을 찾는다 → 동명이인이면 학과·신분·논문 수로 고른다 → 사람 기록을 표로 바꿔 WIDGET 이 그림·표를 그린다 → 결론·요점·근거는 여기서 규칙으로 만든다.
   LLM 호출 0회. */
const PERSON = (() => {
  const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
  const TRN = { S: 'S등급', A: 'A등급', B: 'B등급', C: 'C등급', K: 'KCI', P: '학술대회', U: '미판정' };
  const N = v => v == null ? '—' : (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : v);
  const jo = (w, k) => { const t = String(w).trim().replace(/\s*\([^()]*\)$/, '').trim(), c = t.slice(-1).charCodeAt(0); let has = true;
    if (/[0-9]/.test(t.slice(-1))) { const d = t.slice(-1); has = !!({ '0':1,'1':1,'3':1,'6':1,'7':1,'8':1 })[d]; if (k === '로') return ({ '1':1,'7':1,'8':1 })[d] || !has ? '로' : '으로'; }
    else if (c >= 0xAC00 && c <= 0xD7A3) { const j = (c - 0xAC00) % 28; has = j !== 0; if (k === '로') return (j === 0 || j === 8) ? '로' : '으로'; }
    else if (/[A-Za-z]/.test(t.slice(-1))) { const cc = t.slice(-1), prev = t.slice(-2, -1);
      if (!/[A-Za-z]/.test(prev)) has = /[lmnr]/i.test(cc); else if (/e/i.test(cc)) has = /[nml]/i.test(prev); else has = /(n|m|l|ng|k|p|t)$/i.test(t);   /* 우리말로 읽을 때 받침이 남는 끝소리만 */
      if (k === '로') return has && !/l$/i.test(t) ? '으로' : '로'; }   /* ㄹ 받침(Michael → 마이클로)은 «로» */
    else if (k === '로') return '로';
    return k === '은' ? (has ? '은' : '는') : k === '이' ? (has ? '이' : '가') : k === '과' ? (has ? '과' : '와') : (has ? '을' : '를'); };
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const who = p => `${p.n}(${p.d} · ${p.k})`;
  const SUF = /(교수님|교수|박사님|박사|선생님|연구원|대학원생|학생|님|씨)$/;
  const norm = s => String(s || '').replace(/\s+/g, '').toUpperCase();
  const clean = s => norm(String(s || '').replace(/\s+/g, '').replace(SUF, ''));
  const STOP = /^(이|그|저|우리|해당|참여|신진|지도|담당|이번|지난|모든|어느|무슨|같은|다른|전체|학과|전공|대학|학부|연구|논문|점수|대표작|교내|교외)$/;
  const DEPTLIKE = /(학과|전공|학부|대학|대학원|연구소|센터|과|과정|급|생|원|장|대)$/;
  /* 사람 이름꼴: 성씨로 시작하고 일반어가 아니다 (박사과정·석사·신임·우수처럼 호칭 앞에 오는 보통 낱말을 이름으로 보지 않기 위해) */
  const SUR = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민나진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부가복태목형피두감';
  const SUR2 = /^(남궁|황보|제갈|선우|독고|사공|서문|동방|망절)/;
  const WORD = /^(박사과정|석사과정|석박사|석사|박사|신임|신진|우수|외국인|여성|남성|젊은|전임|겸임|초빙|명예|정년|퇴직|선임|책임|주임|담당|소속|참여|지도|신규|기존|해당|우리|모든|어떤|어느|각|본|타|귀|이번|지난|다른|같은|전체|일반|특임|산학|연구|강의|객원|방문|정교수|부교수|조교수|석좌|교내|교외|국내|해외|외부|내부|지도|공동|주저자|교신|제1)$/;
  const nameLike = (t, sur) => !WORD.test(t) && (SUR2.test(t) || SUR.includes(t[0]) || (sur && sur.has(t[0])));
  /* 질문 문장·주목 대상에서 사람 이름을 찾는다.
     ① 주목 대상(라우터가 뽑은 것)과 자료 이름이 정확히 같을 때 ② «OOO 교수» 꼴 낱말이 자료 이름과 정확히 같을 때
     ③ 세 글자 이상인 자료 이름이 문장 안에 낱말로 들어 있을 때(앞이 한글이 아니고, 뒤는 호칭·조사이거나 한글이 아님)
     두 글자 이름은 다른 이름의 앞부분과 겹치므로 ①②로만 찾는다. 찾은 이름이 둘 이상이면 첫 이름으로 답하고 나머지는 extra 로 돌려준다 */
  function findName(db, focus, q) {
    const idx = db._idx || (db._idx = (() => { const m = new Map(); db.people.forEach(p => { const k = norm(p.n); if (!m.has(k)) m.set(k, p.n); }); return m; })());
    const sur = db._sur || (db._sur = new Set(db.people.map(p => p.n[0]).filter(c => /[가-힣]/.test(c))));   /* 자료에 있는 성씨 */
    const found = [], add = (n, how) => { if (!found.some(f => f.name === n)) found.push({ name: n, how }); };
    for (const f of (focus || [])) { const c = clean(f); if (c && idx.has(c)) add(idx.get(c), 'focus'); }
    const Q = String(q || ''), toks = [];
    const re = /(?:^|[^가-힣A-Za-z])([가-힣]{2,5})\s*(?:교수님|교수|박사님|박사|선생님|연구원|대학원생|학생|님|씨)/g; let m;
    while ((m = re.exec(Q))) { const raw = m[1], cs = [raw, raw.replace(/의$/, '')].filter((t, i, a) => t.length >= 2 && a.indexOf(t) === i);
      const hit = cs.find(t => !STOP.test(t) && !WORD.test(t) && idx.has(norm(t)));
      if (hit) toks.push(hit); else { const t = cs[cs.length - 1]; if (t.length <= 4 && !STOP.test(t) && !DEPTLIKE.test(t) && nameLike(t, sur)) toks.push(t); } }
    toks.forEach(t => { if (idx.has(norm(t))) add(idx.get(norm(t)), 'q'); });
    /* 로마자 이름: 로마자 낱말 묶음을 (긴 것부터) 자료 이름과 맞춰 본다. 띄어쓰기·대소문자는 무시한다 */
    const reL = /[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)*/g;
    while ((m = reL.exec(Q))) { const ws = m[0].split(/\s+/); let got = false;
      for (let len = ws.length; len >= 1 && !got; len--) for (let i = 0; i + len <= ws.length && !got; i++) { const k = norm(ws.slice(i, i + len).join('')); if (k.length >= 3 && idx.has(k)) { add(idx.get(k), 'q'); got = true; } } }
    if (!found.length) { const cands = [];
      idx.forEach((n, k) => { if (n.replace(/\s/g, '').length < 3) return; let i = -1;
        while ((i = Q.indexOf(n, i + 1)) >= 0) { const before = Q[i - 1] || '', after = Q.slice(i + n.length);
          if (!/[가-힣A-Za-z]/.test(before) && (!/^[가-힣]/.test(after) || /^(교수|박사|선생|연구원|대학원생|학생|님|씨|의|은|는|이|가|을|를|과|와|도|께)/.test(after))) { cands.push({ name: n, i }); break; } } });
      cands.sort((x, y) => x.i - y.i || y.name.length - x.name.length).forEach(c => add(c.name, 'q')); }
    if (found.length) return { ...found[0], extra: found.slice(1).map(f => f.name) };
    /* 자료에 없는 이름이라도 «OOO 교수» 꼴이면 그 이름을 돌려준다 (없다는 답을 이름으로 하기 위해) */
    if (toks.length) return { name: toks[0], how: 'q', missing: true, extra: [] };
    return null;
  }
  /* 동명이인: 질문에 나온 학과 → 신분 낱말(교수·학생) → 논문이 있는 쪽 → 교원 우선 → 논문 많은 쪽 */
  function pick(hits, focus, q) {
    const text = [String(q || ''), ...(focus || [])].join(' ');
    let c = hits, why = [];
    const byD = c.filter(p => { const ab = p.d.replace(/(학과|전공)$/, ''); return text.includes(p.d) || (ab.length >= 2 && text.includes(ab)); });
    if (byD.length && byD.length < c.length) { c = byD; why.push('질문에 나온 학과'); }
    const stu = /학생|대학원생|석사|박사과정/.test(text), prof = /교수|교원|연구원/.test(text);
    if (c.length > 1 && (stu || prof)) { const f = c.filter(p => stu ? p.k === '대학원생' : p.k !== '대학원생'); if (f.length && f.length < c.length) { c = f; why.push(stu ? '질문의 «학생»' : '질문의 «교수»'); } }
    if (c.length > 1) { const f = c.filter(p => p.np > 0); if (f.length && f.length < c.length) { c = f; why.push('논문이 있는 쪽'); } }
    if (c.length > 1) { const f = c.filter(p => p.k !== '대학원생'); if (f.length && f.length < c.length) { c = f; why.push('교원 우선'); } }
    if (c.length > 1) { c = c.slice().sort((a, b) => b.np - a.np).slice(0, 1); why.push('논문이 많은 쪽'); }
    return { p: c[0], why, others: hits.filter(p => p !== c[0]) };
  }
  function find(db, focus, q) {
    const f = findName(db, focus, q); if (!f) return { err: 'noname' };
    const hits = db.people.filter(p => p.n === f.name); if (!hits.length) return { err: 'nohit', name: f.name, extra: f.extra || [] };
    const r = hits.length === 1 ? { p: hits[0], why: [], others: [] } : pick(hits, focus, q);
    return { ...r, name: f.name, n: hits.length, extra: f.extra || [] };
  }

  /* 사람 기록 → 위젯이 먹는 표(rec2 · a2). 결론·요점·근거는 아래 규칙으로 */
  function table(rec, p) {
    if (rec.id === 'p01_person_year') return { rec2: { ...rec, case: 'trend', widget: 'line', axes: ['person', 'y'] },
      a2: { cols: ['person', 'y'], measures: ['paper_count'], n: 6, rows: YEARS.map((y, i) => [[p.n, String(y)], p.yr[i]]), capped: false } };
    if (rec.id === 'p02_person_top') return { rec2: { ...rec, case: 'rank', widget: 'bar_h', axes: ['person', 'paper'] },
      a2: { cols: ['paper'], measures: ['citations'], n: p.np, rows: p.top.map(t => [[`${t.t.length > 60 ? t.t.slice(0, 59).trimEnd() + '…' : t.t} (${t.y})`], t.c]), capped: p.np > p.top.length } };
    const trs = Object.entries(p.tr).map(([k, v]) => [[TRN[k] || k], v[1], v[0]]).sort((a, b) => b[1] - a[1]);
    return { rec2: { ...rec, case: 'share', widget: 'stack100', axes: ['person', 'tr'] },
      a2: { cols: ['tr'], measures: ['score', 'paper_count'], n: trs.length, rows: trs, capped: false } };
  }
  function answer(rec, p, o) {
    const W = who(p), P = [], K = [], L = [];
    if (p.dup) L.push(`자료에 같은 논문이 ${p.dup}편 겹쳐 실려 있습니다. 편수·점수·피인용은 보드와 같게 겹친 채로 셌고, 대표작 목록은 한 편씩만 보입니다 (상위 몫도 그 목록으로 계산).`);
    if (!p.np) { o.headline = `${W}${jo(W, '은')} 2020–2025년 자료에 논문이 없습니다`; o.points = []; o.kpi = [{ l: '논문', v: '0편', s: '2020–2025' }]; o.plims = L.concat(['논문이 없어 표와 그림이 없습니다.']); o.who = W; o.fig = ''; o.table = ''; return o; }
    if (rec.id === 'p01_person_year') {
      const yrs = p.yr, tot = yrs.reduce((a, b) => a + b, 0), on = yrs.filter(v => v > 0).length, mx = Math.max(...yrs), mn = Math.min(...yrs);
      const iMx = yrs.indexOf(mx), zeros = YEARS.filter((y, i) => !yrs[i]), a3 = yrs.slice(0, 3).reduce((a, b) => a + b, 0), b3 = yrs.slice(3).reduce((a, b) => a + b, 0);
      o.headline = tot ? `${W}${jo(W, '은')} ${on === 6 ? '2020–2025년 여섯 해 모두' : `6개 연도 중 ${on}개 연도에`} 논문이 있고, 한 해 ${mn}–${mx}편입니다` : `${W}${jo(W, '은')} 2020–2025년에 잡힌 논문이 없습니다`;
      if (tot) { P.push(`가장 많은 해는 ${YEARS[iMx]}년 ${mx}편입니다.`);
        if (zeros.length) P.push(`논문이 없는 해: ${zeros.map(y => y + '년').join(' · ')}.`);
        P.push(`최근 3년(2023–2025) ${b3}편, 앞 3년(2020–2022) ${a3}편${a3 ? `으로 ${b3 >= a3 ? '+' : ''}${pct(b3 - a3, a3)}%` : ''}입니다.`);
        P.push(`2025년은 ${yrs[5]}편입니다 (집계 중이라 낮게 보일 수 있습니다).`); }
      K.push({ l: '6년 합계', v: `${N(tot)}편`, s: on === 6 ? '여섯 해 모두 논문' : `${on}개 연도에 논문` }); if (tot) K.push({ l: '최다 해', v: `${YEARS[iMx]}년`, s: `${mx}편` }); K.push({ l: '최근 3년', v: `${N(b3)}편`, s: a3 ? `앞 3년 ${a3}편 대비 ${b3 >= a3 ? '+' : ''}${pct(b3 - a3, a3)}%` : '앞 3년 0편' });
    } else if (rec.id === 'p02_person_top') {
      const t = p.top, tc = t.reduce((a, x) => a + x.c, 0), t0 = t[0];
      if (!t0 || !t0.c) { o.headline = `${W}${jo(W, '은')} 피인용이 기록된 논문이 없습니다 (논문 ${p.np}편)`; o.points = []; }
      else { o.headline = `${W}의 대표작(피인용 기준)은 «${t0.t}» (${t0.j}, ${t0.y}) ${N(t0.c)}회입니다`;
        P.push(`대표작의 등급은 ${TRN[t0.tr] || t0.tr}, 역할은 ${t0.r}입니다.`);
        if (t[1]) P.push(`다음은 «${t[1].t}» (${t[1].y}) ${N(t[1].c)}회${t[2] ? `, «${t[2].t}» (${t[2].y}) ${N(t[2].c)}회` : ''}입니다.`);
        if (p.cite) P.push(`상위 ${t.length}편의 피인용 ${N(tc)}회는 전체 ${N(p.cite)}회의 ${pct(tc, p.cite)}%입니다.`); }
      if (t0 && t0.c) K.push({ l: '대표작 피인용', v: `${N(t0.c)}회`, s: `${t0.y}년 · ${TRN[t0.tr] || t0.tr} · ${t0.r}` }); else K.push({ l: '논문', v: `${N(p.np)}편`, s: '피인용 기록 0회' });
      K.push({ l: '전체 피인용', v: `${N(p.cite)}회`, s: `논문 ${N(p.np)}편` }); if (p.cite) K.push({ l: `상위 ${t.length}편 몫`, v: `${pct(tc, p.cite)}%`, s: `${N(tc)}회 ÷ ${N(p.cite)}회` });
      if (p.np > t.length) L.push(`표는 피인용 상위 ${t.length}편만 담았습니다 (전체 ${N(p.np)}편).`);
    } else {
      const trs = Object.entries(p.tr).sort((a, b) => b[1][1] - a[1][1]), top = trs[0], sum = p.sum, zn = Object.values(p.z).reduce((a, b) => a + b, 0);
      const roles = Object.entries(p.r).sort((a, b) => b[1][1] - a[1][1]), ties = trs.filter(x => x[1][1] === top[1][1]), tn = k => TRN[k] || k;   /* 점수가 같은 등급은 함께 적는다 */
      o.headline = sum ? `${W}의 논문별 환산점수 합은 ${N(sum)}점이고, ${ties.map(([k, v]) => `${tn(k)} ${v[0]}편`).join(' · ')}이 ${ties.length > 1 ? '각각 ' : ''}${pct(top[1][1], sum)}%를 냅니다` : `${W}${jo(W, '은')} 점수가 잡힌 논문이 없습니다 (논문 ${p.np}편)`;
      if (trs.length > 1 && sum) P.push(`등급별: ${trs.map(([k, v]) => `${TRN[k] || k} ${v[0]}편 ${N(v[1])}점`).join(' · ')}.`);
      if (roles.length) P.push(`역할별: ${roles.map(([k, v]) => `${k} ${v[0]}편 ${N(v[1])}점`).join(' · ')}.`);
      if (zn) P.push(`0점 논문 ${zn}편: ${Object.entries(p.z).sort((a, b) => b[1] - a[1]).map(([k, v]) => `«${k}» ${v}편`).join(', ')}.`);
      K.push({ l: '논문별 환산점수 합', v: `${N(sum)}점`, s: `논문 ${N(p.np)}편` }); if (sum) K.push(ties.length > 1 ? { l: '가장 큰 등급 (동률)', v: ties.map(([k]) => tn(k)).join(' · '), s: `각 ${pct(top[1][1], sum)}%` } : { l: '가장 큰 등급', v: tn(top[0]), s: `${top[1][0]}편 · ${pct(top[1][1], sum)}%` }); K.push({ l: '0점 논문', v: `${zn}편`, s: p.np ? `${pct(zn, p.np)}%` : '' });
      if (p.RQ != null) { const band = p.pct == null ? '' : p.pct < 10 ? '학과 상위 10%' : p.pct < 25 ? '학과 상위 25%' : p.pct < 50 ? '학과 상위 50%' : '학과 50% 밖';
        K.push({ l: '보드 표시 환산점수', v: `${N(Math.round(p.RQ))}점`, s: band ? `${band} (순위 아님)` : p.ai ? '가산 포함' : Math.round(p.RQ) !== sum ? '반올림' : '논문별 합과 같음' });
        const ai = p.ai || 0, gap = Math.round((p.RQ - sum - ai) * 10) / 10;
        const rd = Math.round(p.RQ), ex = Math.round((sum + ai) * 10) / 10;
        if (ai) L.push(`보드 표시 환산점수 ${N(rd)}점은 논문별 환산점수 합 ${N(sum)}점에 AI 분야 논문 가산 ${N(ai)}점을 더한 ${ex !== rd ? `${N(ex)}점을 반올림한 ` : ''}값입니다.`);
        else if (Math.abs(gap) <= 0.05 && ex !== rd) L.push(`보드 표시 환산점수 ${N(rd)}점은 논문별 환산점수 합 ${N(sum)}점을 반올림한 값입니다.`);
        if (Math.abs(gap) > 0.05) L.push(`보드 표시 환산점수와 논문별 환산점수 합${ai ? '·가산' : ''}이 ${N(Math.abs(gap))}점 다릅니다.`); }
    }
    o.points = P; o.kpi = K.slice(0, 4); o.plims = L; o.who = W; return o;
  }
  return { find, table, answer, who, jo, YEARS };
})();
if (typeof module !== 'undefined') module.exports = PERSON;
