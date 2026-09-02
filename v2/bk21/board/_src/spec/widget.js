/* ══════════════════════════════════════════════════════════════════
   답변 위젯 엔진 (CMS형 답변).

   위젯 = 그래프형 (widgets.json 의 widgets). 데이터 모양이 정한다.
   의도 = 정렬·강조·결론 규칙 (widgets.json 의 intents). 질문이 정한다.

   WIDGET.build(recipe, answer, cx) →
     { widget, intent, headline, points[], kpi[{l,v,s}], fig(html), table(html), lims[] }

   fig 는 보드 CSS 문법으로 그린 HTML 이다. iframe 안에서 보드 CSS 와 같이 그린다.
   cx = { me:'성균관대', focus:[…], M:id→{n,u,d}, AX:id→이름, W:widgets, I:intents }
   ══════════════════════════════════════════════════════════════════ */
const WIDGET = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const N = v => v == null ? '—' : (typeof v === 'number'
    ? v.toLocaleString(undefined, { maximumFractionDigits: v >= 100 ? 0 : 2 }) : String(v));
  const labs = r => Array.isArray(r[0]) ? r[0] : [r[0]];
  const lab = r => labs(r).join(' · ');
  const val = (r, i) => { const v = r[1 + (i || 0)]; return typeof v === 'number' ? v : null; };
  const nums = (rows, i) => rows.map(r => val(r, i)).filter(v => v != null);
  const sum = a => a.reduce((s, v) => s + v, 0);
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const sgn = v => (v >= 0 ? '+' : '') + v;
  const X = v => N(v >= 10 ? Math.round(v) : v >= 3 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100);   /* 배수: 10 이상 정수, 3 이상 소수 1자리, 그 밑 2자리 */
  const dv = v => v == null ? v : v >= 100 ? Math.round(v) : Math.round(v * 100) / 100;   /* 표에 보이는 값 (N 과 같은 자릿수) */
  const RX = (a, b) => X(dv(a) / dv(b));   /* 배수는 표에 보이는 값끼리 나눈다 */
  const median = a => { const v = a.slice().sort((x,y) => x-y), n = v.length; return !n ? null : n % 2 ? v[(n-1)/2] : (v[n/2-1] + v[n/2]) / 2; };
  const TABLE_N = 30;
  const isMeIn = (rows, cx) => rows.slice(TABLE_N).some(r => isMe(r, cx));   /* 우리 줄이 표 밖에 있어 끝에 붙는가 */   /* 표·가로막대가 보여 주는 줄 수 */
  const YEAR = /^(19|20)\d\d$/;
  const PAL = ['--u1','--u2','--u3','--u4','--u5','--u6','--u7'];
  const col = i => `var(${PAL[i % PAL.length]})`;
  /* 받침에 따라 조사를 고른다 */
  const jo = (w, k) => {
    const t = String(w).trim().replace(/\s*\([^()]*\)$/, '').trim(), c = t.slice(-1);
    let h = false;
    if (/[0-9]/.test(c)) h = '013678'.includes(c);
    else if (c === '%') h = false;
    else if (/[가-힣]/.test(c)) h = ((c.charCodeAt(0) - 0xAC00) % 28) !== 0;
    else if (/[A-Za-z]/.test(c)) {
      const prev = t.slice(-2, -1);
      if (!/[A-Za-z]/.test(prev)) h = /[lmnr]/i.test(c);            /* 낱글자 P·S·L… 는 읽는 소리대로 */
      else if (/e/i.test(c)) h = /[nml]/i.test(prev);                /* 묵음 e: Medicine → 메디슨 */
      else h = /(n|m|l|ng|k|p|t)$/i.test(t);                      /* 우리말로 읽을 때 받침이 남는 끝소리만 */
    }
    const l = /[가-힣]/.test(c) && (c.charCodeAt(0) - 0xAC00) % 28 === 8;
    return k === '은' ? (h?'은':'는') : k === '이' ? (h?'이':'가') : k === '과' ? (h?'과':'와') : k === '로' ? (h && !l ? '으로' : '로') : (h?'을':'를');
  };
  const U = m => (m && m.u) ? m.u : '';
  const vu = (v, m) => N(v) + U(m);

  /* 축별로 세는 말: 학과·대학은 곳, 쌍은 쌍, 분야·저널은 개 */
  const ORG = { dept: { w:'곳', n:'곳' }, uni: { w:'곳', n:'곳' }, grp: { w:'곳', n:'곳' }, pair: { w:'쌍', n:'쌍' },
                f: { w:'개', n:'분야' }, j: { w:'개', n:'저널' }, g: { w:'개', n:'등급' }, gy: { w:'개', n:'계열' },
                r: { w:'개', n:'역할' }, tr: { w:'개', n:'등급' }, kind: { w:'개', n:'구분' }, _: { w:'개', n:'것' } };
  /* ── 모양 읽기 ─────────────────────────────────────────── */
  function shape(a, cx) {
    const rows = a.rows, cols = a.cols.length;
    const ycol = [...Array(cols).keys()].find(i => rows.length && rows.every(r => YEAR.test(String(labs(r)[i]))));
    const other = [...Array(cols).keys()].filter(i => i !== ycol);
    const m0 = cx.M(a.measures[0]);
    return { cols, ycol: ycol ?? null, gcol: other[0] ?? null, icol: other[1] ?? null,
      years: ycol != null ? [...new Set(rows.map(r => labs(r)[ycol]))].sort() : [],
      count: /^(편|건|명|개|곳|회)$/.test(U(m0)), d: m0.d || 'high',
      w: (ORG[a.cols[other[0] ?? 0]] || ORG._).w, wn: (ORG[a.cols[other[0] ?? 0]] || ORG._).n };
  }
  /* 2축 → 첫 축(또는 지정 축)으로 접는다 */
  function fold(rows, k) {
    if (!rows.length || labs(rows[0]).length < 2) return rows;
    const acc = new Map();
    rows.forEach(r => {
      const key = labs(r)[k || 0], cur = acc.get(key) || [[key], 0, 0];
      for (let i = 0; i < 2; i++) { const v = val(r, i); if (v != null) cur[1 + i] += v; }
      acc.set(key, cur);
    });
    return [...acc.values()];
  }
  /* 연도 축 기준 계열 분리 → Map(계열 → [[연도, 값]…]) */
  function series(rows, sh, mi) {
    if (sh.ycol == null) return null;
    const g = new Map();
    rows.forEach(r => {
      const s = sh.gcol != null ? labs(r)[sh.gcol] : '전체', y = labs(r)[sh.ycol], v = val(r, mi || 0);
      if (v == null) return;
      (g.get(s) || g.set(s, []).get(s)).push([y, v]);
    });
    g.forEach(a => a.sort((x, y) => String(x[0]).localeCompare(String(y[0]))));
    return g;
  }
  const rate = a => a.length < 2 || !a[0][1] ? null : Math.round((a[a.length-1][1] - a[0][1]) / a[0][1] * 1000) / 10;
  const desc = (rows, i) => rows.filter(r => val(r, i) != null).sort((a, b) => val(b, i) - val(a, i));
  const asc  = (rows, i) => rows.filter(r => val(r, i) != null).sort((a, b) => val(a, i) - val(b, i));
  const isMe = (r, cx) => lab(r).includes(cx.me);
  /* 같은 값은 같은 등수(1224식). 공동이면 '공동 N위' */
  const crank = (vals, v) => vals.filter(x => x > v).length + 1;
  const cties = (vals, v) => vals.filter(x => x === v).length - 1;
  const rkw = (vals, v) => `${cties(vals, v) > 0 ? '공동 ' : ''}${crank(vals, v)}위`;
  /* 규모(분모) 열: 첫 값 지표의 size 가 가리키는 지표가 값 열에 있으면 그 열 번호, 없으면 -1 */
  const sizeCol = (ms, sh, cx) => { const sz = cx.M(ms[0]).s; if (!sz) return -1; const ax = sh.a && sh.a.cols ? sh.a.cols[0] : null; const sid = (ax && sz[ax]) || sz['*']; return sid ? ms.indexOf(sid) : -1; };
  const szName = m => (m.n || '').replace(/\s+수$/, '');   /* '참여자 수' → 참여자. '참여교수'는 그대로 */
  /* 1인당 값 = 값 ÷ 규모. 규모 0·없음은 뺀다. 높은 순 */
  const perCap = (rows, j) => rows.map(r => { const v = val(r, 0), z = val(r, j); return { r, pc: v != null && z ? Math.round(v / z * 10) / 10 : null }; }).filter(x => x.pc != null).sort((a, b) => b.pc - a.pc);
  /* 콕 집은 항목의 이름: 이름 + (항목들) */
  const pickName = pk => !pk || !pk.i ? '' : pk.name ? (pk.i.length > 1 && pk.i.every(x => !pk.name.includes(x)) ? `${pk.name}(${pk.i.join('·')})` : pk.name) : pk.i.join('·');
  /* 1인당 단위: 규모가 '명'이면 값 단위만 (편/명 → 편) */
  const pcU = (m0, sz) => U(sz) === '명' ? U(m0) : `${U(m0)}/${U(sz)}`;

  /* ── 의도: 계산 규칙 ───────────────────────────────────── */
  const INT = {};

  INT.rank_me = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), s = desc(rows, 0), i = s.findIndex(r => isMe(r, cx));
    if (i < 0) return INT.rank(rows, ms, sh, cx);
    const mv = val(s[i], 0), tv = val(s[0], 0), P = [], K = [], lims = [], vs0 = nums(s, 0);
    const MR = (sh.a && sh.a.me_rank) || null, rk0 = MR && MR[0] ? MR[0] : [crank(vs0, mv), s.length, cties(vs0, mv)];
    const tie0 = rk0[2] || 0, tied = tie0 ? s.filter(r => !isMe(r, cx) && val(r,0) === mv).map(lab) : [];
    const rkS = `${tie0 ? '공동 ' : ''}${rk0[0]}위`;
    K.push({ l: '우리 자리', v: rkS, s: tie0 ? `${rk0[1]}${sh.w} 중 · ${tied.slice(0,2).join('·')}${tied.length > 2 ? ' 등' : ''}${jo(tied[0],'과')} 같은 값` : `${rk0[1]}${sh.w} 중` });
    if (tie0) P.push(`${tied.slice(0,3).join(' · ')}${tied.length > 3 ? ` 등 ${tied.length}${sh.w}` : ''}${jo(tied[0],'과')} 같은 값입니다.`);
    if (rk0[0] > 1) { P.push(tv/mv < 1.05 ? `1위 ${lab(s[0])} ${vu(tv,m0)}, 우리와 거의 같습니다.` : `1위 ${lab(s[0])} ${vu(tv,m0)}, 우리의 ${RX(tv,mv)}배입니다.`); K.push({ l: '1위와 격차', v: `${RX(tv,mv)}배`, s: lab(s[0]) }); }
    else if (!tie0 && s[1]) { P.push(`2위 ${lab(s[1])} ${vu(val(s[1],0),m0)}보다 ${RX(mv,val(s[1],0))}배 앞섭니다.`); K.push({ l: '2위와 격차', v: `${RX(mv,val(s[1],0))}배`, s: lab(s[1]) }); }
    if (!MR) { if (i > 0) P.push(`바로 위 ${lab(s[i-1])} ${vu(val(s[i-1],0),m0)}.`);
      if (i < s.length-1) P.push(`바로 아래 ${lab(s[i+1])} ${vu(val(s[i+1],0),m0)}.`); }
    if (ms.length > 1) {
      const rk = ms.map((id, k) => { const o = desc(rows, k), j = o.findIndex(r => isMe(r, cx)), v = j >= 0 ? val(o[j], k) : null; return { id, n: cx.M(id).n, r: (MR && MR[k]) ? MR[k][0] : (v == null ? 0 : crank(nums(o, k), v)), t: (MR && MR[k]) ? (MR[k][2] || 0) : (v == null ? 0 : cties(nums(o, k), v)), v, m: cx.M(id), c: (MR && MR[k]) ? MR[k][1] : nums(o, k).length, miss: (MR && MR[k]) ? [] : rows.filter(r => val(r, k) == null).map(lab) }; }).filter(x => x.v != null);   /* 상한에 걸린 목록은 전체 모수(me_rank)를 쓴다 */
      const best = rk.slice().sort((a,b) => a.r-b.r)[0], worst = rk.slice().sort((a,b) => b.r-a.r)[0];
      if (best.r !== worst.r) { P.push(`다른 지표로는 ${rk.filter(x => x.id !== ms[0]).slice(0,8).map(x => `${x.n} ${x.t ? '공동 ' : ''}${x.r}위(${vu(x.v,x.m)}${x.c !== rk0[1] ? ` · ${x.c}${sh.w} 중` : ''})`).join(' · ')}.`);
        K.push({ l: '지표 바꾸면', v: `${best.r}~${worst.r}위`, s: `${best.n} ↔ ${worst.n}` }); }
      else K.push({ l: '지표 바꿔도', v: `${best.r}위`, s: `${ms.length}개 지표 모두` });
      rk.filter(x => x.miss.length).forEach(x => lims.push(`${x.n} 값이 없는 ${x.miss.length}${sh.w}(${x.miss.slice(0,3).join(' · ')}${x.miss.length > 3 ? ' 등' : ''})${jo(sh.w,'은')} ${x.n} 순위에서 뺐습니다.`));   /* 결측은 그 지표의 모수에서 빠진다 */
    }
    let head = `${cx.me}${jo(cx.me,'은')} ${m0.n} ${vu(mv,m0)}${jo(U(m0)||N(mv),'로')} ${rk0[1]}${sh.w} 중 ${rkS}입니다`;
    if (sh.askSplit && ms.length > 1) { const rk = ms.map((id, k) => { const o = desc(rows, k), j = o.findIndex(r => isMe(r, cx)); if (j < 0) return null; const v = val(o[j], k), vs = nums(o, k); return { n: cx.M(id).n, r: (MR && MR[k]) ? MR[k][0] : crank(vs, v), t: (MR && MR[k]) ? (MR[k][2] || 0) : cties(vs, v), v, m: cx.M(id), c: (MR && MR[k]) ? MR[k][1] : vs.length }; }).filter(Boolean);
      head = `${cx.me}${jo(cx.me,'은')} ${rk0[1]}${sh.w} 중 ${rk.map(x => `${x.n} ${x.t ? '공동 ' : ''}${x.r}위(${vu(x.v,x.m)}${x.c !== rk0[1] ? ` · ${x.c}${sh.w} 중` : ''})`).join(' · ')}입니다`;
      const k = P.findIndex(p => p.startsWith('다른 지표로는')); if (k >= 0) P.splice(k, 1); }
    return { headline: head, points: P, kpi: K, sorted: s, hi: new Set([i]), lims };
  };

  INT.rank = (rows, ms, sh, cx) => {
    const st = (sh.a && sh.a.stats) || null;   /* 상한에 걸린 목록은 전체 기준 통계를 쓴다 */
    const m0 = cx.M(ms[0]), f = desc(fold(rows), 0), vs = nums(f), T = st ? st.total : sum(vs), top = f[0];
    const part = !!(sh.a && sh.a.capped && !st);   /* 추천 상위 N처럼 일부만 온 목록 */
    const t3 = f.slice(0, 3), P = [], K = [], nAll = st ? (sh.a.n || f.length) : f.length;
    const nz = f.filter(r => val(r,0) > 0), zeros = st ? (st.zeros || 0) : f.length - nz.length;
    const bot = st ? st.bottom : (nz.length ? [labs(nz[nz.length-1]), val(nz[nz.length-1],0)] : [labs(f[f.length-1]), val(f[f.length-1],0)]);
    const zl = st ? (st.zero_names || []) : f.filter(r => !(val(r,0) > 0)).map(lab);   /* 0인 곳은 가장 적은 곳으로 센다 (모수·중앙값과 같은 기준) */
    const zs = zeros ? `0${U(m0)}인 ${zeros}${sh.w}(${zl.slice(0,3).join(' · ')}${zeros > 3 ? ' 등' : ''})이고, 그 위는 ` : '';
    K.push({ l: '1위', v: lab(top), s: vu(val(top,0), m0) });
    if (f.length > 3 && sh.count) { const p3 = pct(sum(t3.map(r => val(r,0)||0)), T);
      P.push(`상위 3${sh.w} ${t3.map(lab).join(' · ')}${jo(lab(t3[2]),'이')} 합쳐 ${p3}%입니다.`); K.push({ l: '상위 3 점유율', v: `${p3}%`, s: `${N(nAll)}${sh.w} 중` }); }
    else if (f.length > 1) { const cutV = t3[t3.length-1] ? val(t3[t3.length-1],0) : null, ext = f.slice(3).filter(r => val(r,0) === cutV), nx = [...t3.slice(1), ...ext.slice(0,3)];
      P.push(`그다음은 ${nx.map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ')}${ext.length > 3 ? ` 등 ${vu(cutV,m0)} 동률 ${ext.length + 1}${sh.w}` : ''}입니다.`); }
    const minTie = !st && nz.length > 1 ? nz.filter(r => val(r,0) === val(nz[nz.length-1],0)) : [];   /* 꼴찌 동률 */
    if (f.length > 3 && !st) P.push(part ? `표에 보이는 ${f.length}${sh.w} 중 가장 낮은 것은 ${lab(bot)} ${vu(bot[1],m0)}입니다.`
      : minTie.length > 1 ? `가장 ${sh.count ? '적은' : '낮은'} ${sh.wn}${jo(sh.wn,'은')} ${zs}${vu(bot[1],m0)}인 ${minTie.length}${sh.w}(${minTie.slice(0,3).map(lab).join(' · ')}${minTie.length > 3 ? ' 등' : ''})입니다.`
      : `가장 ${sh.count ? '적은' : '낮은'} ${sh.wn}${jo(sh.wn,'은')} ${zs}${lab(bot)} ${vu(bot[1],m0)}입니다.`);
    /* 규모 열이 있으면 1인당으로 한 번 더 본다 (합계 1위 ≠ 1인당 1위) */
    const szj = st ? -1 : sizeCol(ms, sh, cx);
    if (szj > 0) { const sz = cx.M(ms[szj]), pcs = perCap(f, szj), u = pcU(m0, sz);
      if (pcs.length > 1) { const pt = pcs[0], pm = pcs.find(x => x.r === top), pv = pcs.map(x => x.pc);
        P.splice(1, 0, `${szName(sz)} 1인당으로는 ${lab(pt.r)} ${N(pt.pc)}${u}${jo(u,'이')} 가장 높습니다${pm && pm !== pt ? ` (${lab(top)}${jo(lab(top),'은')} 1인당 ${N(pm.pc)}${u}, ${rkw(pv, pm.pc)})` : pm ? ' (합계 1위와 같습니다)' : ''}.`);
        K.splice(1, 0, { l: '1인당 1위', v: lab(pt.r), s: `${N(pt.pc)}${u}${pm && pm !== pt ? ` · ${lab(top)} ${rkw(pv, pm.pc)}` : ''}` }); } }
    const med = st ? st.median : median(vs);
    if (ms.length > 1 && szj !== 1) { const m1 = cx.M(ms[1]), f1 = desc(fold(rows), 1);
      if (f1.length && lab(f1[0]) !== lab(top)) P.push(`${m1.n}${jo(m1.n,'은')} ${lab(f1[0])}${jo(lab(f1[0]),'이')} ${vu(val(f1[0],1),m1)}${jo(U(m1)||N(val(f1[0],1)),'로')} 가장 ${m1.d === 'low' ? '낮습니다' : '높습니다'}.`); }
    if (st && med != null) { P.push(`전체 ${N(nAll)}${sh.w} 중 절반은 ${vu(med,m0)} 이하입니다.`); K.push({ l: '중앙값', v: vu(med,m0), s: `${N(nAll)}${sh.w} 중` }); }
    else if (part) K.push({ l: '후보 전체', v: `${N(sh.a.n)}${sh.w}`, s: `상위 ${f.length}${sh.w}만 계산` });
    else if (med && f.length > 3 && sh.count) { P.push(`1위는 가운데 값 ${vu(med,m0)}의 ${RX(val(top,0),med)}배입니다.`); K.push({ l: '중앙값 대비', v: `${RX(val(top,0),med)}배`, s: `중앙값 ${vu(med,m0)}` }); }
    else if (f.length > 3) { const gap = Math.round((val(top,0) - (zeros ? 0 : bot[1]))*10)/10; P.push(`1위와 꼴찌의 차이는 ${vu(gap,m0)}입니다.`); K.push({ l: '1위와 꼴찌 차이', v: vu(gap,m0), s: `${N(nAll)}${sh.w} 중` }); }
    const meI = f.findIndex(r => isMe(r, cx)); if (meI > 0) P.push(`${cx.me}는 ${meI+1}위 ${vu(val(f[meI],0),m0)}입니다.`);
    return { headline: `${lab(top)}${jo(lab(top),'이')} ${m0.n} ${vu(val(top,0),m0)}${jo(U(m0)||N(val(top,0)),'로')} 가장 ${sh.count ? '많습니다' : '높습니다'}`, points: P, kpi: K, sorted: f, hi: new Set([0,1,2]) };
  };

  INT.low = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), f = asc(fold(rows), 0), bot = f[0], top = f[f.length-1], P = [], K = [];
    K.push({ l: '가장 낮은 곳', v: lab(bot), s: vu(val(bot,0), m0) });
    P.push(f.length > 3 ? `아래쪽 셋은 ${f.slice(0,3).map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ')}입니다.` : `${f.map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ')} 순입니다.`);
    if (val(bot,0) && val(top,0)) { const x = RX(val(top,0),val(bot,0));
      P.push(`가장 높은 ${lab(top)} ${vu(val(top,0),m0)}${jo(U(m0)||N(val(top,0)),'과')} ${x}배 차이입니다.`); K.push({ l: '최고와 격차', v: `${x}배`, s: lab(top) }); }
    if (f.length > 3) K.push({ l: '하위 3', v: f.slice(0,3).map(lab).join(' · '), s: f.slice(0,3).map(r => vu(val(r,0),m0)).join(' · ') });
    /* 규모 열이 있으면 1인당으로 한 번 더 본다 (합계가 낮은 곳이 규모도 작을 수 있다) */
    const szj = sizeCol(ms, sh, cx);
    if (szj > 0) { const sz = cx.M(ms[szj]), pcs = perCap(f, szj), u = pcU(m0, sz);
      if (pcs.length > 1) { const pb = pcs[pcs.length-1], pt = pcs[0], x = pb.pc ? RX(pt.pc,pb.pc) : null, same = pb.r === bot;
        P.splice(2, 0, `${szName(sz)} 1인당으로 ${same ? '봐도' : '보면'} ${lab(pb.r)} ${N(pb.pc)}${u}${jo(u,'이')} 가장 낮고, 가장 높은 ${lab(pt.r)} ${N(pt.pc)}${u}${jo(u,'과')} ${x ? `${x}배` : ''} 차이입니다.`);
        K.splice(1, 0, { l: '1인당 가장 낮은 곳', v: lab(pb.r), s: `${N(pb.pc)}${u}${x ? ` · 최고와 ${x}배` : ''}` }); } }
    if (ms.length > 1 && ms.filter((_, k) => k !== szj).length > 1) {
      /* 지표마다 최저값에 있는 곳 전부(동률 포함). 가장 자주 최저인 곳을 센다. 규모 열은 지표가 아니다 */
      const lows = ms.map((id, k) => { if (k === szj) return null; const o = asc(rows, k); if (!o.length) return null; const mn = val(o[0],k); return { n: cx.M(id).n, ws: o.filter(r => val(r,k) === mn).map(lab) }; }).filter(Boolean);
      const cnt = new Map(); lows.forEach(x => x.ws.forEach(w => cnt.set(w, (cnt.get(w)||0)+1)));
      const [w, c] = [...cnt.entries()].sort((a,b) => b[1]-a[1])[0];
      const tie = lows.filter(x => x.ws.includes(w) && x.ws.length > 1).length;
      P.push(`${lows.length}개 지표 중 ${c}개에서 ${w}${jo(w,'이')} 가장 낮습니다${tie ? ` (그중 ${tie}개는 다른 곳과 같은 값)` : ''}.`);
    }
    return { headline: `${lab(bot)}${jo(lab(bot),'이')} ${m0.n} ${vu(val(bot,0),m0)}${jo(U(m0)||N(val(bot,0)),'로')} 가장 낮습니다`, points: P, kpi: K, sorted: f, hi: new Set([0,1,2]), lims: ['기록이 덜 붙은 곳은 값이 낮게 나옵니다.'] };
  };

  INT.quality = (rows, ms, sh, cx) => {
    if (rows.length === 1) { const o = INT.lookup(rows, ms, sh, cx); o.fallback = 'kpi';
      o.headline = ms.map((id, k) => `${cx.M(id).n} ${vu(val(rows[0],k),cx.M(id))}`).join(' · ');
      o.kpi = ms.slice(0,3).map((id, k) => ({ l: cx.M(id).n, v: vu(val(rows[0],k),cx.M(id)), s: cx.M(id).d === 'low' ? '낮을수록 좋음' : '높을수록 좋음' }));
      o.points = []; o.lims = [`28개 학과 평균입니다.`, `미판정은 저널 등급을 못 붙인 논문, 검토필요는 사람 매칭이 불확실한 논문입니다.`]; return o; }
    /* 첫 값 지표 기준. 낮을수록 좋은 값(미판정율)은 높은 순, 높을수록 좋은 값(채움률)은 낮은 순으로 '먼저 손볼 곳' */
    const k = 0, m0 = cx.M(ms[0]), low = m0.d === 'low', worstFirst = (i, m) => m.d === 'low' ? desc(rows, i) : asc(rows, i);
    const f = worstFirst(0, m0), w = f.slice(0,3), vs = nums(f, 0), avg = vs.length ? sum(vs)/vs.length : 0, over = f.filter(r => low ? (val(r,0)||0) > avg : (val(r,0)||0) < avg).length;
    const P = [], K = [{ l: `가장 ${low ? '높은' : '낮은'} 곳`, v: lab(w[0]), s: vu(val(w[0],0),m0) }];
    if (w.length > 1) P.push(`그다음은 ${w.slice(1).map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ')}입니다.`);
    if (ms[1]) { const m1 = cx.M(ms[1]), f1 = worstFirst(1, m1).filter(r => val(r,1) != null);
      if (f1.length) { const low1 = m1.d === 'low'; P.push(`${m1.n}${jo(m1.n,'은')} ${f1.slice(0,2).map(r => `${lab(r)} ${vu(val(r,1),m1)}`).join(' · ')} 순으로 ${low1 ? '높습니다' : '낮습니다'}.`); K.push({ l: `${m1.n} 가장 ${low1 ? '높은' : '낮은'} 곳`, v: lab(f1[0]), s: vu(val(f1[0],1),m1) }); } }
    P.push(`평균 ${vu(Math.round(avg*10)/10,m0)}, 평균보다 ${low ? '높은' : '낮은'} 곳이 ${f.length}${sh.w} 중 ${over}${sh.w}입니다.`);
    K.push({ l: `평균보다 ${low ? '높은' : '낮은'} 곳`, v: `${over}${sh.w}`, s: `${f.length}${sh.w} 중 · 평균 ${vu(Math.round(avg*10)/10,m0)}` });
    return { headline: `${lab(w[0])}${jo(lab(w[0]),'이')} ${m0.n} ${vu(val(w[0],0),m0)}${jo(U(m0)||N(val(w[0],0)),'로')} 가장 ${low ? '높습니다' : '낮습니다'}`,
      points: P, kpi: K, sorted: f, hi: new Set([0,1,2]), sortBy: k, sortDir: low ? 'desc' : 'asc' };
  };

  INT.trend = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), g = series(rows, sh, 0);
    if (!g) return Object.assign(INT.rank(rows, ms, sh, cx), { fallback: 'bar_h' });
    const names = [...g.keys()], main = names.find(n => n.includes(cx.me)) || names[0], a = g.get(main), r0 = rate(a), P = [], K = [];
    const f = a[0], l = a[a.length-1];
    K.push({ l: `${f[0]}년`, v: vu(f[1],m0), s: main }); K.push({ l: `${l[0]}년`, v: vu(l[1],m0), s: main });
    if (sh.ctx) K[0].s = K[1].s = `${main} · ${sh.ctx}`;
    if (r0 != null) K.push({ l: '증감률', v: `${sgn(r0)}%`, s: `${f[0]}→${l[0]}` });
    const open = String(l[0]) === String(new Date().getFullYear()) || String(l[0]) === '2025';   /* 마지막 해가 집계 중 */
    const b = open ? a.slice(0, -1) : a;   /* 꺾임·최고점은 집계 중인 해를 빼고 본다 */
    const lims = open ? [`${l[0]}년은 집계 중이라 낮게 보일 수 있습니다.`] : [];
    if (ms.length > 1) { const g1 = series(rows, sh, 1), s1 = g1 && g1.get(main), r1 = s1 && rate(s1), m1 = cx.M(ms[1]);
      if (m1.y === false) lims.push(`${m1.n}${jo(m1.n,'은')} 최근 해일수록 덜 쌓여 연도 비교에 쓰지 않습니다 (표에만 있습니다).`);
      else if (r1 != null) { const low = m1.d === 'low', v0 = s1[0][1], v1 = s1[s1.length-1][1], pp = U(m1) === '%', ch = pp ? `${sgn(Math.round((v1 - v0) * 10) / 10)}%p` : `${sgn(r1)}%`, up = pp ? v1 > v0 : r1 > 0, dn = pp ? v1 < v0 : r1 < 0;
        const word = low ? '입니다 (낮을수록 상위)' : '입니다';
        P.push(`${m1.n}${jo(m1.n,'은')} 같은 기간 ${vu(v0,m1)}에서 ${vu(v1,m1)}${jo(U(m1)||N(v1),'로')} ${ch}${word}.`); K.push({ l: m1.n, v: ch, s: `${vu(v0,m1)}→${vu(v1,m1)}${low ? ' · 낮을수록 상위' : ''}` }); } }
    const peak = b.slice().sort((x,y) => y[1]-x[1])[0];
    if (open && peak && l[1] > peak[1]) P.push(`${l[0]}년은 집계 중인데도 이미 가장 높습니다 (집계가 끝난 해 중 최고는 ${peak[0]}년 ${vu(peak[1],m0)}).`);
    else if (peak && peak[0] !== l[0] && peak[0] !== f[0]) P.push(`${open ? '집계가 끝난 해 중 ' : ''}가장 높았던 해는 ${peak[0]}년 ${vu(peak[1],m0)}입니다.`);
    /* 꺾임: 앞뒤 부호가 바뀌고, 그 폭이 앞 값의 5% 이상일 때만 (그 안은 제자리로 본다) */
    let turn = -1, dips = 0, peaks = 0; for (let i = 1; i < b.length-1; i++) if ((b[i][1]-b[i-1][1]) * (b[i+1][1]-b[i][1]) < 0 && b[i-1][1] && Math.abs(b[i][1]-b[i-1][1]) / b[i-1][1] >= 0.05) { turn = i; if (b[i][1] < b[i-1][1]) dips++; else peaks++; }
    if (turn > 0) { const p0 = b[turn-1], p1 = b[turn], p2 = b[turn+1], dnUp = p1[1] < p0[1], k = dnUp ? dips : peaks;
      P.push(dnUp ? `${p0[0]}년 ${vu(p0[1],m0)}에서 ${p1[0]}년 ${vu(p1[1],m0)}${jo(U(m0)||N(p1[1]),'로')} 한 번 줄었다가 ${p2[0]}년 ${vu(p2[1],m0)}${jo(U(m0)||N(p2[1]),'로')} 다시 늘었습니다${k > 1 ? ` (이런 하락이 ${k}번)` : ''}.`
                  : `${p1[0]}년 ${vu(p1[1],m0)}까지 늘다가 ${p2[0]}년 ${vu(p2[1],m0)}${jo(U(m0)||N(p2[1]),'로')} 줄었습니다${k > 1 ? ` (이런 하락이 ${k}번)` : ''}.`); }
    if (a.length > 2) { let bi = 1; for (let i = 2; i < a.length; i++) if (a[i][1]-a[i-1][1] > a[bi][1]-a[bi-1][1]) bi = i;
      const d = a[bi][1]-a[bi-1][1]; if (d > 0) P.push(`한 해 증가폭이 가장 컸던 때는 ${a[bi-1][0]}→${a[bi][0]}년 ${vu(d,m0)}입니다.`); }
    if (a.length > 1) { const avg = sum(a.map(p => p[1]))/a.length; P.push(`${a.length}년 평균 ${vu(Math.round(avg*10)/10,m0)}, ${l[0]}년은 평균의 ${RX(l[1],Math.round(avg*10)/10)}배입니다.`); }
    /* 첫해가 둘째 해의 6할도 안 되면 첫해 기준 증감률이 부풀려진다. 둘째 해부터의 증감률을 같이 둔다 */
    if (a.length > 2 && a[0][1] < a[1][1] * 0.6) { const r1 = rate(a.slice(1)); lims.push(`${f[0]}년 ${vu(f[1],m0)}${jo(U(m0)||N(f[1]),'은')} ${a[1][0]}년 ${vu(a[1][1],m0)}의 ${pct(f[1], a[1][1])}%로 낮아 첫해 기준 증감률이 크게 잡힙니다. ${a[1][0]}년부터 보면 ${r1 == null ? '—' : sgn(r1) + '%'}입니다.`); }
    /* 집계가 끝난 최근 3년이 ±5% 안이면 제자리 */
    if (b.length >= 3) { const t3 = b.slice(-3), mx3 = Math.max(...t3.map(p => p[1])), mn3 = Math.min(...t3.map(p => p[1])); if (mx3 && (mx3 - mn3) / mx3 <= 0.05) P.push(`${t3[0][0]}년부터는 ${t3.map(p => vu(p[1],m0)).join('→')}${jo(U(m0)||N(t3[2][1]),'로')} 제자리입니다${open ? ` (${l[0]}년은 집계 중)` : ''}.`); }
    const om = new Set(sh.omit || []); let grp = null;
    if (names.length > 1) {
      const rs = names.filter(n => !om.has(n)).map(n => ({ n, r: rate(g.get(n)) })).filter(x => x.r != null).sort((x,y) => y.r-x.r);
      const S = [];
      /* 순위도 omit 계열(U 미판정 등)을 뺀 모수로 센다. 한계의 «비교에서 뺐다»와 모수가 같아야 한다 */
      const rn = names.filter(n => !om.has(n)), lastRank = rn.map(n => { const s = g.get(n); return { n, v: s[s.length-1][1] }; }), lv = lastRank.map(x => x.v);
      const mine = lastRank.find(x => x.n === main); if (mine && rn.length > 2) S.push(`${l[0]}년 기준 ${main}${jo(main,'은')} ${rn.length}${sh.w} 중 ${rkw(lv, mine.v)}입니다.`);
      /* 시작값이 작은 계열(10 미만 또는 첫해 전체의 2% 미만)은 증감률이 튀어 비교에서 뺀다 (grow와 같은 규칙) */
      const fy = rs.map(x => g.get(x.n)[0]), y0 = fy.map(p => p[0]).sort()[0], T0 = sum(fy.filter(p => p[0] === y0).map(p => p[1])), minBase = sh.count ? Math.max(10, T0 * 0.02) : 0;
      const small = rs.filter(x => g.get(x.n)[0][1] < minBase), rs2 = rs.length - small.length > 1 ? rs.filter(x => !small.includes(x)) : rs;
      grp = rs2;
      if (rs2.length > 1) S.push(`가장 많이 는 ${sh.wn}${jo(sh.wn,'은')} ${rs2[0].n}(${sgn(rs2[0].r)}%), 가장 적게 는 ${sh.wn}${jo(sh.wn,'은')} ${rs2[rs2.length-1].n}(${sgn(rs2[rs2.length-1].r)}%)입니다.`);
      if (small.length && rs2 !== rs) lims.push(`시작값이 작은 ${sh.wn}(${y0}년 ${vu(Math.ceil(minBase),m0)} 미만)${jo(sh.wn,'은')} 증감률이 튀어 증감 비교에서 뺐습니다 (순위에는 있습니다): ${small.slice(0,5).map(x => { const q = g.get(x.n); return `${x.n}(${q[0][1]}→${q[q.length-1][1]})`; }).join(' · ')}${small.length > 5 ? ` 등 ${small.length}${sh.w}` : ''}.`);
      P.splice(1, 0, ...S);   /* 견주는 답이면 순위·계열 증감이 평균·제자리보다 앞 */
    }
    if (om.size && names.some(n => om.has(n))) lims.push(`${[...om].filter(n => names.includes(n)).join(' · ')}${jo([...om][0],'은')} ${sh.wn} 비교에서 뺐습니다 (표·그림에는 있습니다).`);
    const what = (sh.ctx ? sh.ctx + ' ' : '') + m0.n;
    /* 질문 주어가 집단(«대학끼리»)이면 집단의 증감 사실이 결론, 우리 값은 KPI에 */
    if (sh.askGroup && grp && grp.length > 1 && grp.some(x => x.n === main)) { const up = grp.filter(x => x.r > 0).length, ri = grp.findIndex(x => x.n === main), tie = grp.filter(x => x.r === grp[ri].r).length > 1;
      return { headline: `${f[0]}→${l[0]}년 ${what}${jo(m0.n,'은')} ${grp.length}${sh.w} ${up === grp.length ? '모두 늘었고' : up === 0 ? '모두 줄었고' : `중 ${up}${sh.w}${jo(sh.w,'이')} 늘었고`} ${main}${jo(main,'은')} ${sgn(grp[ri].r)}%로 ${tie ? '공동 ' : ''}${grp.findIndex(x => x.r === grp[ri].r) + 1}위입니다`, points: P, kpi: K, series: g, main, lims }; }
    return { headline: r0 == null ? `${main} ${what} 추이입니다`
      : `${main} ${what}${jo(m0.n,'은')} ${f[0]}년 ${vu(f[1],m0)}에서 ${l[0]}년 ${vu(l[1],m0)}${jo(U(m0)||N(l[1]),'로')} ${sgn(r0)}% ${r0 >= 0 ? '늘었습니다' : '줄었습니다'}`,
      points: P, kpi: K, series: g, main, lims };
  };

  INT.grow = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), g = series(rows, sh, 0);
    if (!g || g.size < 2) return INT.trend(rows, ms, sh, cx);
    /* 콕 집은 항목들은 한 계열로 합친다 (주도 = 제1+교신+…). 나머지는 그대로 */
    const pk = sh.pick; let pkName = null;
    if (pk && pk.i && pk.i.length) { const set = new Set(pk.i), acc = new Map(); let any = false;
      [...g.keys()].forEach(n => { if (!set.has(n)) return; any = true; g.get(n).forEach(([y, v]) => acc.set(y, (acc.get(y) || 0) + v)); g.delete(n); });
      if (any) { pkName = pk.name || pk.i.join('·'); g.set(pkName, [...acc.entries()].sort((x, y) => String(x[0]).localeCompare(String(y[0])))); } }
    if (g.size < 2) return INT.trend(rows, ms, sh, cx);
    const om = new Set(sh.omit || []);
    const all = [...g.keys()].filter(n => !om.has(n)).map(n => { const s = g.get(n); return { n, s, r: rate(s), f: s[0], l: s[s.length-1] }; }).filter(x => x.r != null).sort((x,y) => y.r-x.r);
    /* 시작값이 너무 작은 계열(10 미만 또는 첫해 전체의 2% 미만)은 증감률이 튀어 비교에서 뺀다 */
    const y0 = all.length ? all.map(x => x.f[0]).sort()[0] : null, T0 = sum(all.map(x => x.f[0] === y0 ? x.f[1] : 0)), minBase = sh.count ? Math.max(10, T0 * 0.02) : 0;
    const small = all.filter(x => x.f[1] < minBase), rs = (all.filter(x => x.f[1] >= minBase).length ? all.filter(x => x.f[1] >= minBase) : all);
    if (!rs.length) return INT.trend(rows, ms, sh, cx);
    const top = rs[0], bot = rs[rs.length-1], up = rs.filter(x => x.r > 0), down = rs.filter(x => x.r < 0), P = [], K = [];
    const l = top.l, open = String(l[0]) === String(new Date().getFullYear()) || String(l[0]) === '2025';
    K.push({ l: '가장 많이 는 ' + sh.wn, v: top.n, s: `${sgn(top.r)}% · ${vu(top.f[1],m0)}→${vu(top.l[1],m0)}` });
    K.push({ l: down.length ? '줄어든 ' + sh.wn : '가장 적게 는 ' + sh.wn, v: down.length ? down.map(x => x.n).slice(0,2).join(' · ') : bot.n, s: down.length ? `${down.length}${sh.w}` : `${sgn(bot.r)}%` });
    const listOf = ex => { const q = rs.filter(x => x.n !== ex); return `${q.slice(0,6).map(x => `${x.n} ${sgn(x.r)}%`).join(' · ')}${q.length > 6 ? ` 등 ${q.length}${sh.w}` : ''}.`; };
    const listAll = listOf(null); P.push(listAll);
    let shareHL = null;
    if (sh.count) {
      /* 몫의 변화: 콕 집은 계열(없으면 가장 많이 는 계열)이 전체에서 차지하는 몫이 처음과 끝에 얼마인가 */
      const sb = (pkName && rs.find(x => x.n === pkName)) || top;
      const tot = y => sum([...g.values()].map(s => { const p = s.find(q => q[0] === y); return p ? p[1] : 0; }));
      const t0 = tot(sb.f[0]), t1 = tot(sb.l[0]), p0 = pct(sb.f[1], t0), p1 = pct(sb.l[1], t1), dp = t0 && t1 ? Math.round((p1 - p0) * 10) / 10 : null;
      const sent = `${sb.n}${jo(sb.n,'이')} 전체에서 차지하는 몫은 ${sb.f[0]}년 ${p0}%에서 ${sb.l[0]}년 ${p1}%${jo('%','로')} ${dp == null ? '' : sgn(dp) + '%p'}입니다`;
      if (sb.n === pkName) { shareHL = sent; if (rs.length > 1) P[P.indexOf(listAll)] = listOf(pkName); else P.splice(P.indexOf(listAll), 1); P.unshift(`${sb.n} ${m0.n}${jo(m0.n,'은')} ${sb.f[0]}년 ${vu(sb.f[1],m0)}에서 ${sb.l[0]}년 ${vu(sb.l[1],m0)}${jo(U(m0)||N(sb.l[1]),'로')} ${sgn(sb.r)}%${top.n === sb.n ? '' : `, 가장 많이 는 ${sh.wn}${jo(sh.wn,'은')} ${top.n}(${sgn(top.r)}%)`}입니다.`); K.unshift({ l: `${sb.n} 몫`, v: `${p1}%`, s: `${sb.f[0]}년 ${p0}% · ${sgn(dp)}%p` }); }
      else { P.push(sent + '.'); K.push({ l: `${sb.n} 몫`, v: `${p1}%`, s: `${sb.f[0]}년 ${p0}%` }); }
    }
    const big = rs.slice().sort((x,y) => y.l[1]-x.l[1])[0];
    if (big.n !== top.n) { const near = big.l[1] && Math.abs(big.l[1] - top.l[1]) / big.l[1] < 0.02;
      P.push(near ? `${l[0]}년에는 ${top.n} ${vu(top.l[1],m0)}${jo(U(m0)||N(top.l[1]),'과')} ${big.n} ${vu(big.l[1],m0)}${jo(U(m0)||N(big.l[1]),'이')} 거의 같습니다.` : `${l[0]}년 가장 큰 ${sh.wn}${jo(sh.wn,'은')} 여전히 ${big.n} ${vu(big.l[1],m0)}입니다.`); }
    const me = rs.find(x => x.n.includes(cx.me)); if (me && me.n !== top.n) P.push(`${cx.me}는 ${sgn(me.r)}%로 ${rs.length}${sh.w} 중 ${rkw(rs.map(x => x.r), me.r)}입니다.`);
    const what = (sh.ctx ? sh.ctx + ' ' : '') + m0.n;
    const lims = open ? [`${l[0]}년은 집계 중이라 증감률이 실제보다 낮게 나올 수 있습니다.`] : [];
    /* 첫해가 둘째 해의 6할도 안 되는 계열은 첫해 기준 증감률이 부풀려진다. 둘째 해부터의 증감률을 같이 둔다 */
    const lowF = rs.filter(x => x.s.length > 2 && x.f[1] < x.s[1][1] * 0.6);
    if (lowF.length > 1 && lowF.length === rs.length) { const T0f = sum(lowF.map(x => x.f[1])), T1f = sum(lowF.map(x => x.s[1][1])), y1 = lowF[0].s[1][0];
      lims.push(`${lowF[0].f[0]}년은 ${y1}년의 ${pct(T0f, T1f)}%(${vu(T0f,m0)}/${vu(T1f,m0)})로 낮아 첫해 기준 증감률이 크게 잡힙니다. ${y1}년부터 보면 ${lowF.map(x => { const r1 = rate(x.s.slice(1)); return `${x.n} ${r1 == null ? '—' : sgn(r1) + '%'}`; }).join(' · ')}입니다.`); }
    else lowF.slice(0,3).forEach(x => { const r1 = rate(x.s.slice(1));
      lims.push(`${x.n}${jo(x.n,'은')} ${x.f[0]}년 ${vu(x.f[1],m0)}${jo(U(m0)||N(x.f[1]),'이')} ${x.s[1][0]}년 ${vu(x.s[1][1],m0)}의 ${pct(x.f[1], x.s[1][1])}%로 낮아 첫해 기준 증감률이 크게 잡힙니다. ${x.s[1][0]}년부터 보면 ${r1 == null ? '—' : sgn(r1) + '%'}입니다.`); });
    /* 집계가 끝난 최근 3년이 ±5% 안인 계열은 제자리 */
    const flat = rs.map(x => { const bb = open ? x.s.slice(0, -1) : x.s; if (bb.length < 3) return null; const t3 = bb.slice(-3), mx3 = Math.max(...t3.map(p => p[1])), mn3 = Math.min(...t3.map(p => p[1])); return mx3 && (mx3 - mn3) / mx3 <= 0.05 ? { n: x.n, t3 } : null; }).filter(Boolean);
    if (flat.length) P.push(`${flat.slice(0,2).map(x => `${x.n}${jo(x.n,'은')} ${x.t3[0][0]}년부터 ${x.t3.map(p => vu(p[1],m0)).join('→')}`).join(', ')}${jo(U(m0)||'값','로')} 제자리입니다${open ? ` (${l[0]}년은 집계 중)` : ''}.`);
    if (small.length) lims.push(`시작값이 작은 ${sh.wn}(첫해 ${vu(10,m0)} 미만 또는 첫해 전체의 2% 미만, 여기서는 ${vu(Math.ceil(minBase),m0)} 미만)은 증감률이 튀어 증감 비교에서 뺐습니다: ${small.map(x => `${x.n}(${x.f[0]}년 ${vu(x.f[1],m0)}→${x.l[0]}년 ${vu(x.l[1],m0)})`).join(' · ')}.`);
    if (om.size && [...g.keys()].some(n => om.has(n))) lims.push(`${[...om].filter(n => g.has(n)).join(' · ')}${jo([...om][0],'은')} ${sh.wn} 비교에서 뺐습니다 (표·그림에는 있습니다).`);
    return { headline: shareHL ? shareHL : `가장 많이 는 ${sh.wn}${jo(sh.wn,'은')} ${top.n}, ${what} ${top.f[0]}년 ${vu(top.f[1],m0)}에서 ${l[0]}년 ${vu(top.l[1],m0)}${jo(U(m0)||N(top.l[1]),'로')} ${sgn(top.r)}%입니다`,
      points: P, kpi: K, series: g, main: top.n, lims };
  };

  INT.share = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]);
    /* 항목 축: 2축이면 둘째 축(연도가 아닌 쪽), 1축이면 그 축 */
    const icol = sh.cols === 2 ? (sh.icol != null ? sh.icol : (sh.gcol != null ? sh.gcol : 1)) : 0;
    const pk = sh.pick || null, gcol2 = icol === 1 ? 0 : 1;
    if (pk && pk.g && sh.cols === 2) rows = rows.filter(r => labs(r)[gcol2] === pk.g);   /* 묶음을 콕 집었으면 그 묶음 안의 구성 */
    const f = desc(fold(rows, icol), 0), st = (sh.a && sh.a.stats) || null, T = st && sh.cols === 1 ? st.total : sum(nums(f)), top = f[0], P = [], K = [], lims = [];
    const sh1 = pct(val(top,0)||0, T);
    let pickP = null, pkn = pickName(pk), szHL = null, pv = null;
    if (pk && pk.i) { const set = new Set(pk.i); pv = sum(f.filter(r => set.has(labs(r)[0])).map(r => val(r,0)||0)); pickP = pct(pv, T);
      K.push({ l: pk.name || pkn, v: `${pickP}%`, s: `${vu(pv,m0)} / ${vu(T,m0)}` });
      /* 규모 열이 있으면 몫을 규모 몫과 견준다 (사람 35%가 논문 65%를 낸다) */
      const szj = sh.cols <= 1 ? sizeCol(ms, sh, cx) : -1;
      if (szj > 0) { const sz = cx.M(ms[szj]), zs = sum(f.map(r => val(r,szj)||0)), zp = sum(f.filter(r => set.has(labs(r)[0])).map(r => val(r,szj)||0)), u = pcU(m0, sz);
        if (zs && zp && zs > zp) { const a = Math.round(pv/zp*10)/10, b = Math.round((T-pv)/(zs-zp)*10)/10, ps = pct(zp, zs);
          szHL = `${pkn}${jo(pkn,'은')} ${sz.n} ${ps}%로 ${m0.n} ${pickP}%를 냅니다 (${szName(sz)} 1인당 ${N(a)}${u} vs 나머지 ${N(b)}${u})`;
          K.push({ l: `${szName(sz)} 1인당 ${m0.n}`, v: `${N(a)}${u}`, s: `나머지 ${N(b)}${u}${b ? ` · ${RX(a,b)}배` : ''}` }); } } }
    if (!(pk && pk.i && pk.i.length === 1 && pk.i[0] === lab(top))) K.push({ l: lab(top), v: `${sh1}%`, s: vu(val(top,0),m0) });
    if (f[1]) K.push({ l: lab(f[1]), v: `${pct(val(f[1],0)||0,T)}%`, s: vu(val(f[1],0),m0) });
    /* 결론이 이미 말한 항목(콕 집은 한 항목, 아니면 1위)은 나열에서 뺀다 */
    const saidI = pk && pk.i ? (pk.i.length === 1 ? new Set(pk.i) : new Set()) : (f.length > 2 ? new Set([labs(top)[0]]) : new Set());
    const fl = f.filter(r => !saidI.has(labs(r)[0])), saidV = sum(f.filter(r => saidI.has(labs(r)[0])).map(r => val(r,0)||0)), nxt = saidI.has(labs(top)[0]);   /* 1위를 뺐으면 «그다음은» */
    if (fl.length) P.push(f.length === 2 && !(pk && pk.i) ? f.map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ') + '.' : `${nxt ? '그다음은 ' : ''}${fl.slice(0,4).map(r => `${lab(r)} ${pct(val(r,0)||0,T)}%`).join(' · ')}${nxt ? '입니다' : ''}.`);   /* 둘뿐이면 머리말이 몫을 말했으니 값으로 */
    if (fl.length === 5) { P.push(`${lab(fl[4])} ${pct(val(fl[4],0)||0,T)}%.`); K.push({ l: lab(fl[4]), v: `${pct(val(fl[4],0)||0,T)}%`, s: vu(val(fl[4],0),m0) }); }
    else if (fl.length > 4) { const rest = pct(T - saidV - sum(fl.slice(0,4).map(r => val(r,0)||0)), T); P.push(`나머지 ${fl.length-4}가지가 ${rest}%입니다.`); K.push({ l: '나머지', v: `${rest}%`, s: `${fl.length-4}가지` }); }
    else K.push({ l: '전체', v: vu(T,m0), s: `${f.length}가지` });
    /* 묶음별 구성이면 1위 항목의 몫이 가장 큰 묶음과 작은 묶음 */
    if (sh.cols === 2 && !(pk && pk.g)) {
      const gcol = gcol2, gs = new Map(), set = new Set(pk && pk.i ? pk.i : [labs(top)[0]]), nm = pk && pk.i ? pkn : labs(top)[0];
      rows.forEach(r => { const g = labs(r)[gcol], it = labs(r)[icol], v = val(r,0)||0; const o = gs.get(g) || gs.set(g, { t:0, top:0 }).get(g); o.t += v; if (set.has(it)) o.top += v; });
      const MINB = sh.count ? 10 : 0, arrAll = [...gs.entries()].map(([g,o]) => ({ g, p: pct(o.top, o.t), v: o.top, t: o.t })).filter(x => x.p != null);
      const smallG = arrAll.filter(x => x.t < MINB), arr = (arrAll.length - smallG.length > 1 ? arrAll.filter(x => x.t >= MINB) : arrAll).sort((a,b) => b.p-a.p);
      const side = xs => xs.length > 1 ? `${xs[0].p}%인 ${xs.length}${sh.w}(${xs.slice(0,3).map(x => x.g).join(' · ')}${xs.length > 3 ? ' 등' : ''})` : `${xs[0].g} ${xs[0].p}%`;
      if (arr.length > 1) { const mx = arr.filter(x => x.p === arr[0].p), mn = arr.filter(x => x.p === arr[arr.length-1].p);
        P.push(`${nm} 몫이 가장 큰 곳은 ${side(mx)}, 가장 작은 곳은 ${side(mn)}입니다.`); }
      if (smallG.length && arr.length > 1) lims.push(`전체 ${vu(MINB,m0)} 미만인 ${smallG.length}${sh.w}(${smallG.slice(0,4).map(x => `${x.g} ${vu(x.t,m0)}`).join(' · ')}${smallG.length > 4 ? ' 등' : ''})${jo(sh.w,'은')} 몫 비교에서 뺐습니다 (표에는 있습니다).`);
      if (pk && pk.i && arr.length > 1) { const bv = arr.slice().sort((a,b) => b.v-a.v)[0]; P.push(`${nm} ${m0.n}${jo(m0.n,'이')} 가장 많은 곳은 ${bv.g} ${vu(bv.v,m0)}입니다.`); }
      const me = arr.find(x => x.g.includes(cx.me)); if (me) P.push(`${cx.me}는 ${me.p}%입니다.`);
    }
    if (ms.length > 1 && sh.cols === 1) {
      const one = pk && pk.i && pk.i.length === 1 ? f.find(r => lab(r) === pk.i[0]) : null;
      if (one) ms.slice(1).forEach((id, j) => { const m = cx.M(id), v = val(one, j+1); if (v == null) return;
        const others = f.filter(r => r !== one && val(r, j+1) != null).sort((a,b) => val(b,j+1) - val(a,j+1)); if (!others.length) return;
        const hi = others[0], lo = others[others.length-1], above = others.filter(r => val(r,j+1) < v).length;
        const rest = others.length <= 3 ? others.map(r => `${lab(r)} ${vu(val(r,j+1),m)}`).join(' · ') : `최고 ${lab(hi)} ${vu(val(hi,j+1),m)} · 최저 ${lab(lo)} ${vu(val(lo,j+1),m)}`;
        P.push(`${m.n}${jo(m.n,'은')} ${lab(one)} ${vu(v,m)}${jo(U(m)||N(v),'로')} ${others.length === 1 ? `${lab(hi)} ${vu(val(hi,j+1),m)}보다 ${v > val(hi,j+1) ? '높습니다' : v < val(hi,j+1) ? '낮습니다' : '같습니다'}` : `${others.length + 1}${sh.w} 중 ${above === others.length ? '가장 높습니다' : above === 0 ? '가장 낮습니다' : `${others.length - above + 1}번째입니다`} (${rest})`}.`); });
      else P.push(f.slice(0,3).map(r => `${lab(r)} ${ms.slice(1).map((id, j) => `${cx.M(id).n} ${vu(val(r,j+1),cx.M(id))}`).join(' · ')}`).join(', ') + '.');
    }
    const scope = pk && pk.g ? `${pk.g} ` : sh.ctx ? `${sh.ctx} ` : '', scope2 = scope ? `${scope}${vu(T,m0)} 중 ` : '';   /* 걸러진 모수(주저자·AI·학생)는 결론 앞에 밝힌다 */
    const head = szHL ? szHL : pickP != null ? (sh.askCount ? `${scope}${pkn}${jo(pkn,'은')} ${vu(pv,m0)}입니다 (${vu(T,m0)} 중 ${pickP}%)` : `${scope}${vu(T,m0)} 중 ${pkn}${jo(pkn,'은')} ${pickP}%입니다`)
        : f.length === 2 ? `${scope2}${lab(f[0])} ${sh1}%, ${lab(f[1])} ${pct(val(f[1],0)||0,T)}%입니다` : `${scope2}${lab(top)}${jo(lab(top),'이')} ${sh1}%로 가장 큰 몫입니다`;
    if (!head.includes(vu(T,m0))) P.push(`전체 ${vu(T,m0)}입니다.`);   /* 결론이 합계를 말했으면 되풀이하지 않는다 */
    if (P.length < 2 && pickP != null && pv > 0 && T - pv > 0) {   /* 요점이 하나뿐이면 콕 집은 몫 대 나머지의 배수를 붙인다 */
      const set = new Set(pk.i), rest = f.filter(r => !set.has(labs(r)[0])), rn = rest.length === 1 ? lab(rest[0]) : '나머지', rv = T - pv;
      P.push(rv >= pv ? `${rn}${jo(rn,'이')} ${pkn}의 ${RX(rv,pv)}배입니다.` : `${pkn}${jo(pkn,'이')} ${rn}의 ${RX(pv,rv)}배입니다.`); }
    /* 표: 2축을 항목별로 접었으면 묶음 칸에 콕 집은 묶음(없으면 '전체')을 넣어 머리글과 칸 수를 맞춘다 */
    const gname = pk && pk.g ? pk.g : '전체', sorted = sh.cols === 2 ? f.map(r => [gcol2 === 0 ? [gname, labs(r)[0]] : [labs(r)[0], gname], ...r.slice(1)]) : f;
    return { headline: head, points: P, kpi: K, sorted, hi: new Set([0]), icol, rows, lims };
  };

  INT.conc = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]);
    if (!sh.count) {
      /* 값이 이미 집중도(비율)다. 몇 곳이 절반을 넘는지 센다 */
      const all = desc(rows, 0), m1 = ms[1] ? cx.M(ms[1]) : null, MINB = 10;
      const small = m1 ? all.filter(r => val(r,1) != null && val(r,1) < MINB) : [];   /* 바탕(건수)이 작은 곳은 100%가 쉽게 나온다 */
      const f = all.filter(r => !small.includes(r)), over = f.filter(r => (val(r,0)||0) >= 50).length, top = f[0];
      const w = r => m1 && val(r,1) != null ? `${lab(r)} ${vu(val(r,0),m0)}(${vu(val(r,1),m1)})` : `${lab(r)} ${vu(val(r,0),m0)}`;
      const lims = small.length ? [`${m1.n} ${vu(MINB,m1)} 미만인 ${small.length}${sh.w}은 한두 명으로 값이 튀어 비교에서 뺐습니다: ${small.map(w).join(' · ')}.`] : ['사람 수가 적은 곳은 한두 명으로 값이 크게 흔들립니다.'];
      return { headline: `${f.length}${sh.w} 중 ${over}${sh.w}은 상위 3명이 절반 넘게 만듭니다`,
        points: [`가장 몰린 곳은 ${f.slice(0,3).map(w).join(' · ')}입니다.`,
                 `가장 고른 곳은 ${w(f[f.length-1])}입니다.`],
        kpi: [{ l: '절반 넘는 곳', v: `${over}${sh.w}`, s: `${f.length}${sh.w} 중` }, { l: '가장 몰린 곳', v: lab(top), s: vu(val(top,0),m0) }, { l: '가장 고른 곳', v: lab(f[f.length-1]), s: vu(val(f[f.length-1],0),m0) }],
        sorted: all, hi: new Set(all.map((r,i) => !small.includes(r) && (val(r,0)||0) >= 50 ? i : -1).filter(i => i >= 0)), lims };
    }
    const st = (sh.a && sh.a.stats) || null;   /* 잘린 표는 전체 기준 합계·꼴찌를 쓴다 */
    const f = desc(fold(rows), 0), vs = nums(f), T = st ? st.total : sum(vs), nAll = st ? sh.a.n : f.length, t3 = pct(sum(vs.slice(0,3)), T);
    let half = vs.length, s = 0; for (let i = 0; i < vs.length; i++) { s += vs[i]; if (s >= T/2) { half = i+1; break; } }
    /* 쏠림 판정: 상위 3이 절반 이상이거나, 전체의 2할 이하가 절반을 만들면 쏠림 */
    const skew = t3 >= 50 || half <= Math.max(1, nAll * 0.2);
    const bottom = st ? st.bottom : (() => { const nz = f.filter(r => (val(r,0)||0) > 0), b = nz[nz.length-1] || f[f.length-1]; return [labs(b), val(b,0)]; })();
    const zeros = st ? (st.zeros || 0) : f.filter(r => !(val(r,0) > 0)).length, zl = st ? (st.zero_names || []) : f.filter(r => !(val(r,0) > 0)).map(lab);
    return { headline: skew ? `상위 3${sh.w}${jo(sh.w,'이')} ${t3}%, ${nAll}${sh.w} 중 ${half}${sh.w}${jo(sh.w,'이')} 절반을 만들어 쏠림이 큽니다` : `상위 3${sh.w}${jo(sh.w,'이')} ${t3}%로 비교적 고르게 퍼져 있습니다`,
      points: [skew ? null : `${nAll}${sh.w} 가운데 ${half}${sh.w}${jo(sh.w,'이')} 절반을 만듭니다.`,
               `상위 3${sh.w}${jo(sh.w,'은')} ${f.slice(0,3).map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ')}입니다.`,
               `가장 작은 ${sh.wn}${jo(sh.wn,'은')} ${zeros ? `0${U(m0)}인 ${zeros}${sh.w}(${zl.slice(0,3).join(' · ')}${zeros > 3 ? ' 등' : ''})이고, 그 위는 ` : ''}${Array.isArray(bottom[0]) ? bottom[0].join(' · ') : bottom[0]} ${vu(bottom[1],m0)}입니다.`],
      kpi: [{ l: '상위 3 기여율', v: `${t3}%`, s: `전체 ${vu(T,m0)}` }, { l: '절반 만드는 수', v: `${half}${sh.w}`, s: `${nAll}${sh.w} 중` }, { l: '판정', v: skew ? '쏠림' : '고름', s: '상위 3이 절반, 또는 2할이 절반이면 쏠림' }],
      sorted: f, hi: new Set([0,1,2]), half };
  };

  INT.link = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), m1 = cx.M(ms[1] || ms[0]);
    const pts = rows.map(r => ({ n: lab(r), x: val(r,0), y: val(r,1) })).filter(p => p.x != null && p.y != null);
    if (pts.length < 3 || !ms[1]) return Object.assign(INT.rank(rows, ms, sh, cx), { fallback: ms.length > 1 ? 'table_rank' : 'bar_h' });
    const dropped = rows.filter(r => val(r,0) == null || val(r,1) == null).map(lab);
    const lims = dropped.length ? [`${dropped.slice(0,5).join(' · ')}${dropped.length > 5 ? ` 등 ${dropped.length}${sh.w}` : ''}${jo(dropped[0],'은')} ${rows.some(r => val(r,1) == null) ? m1.n : m0.n} 값이 없어 상관·사분면에서 뺐습니다 (표에는 있습니다).`] : [];
    const mx = sum(pts.map(p => p.x))/pts.length, my = sum(pts.map(p => p.y))/pts.length;
    const cov = sum(pts.map(p => (p.x-mx)*(p.y-my))), sx = Math.sqrt(sum(pts.map(p => (p.x-mx)**2))), sy = Math.sqrt(sum(pts.map(p => (p.y-my)**2)));
    const r = (sx && sy) ? cov/(sx*sy) : 0, q = t => pts.filter(t);
    const hh = q(p => p.x > mx && p.y > my), ll = q(p => p.x <= mx && p.y <= my), hl = q(p => p.x > mx && p.y <= my), lh = q(p => p.x <= mx && p.y > my);
    const strength = Math.abs(r) < 0.2 ? '거의 없음' : Math.abs(r) < 0.5 ? '약함' : '뚜렷함';
    return { headline: Math.abs(r) < 0.2 ? `${m0.n}${jo(m0.n,'과')} ${m1.n}${jo(m1.n,'은')} 거의 따로 움직입니다 (상관 ${r.toFixed(2)})`
        : r > 0 ? (r < 0.5 ? `${m0.n}${jo(m0.n,'이')} 높은 곳은 ${m1.n}도 높은 경향이 약하게 있습니다 (상관 ${r.toFixed(2)})` : `${m0.n}${jo(m0.n,'이')} 높은 곳은 ${m1.n}도 높습니다 (상관 ${r.toFixed(2)}, 뚜렷함)`)
        : (r > -0.5 ? `${m0.n}${jo(m0.n,'이')} 높은 곳은 ${m1.n}${jo(m1.n,'이')} 낮은 경향이 약하게 있습니다 (상관 ${r.toFixed(2)})` : `${m0.n}${jo(m0.n,'이')} 높은 곳은 ${m1.n}${jo(m1.n,'이')} 오히려 낮습니다 (상관 ${r.toFixed(2)}, 뚜렷함)`),
      points: [`둘 다 높은 곳 ${hh.length}${sh.w}${hh.length ? ' (' + hh.slice(0,3).map(p => p.n).join(' · ') + (hh.length > 3 ? ' 등' : '') + ')' : ''}, 둘 다 낮은 곳 ${ll.length}${sh.w}입니다.`,
               hl.length ? `${m0.n}만 높은 곳 ${hl.length}${sh.w}: ${hl.slice(0,3).map(p => p.n).join(' · ')}${hl.length > 3 ? ' 등' : ''}.` : `${m0.n}만 높은 곳은 없습니다.`,
               lh.length ? `${m1.n}만 높은 곳 ${lh.length}${sh.w}: ${lh.slice(0,3).map(p => p.n).join(' · ')}${lh.length > 3 ? ' 등' : ''}.` : '',
               `평균은 ${m0.n} ${vu(Math.round(mx*100)/100,m0)} · ${m1.n} ${vu(Math.round(my*100)/100,m1)}입니다.`].filter(Boolean),
      kpi: [{ l: '상관계수', v: r.toFixed(2), s: strength }, { l: '둘 다 높은 곳', v: `${hh.length}${sh.w}`, s: `${pts.length}${sh.w} 중` }, { l: `${m0.n}만 높은 곳`, v: `${hl.length}${sh.w}`, s: hl.length ? hl.slice(0,2).map(p => p.n).join(' · ') + (hl.length > 2 ? ' 등' : '') : '없음' }],
      pts, mx, my, r, lims };
  };

  INT.profile = (rows, ms, sh, cx) => {
    /* 첫 축(묶음)마다 둘째 축(항목) 상위 3 */
    const m0 = cx.M(ms[0]), gcol = 0, icol = 1, G = new Map();
    rows.forEach(r => { const g = labs(r)[gcol]; (G.get(g) || G.set(g, []).get(g)).push([labs(r)[icol], val(r,0)||0]); });
    G.forEach(a => a.sort((x,y) => y[1]-x[1]));
    /* 동률 1위는 전부 1위로 센다 (화학과 Materials·Chemistry 공동 → 둘 다 1위 집계에 포함) */
    const tops = [...G.entries()].map(([g,a]) => { const ts = a.filter(x => x[1] === a[0][1]).map(x => x[0]); return { g, ts, top: ts.length > 1 ? ts.join('·') + ' 공동' : a[0][0], a }; });
    const cnt = new Map(); tops.forEach(t => t.ts.forEach(x => cnt.set(x, (cnt.get(x)||0)+1)));
    const [item, c] = [...cnt.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0];
    const diff = tops.filter(t => !t.ts.includes(item)), tied = tops.filter(t => t.ts.length > 1 && t.ts.includes(item));
    const me = tops.find(t => t.g.includes(cx.me)), P = [], K = [], IW = ORG[sh.a.cols[1]] || ORG._; let ovS = null;
    const hl = `${tops.length}${sh.w} 중 ${c}${sh.w}은 ${item}${jo(item,'이')} 1위입니다`;
    if (tops.length <= 8) P.push(`1위: ${tops.map(t => `${t.g} ${t.top}`).join(' · ')}.`);
    K.push({ l: '가장 흔한 1위', v: item, s: `${tops.length}${sh.w} 중 ${c}${sh.w}${tied.length ? ` (공동 ${tied.length})` : ''}` });
    if (tied.length) P.push(`${item} 1위 ${c}${sh.w} 중 ${tied.length}${sh.w}${jo(sh.w,'은')} 공동 1위입니다: ${tied.map(t => `${t.g}(${t.ts.filter(x => x !== item).join('·')}와 ${vu(t.a[0][1],m0)}으로 같음)`).join(' · ')}.`);
    if (diff.length) { if (tops.length > 8) P.push(`1위가 다른 곳은 ${diff.slice(0,8).map(t => `${t.g}(${t.top})`).join(' · ')}${diff.length > 8 ? ` 등 ${diff.length}${sh.w}` : ''}입니다.`); K.push({ l: '1위가 다른 곳', v: `${diff.length}${sh.w}`, s: diff.slice(0,3).map(t => t.g).join(' · ') + (diff.length > 3 ? ' 등' : '') }); }
    if (me) {
      P.push(`${cx.me}의 상위 3은 ${me.a.slice(0,3).map(x => `${x[0]} ${vu(x[1],m0)}`).join(' · ')}입니다.`);
      const mine = new Set(me.a.slice(0,5).map(x => x[0]));
      const ov = tops.filter(t => !t.g.includes(cx.me)).map(t => ({ g: t.g, n: t.a.slice(0,5).filter(x => mine.has(x[0])).length })).sort((a,b) => b.n-a.n);
      if (ov.length) { const most = ov.filter(x => x.n === ov[0].n).map(x => x.g), least = ov.filter(x => x.n === ov[ov.length-1].n).map(x => x.g);
        ovS = `${cx.me}와 상위 5 ${IW.n}${jo(IW.n,'이')} 가장 많이 겹치는 곳은 ${most.slice(0,3).join('·')}${most.length > 3 ? ' 등' : ''} (5개 중 ${ov[0].n}개), 가장 적게 겹치는 곳은 ${least.slice(0,3).join('·')}${least.length > 3 ? ' 등' : ''} (${ov[ov.length-1].n}개)입니다.`; P.push(ovS);
        K.splice(1, 0, { l: '우리와 겹침', v: most.slice(0,2).join('·') + (most.length > 2 ? ' 등' : ''), s: `상위 5 중 ${ov[0].n}개` }); }
    } else { const big = tops.slice().sort((a,b) => b.a[0][1]-a.a[0][1])[0]; P.push(`가장 큰 칸은 ${big.g} × ${big.top} ${vu(big.a[0][1],m0)}입니다.`); }
    let head = hl;
    if (sh.lead === 'overlap' && ovS) {
      /* 질문이 «겹치는 곳»이면 겹침이 결론, 1위 요약은 요점으로 */
      P.splice(P.indexOf(ovS), 1); const k = K.findIndex(x => x.l === '우리와 겹침');
      const ov = tops.filter(t => !t.g.includes(cx.me)).map(t => ({ g: t.g, n: t.a.slice(0,5).filter(x => me.a.slice(0,5).some(y => y[0] === x[0])).length })).sort((a,b) => b.n-a.n);
      const most = ov.filter(x => x.n === ov[0].n).map(x => x.g);
      head = `${cx.me}와 상위 5 ${IW.n}${jo(IW.n,'이')} ${ov[0].n === 5 ? '모두' : ov[0].n + '개'} 겹치는 ${sh.wn}${jo(sh.wn,'은')} ${most.slice(0,4).join('·')}${most.length > 4 ? ' 등' : ''} ${most.length}${sh.w}입니다`;
      P.unshift(hl + '.'); if (k > 0) K.unshift(K.splice(k, 1)[0]);
    }
    return { headline: head, points: P, kpi: K, groups: tops };
  };

  /* 앞서는 항목·뒤처지는 항목: 항목(둘째 축)마다 묶음(첫 축) 사이 우리 순위 */
  INT.edge = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), m1 = ms[1] ? cx.M(ms[1]) : null, I = new Map();
    const IW = (ORG[sh.a.cols[1]] || ORG._), GN = (cx.AX && cx.AX[sh.a.cols[0]]) || sh.wn;   /* 항목(분야)의 세는 말 · 묶음(대학)의 이름 */
    rows.forEach(r => { const it = labs(r)[1]; (I.get(it) || I.set(it, []).get(it)).push({ g: labs(r)[0], v: val(r,0), v1: val(r,1) }); });
    const mine = [...I.entries()].map(([it, a]) => { const o = a.filter(x => x.v != null).sort((x,y) => y.v-x.v), i = o.findIndex(x => x.g.includes(cx.me));
      if (i < 0) return null; const o1 = m1 ? a.filter(x => x.v1 != null).sort((x,y) => y.v1-x.v1) : null, i1 = o1 ? o1.findIndex(x => x.g.includes(cx.me)) : -1;
      return { it, r: i+1, n: o.length, v: o[i].v, top: o[0], r1: i1 >= 0 ? i1+1 : null, n1: o1 ? o1.length : null, v1: i1 >= 0 ? o1[i1].v1 : null }; }).filter(Boolean);
    if (!mine.length) return INT.profile(rows, ms, sh, cx);
    mine.sort((a,b) => (a.r/a.n) - (b.r/b.n) || a.r - b.r || b.v - a.v);   /* 순위 비율 → 순위 숫자 → 값 */
    const best = mine.filter(x => x.r === mine[0].r && x.n === mine[0].n);
    const lead = mine.filter(x => x.r === 1), lag = mine.filter(x => x.r === x.n && x.n > 1), P = [], K = [];
    const rk = x => `${x.it} ${x.r}위/${x.n}${sh.w} (${vu(x.v,m0)}${x.r > 1 ? `, 1위 ${x.top.g} ${vu(x.top.v,m0)}` : ''})`;
    /* 셋째 자리와 (순위, 모수)가 같은 항목은 이어 붙인다 (KPI의 동률 규칙과 같게) */
    const tied3 = arr => { const t = arr.slice(0,3), z = t[t.length-1], ext = arr.slice(3).filter(x => x.r === z.r && x.n === z.n); return `${[...t, ...ext.slice(0,2)].map(rk).join(' · ')}${ext.length > 2 ? ` 등 ${ext.length + 1}개 동률` : ''}`; };
    P.push(`앞서는 쪽: ${tied3(mine)}.`);
    P.push(`뒤처지는 쪽: ${tied3(mine.slice().reverse())}.`);
    if (m1) { const q = mine.filter(x => x.r1).sort((a,b) => (a.r1/a.n1) - (b.r1/b.n1)); if (q.length) P.push(`${m1.n}${jo(m1.n,'로')} 보면 가장 앞서는 ${IW.n}${jo(IW.n,'은')} ${q[0].it} ${q[0].r1}위/${q[0].n1}${sh.w} (${vu(q[0].v1,m1)}), 가장 뒤처지는 ${IW.n}${jo(IW.n,'은')} ${q[q.length-1].it} ${q[q.length-1].r1}위/${q[q.length-1].n1}${sh.w} (${vu(q[q.length-1].v1,m1)})입니다.`); }
    K.push({ l: '1위인 ' + IW.n, v: `${lead.length}${IW.w}`, s: lead.slice(0,3).map(x => x.it).join(' · ') || '없음' });
    K.push({ l: '꼴찌인 ' + IW.n, v: `${lag.length}${IW.w}`, s: lag.slice(0,3).map(x => x.it).join(' · ') || '없음' });
    K.push({ l: '가장 앞서는 ' + IW.n, v: best.slice(0,2).map(x => x.it).join('·') + (best.length > 2 ? ' 등' : ''), s: `${mine[0].r}위/${mine[0].n}${sh.w}${best.length > 1 ? ` · ${best.length}개 동률` : ''}` });
    const G = new Map(); rows.forEach(r => { const g = labs(r)[0]; (G.get(g) || G.set(g, []).get(g)).push([labs(r)[1], val(r,0)||0]); }); G.forEach(a => a.sort((x,y) => y[1]-x[1]));
    return { headline: `${cx.me}${jo(cx.me,'은')} ${mine.length}${IW.w} ${IW.n} 중 ${lead.length}${IW.w}에서 1위, ${lag.length}${IW.w}에서 꼴찌입니다`, points: P, kpi: K,
      groups: [...G.entries()].map(([g,a]) => ({ g, top: a[0][0], a })), lims: [`${IW.n}${jo(IW.n,'은')} ${GN}마다 상위 8${IW.w}만 있어 순위는 그 ${IW.n}${jo(IW.n,'을')} 상위 8에 둔 ${GN} 사이의 순위입니다.`] };
  };

  INT.lookup = (rows, ms, sh, cx) => {
    const m0 = cx.M(ms[0]), v1 = r => r[2] == null ? '' : typeof r[2] === 'number' ? `${cx.M(ms[1]).n} ${vu(r[2],cx.M(ms[1]))}` : String(r[2]);
    if (rows.length && typeof rows[0][1] !== 'number') {
      const cell = (r, j) => `${cx.M(ms[j]).n} ${typeof r[1+j] === 'number' ? vu(r[1+j], cx.M(ms[j])) : (r[1+j] ?? '—')}`;
      return { headline: `${rows.length}가지를 ${ms.length}가지 기준으로 나란히 놓았습니다`,
        points: rows.length <= 5 ? rows.map(r => `${lab(r)}: ${ms.map((_, j) => cell(r, j)).join(' · ')}.`)
          : [...rows.slice(0,4).map(r => `${lab(r)}: ${ms.map((_, j) => cell(r, j)).join(' · ')}.`), `${rows.slice(4).map(r => `${lab(r)}: ${ms.map((_, j) => cell(r, j)).join(' · ')}`).join(' / ')}.`],
        kpi: rows.slice(0,3).map(r => ({ l: lab(r), v: typeof r[1] === 'number' ? vu(r[1], cx.M(ms[0])) : String(r[1] ?? '—'), s: ms.slice(1).map((_, j) => cell(r, j+1)).join(' · ') })), sorted: rows };
    }
    const T = sh.count && rows.length > 1 ? sum(nums(rows)) : null;
    const line = r => `${lab(r)} ${vu(val(r,0),m0)}` + (ms[1] && v1(r) ? ` (${v1(r)})` : T ? ` (${pct(val(r,0)||0,T)}%)` : '');
    const top0 = rows.length > 1 && typeof rows[0][1] === 'number' ? desc(rows,0)[0] : null, rest = rows.filter(r => r !== top0);
    const P = rest.length ? [`${rest.slice(0,6).map(line).join(' · ')}${rest.length > 6 ? ` 등 ${rest.length}가지` : ''}.`] : [];   /* 결론에 든 행은 뺀다 */
    const K = rows.slice(0,3).map(r => ({ l: lab(r), v: vu(val(r,0),m0), s: ms[1] ? v1(r) : m0.n }));
    /* 합계 지표 옆에 1인당 지표가 있으면 합계 1위와 1인당 1위를 나란히 (합계만으로 '가장 높다' 하지 않는다) */
    const pcI = rows.length > 1 ? ms.findIndex((id, k) => k > 0 && cx.M(id).pc) : -1;
    if (pcI > 0 && rows.every(r => val(r,pcI) != null)) { const mp = cx.M(ms[pcI]), o = desc(rows, 0), op = desc(rows, pcI);
      return { headline: `${m0.n} 합계는 ${lab(o[0])} ${vu(val(o[0],0),m0)}, ${mp.n}${jo(mp.n,'은')} ${lab(op[0])} ${vu(val(op[0],pcI),mp)}${jo(U(mp)||N(val(op[0],pcI)),'이')} 가장 높습니다`,
        points: [o.length > 1 ? `${m0.n} 그다음은 ${o.slice(1).map(r => `${lab(r)} ${vu(val(r,0),m0)}`).join(' · ')}입니다.` : null, op.length > 1 ? `${mp.n} 그다음은 ${op.slice(1).map(r => `${lab(r)} ${vu(val(r,pcI),mp)}`).join(' · ')}입니다.` : null].filter(Boolean),   /* 결론에 든 1위 행은 뺀다 */
        kpi: op.slice(0,3).map(r => ({ l: lab(r), v: vu(val(r,pcI),mp), s: `${m0.n} ${vu(val(r,0),m0)}` })), sorted: rows }; }
    return { headline: rows.length === 1 ? `${m0.n}${jo(m0.n,'은')} ${vu(val(rows[0],0),m0)}입니다`
      : typeof rows[0][1] !== 'number' ? `${rows.length}가지를 나란히 놓았습니다`
      : `${rows.length}${sh.wn === '것' ? '가지' : `${sh.w} ${sh.wn}`} 중 ${lab(desc(rows,0)[0])}${jo(lab(desc(rows,0)[0]),'이')} ${vu(val(desc(rows,0)[0],0),m0)}${ms[1] && v1(desc(rows,0)[0]) ? `(${v1(desc(rows,0)[0])})` : ''}${jo(U(m0)||N(val(desc(rows,0)[0],0)),"로")} 가장 큽니다`,
      points: T ? [`몫은 ${desc(rows,0).slice(0,6).map(r => `${lab(r)} ${pct(val(r,0)||0,T)}%`).join(' · ')}${rows.length > 6 ? ` 등 ${rows.length}가지` : ''}입니다 (합계 ${vu(T,m0)}).`] : P, kpi: K, sorted: rows };
  };

  /* ── 위젯: 그리기 (보드 문법) ──────────────────────────── */
  const card = (t, inner) => `<div class="ecard" style="margin:0"><div class="sub-t">${esc(t)}</div>${inner}</div>`;
  const barColor = (i, hi, r, cx, mode) => isMe(r, cx) ? 'var(--accent)' : (hi && hi.has(i)) ? (mode === 'asc' ? '#e08196' : 'var(--s-blue)') : 'var(--c4)';

  const R = {};
  R.bar_h = (o, a, ms, cx) => {
    const k = o.sortBy || 0, m = cx.M(ms[k]), rows = o.sorted.slice(0, TABLE_N), max = Math.max(...nums(rows, k), 0);
    const dir = o.sortDir || cx.I[o.intent].sort;
    return card(`${m.n} · ${dir === 'asc' ? '낮은 순' : '높은 순'}${o.sorted.length > TABLE_N ? ` · 상위 ${TABLE_N}` : ''}`,
      rows.map((r, i) => `<div class="dl"><div class="n" title="${esc(lab(r))}">${esc(lab(r))}</div><div class="bar"><i style="width:${max ? Math.max(1, (val(r,k)||0)/max*100) : 0}%;background:${barColor(i, o.hi, r, cx, dir)}"></i></div><div class="v">${vu(val(r,k),m)}</div></div>`).join(''));
  };
  R.pareto = (o, a, ms, cx) => {
    const m = cx.M(ms[0]), rows = o.sorted.slice(0, TABLE_N), st = (o.sh && o.sh.a && o.sh.a.stats) || null, T = st ? st.total : sum(nums(o.sorted)), max = Math.max(...nums(rows), 0); let c = 0;
    return card(`${m.n} · 높은 순 · 오른쪽은 누적 몫`, rows.map((r, i) => { c += val(r,0)||0; const cp = pct(c, T);
      return `<div class="dl"><div class="n" title="${esc(lab(r))}">${esc(lab(r))}</div><div class="bar"><i style="width:${max ? Math.max(1,(val(r,0)||0)/max*100) : 0}%;background:${i < o.half ? '#b45309' : 'var(--c4)'}"></i></div><div class="v" style="flex:0 0 118px;white-space:nowrap">${vu(val(r,0),m)}<span class="pc" style="color:${i < o.half ? '#b45309' : 'var(--ink3)'}">${cp}%</span></div></div>`; }).join('')
      + `<div class="d" style="margin-top:8px">진한 막대 ${o.half}곳이 절반을 만듭니다.</div>`);
  };
  R.bar_v = (o, a, ms, cx) => {
    const m = cx.M(ms[0]), rows = o.sorted.slice(0, 12), max = Math.max(...nums(rows), 0);
    return card(m.n, `<div class="ybar" style="height:170px">${rows.map(r => `<div title="${esc(lab(r))} ${vu(val(r,0),m)}"><i style="height:${max ? Math.max(3,(val(r,0)||0)/max*150) : 3}px;background:${isMe(r,cx) ? 'var(--accent)' : 'var(--s-blue)'};border-radius:5px 5px 2px 2px"></i><span>${esc(String(labs(r)[0]).slice(0,6))}</span></div>`).join('')}</div>`);
  };
  R.bar_group = (o, a, ms, cx) => {
    const rows = o.sorted.slice(0, 8), maxes = ms.map((_, k) => Math.max(...nums(rows, k), 0));
    return card(ms.map(id => cx.M(id).n).join(' · '), rows.map(r => `<div style="margin:6px 0 10px"><div style="font-weight:600;font-size:12px;margin-bottom:3px">${esc(lab(r))}</div>` +
      ms.map((id, k) => `<div class="dl" style="margin:2px 0"><div class="n" style="width:110px;font-size:11px;color:var(--ink3)">${esc(cx.M(id).n)}</div><div class="bar"><i style="width:${maxes[k] ? Math.max(1,(val(r,k)||0)/maxes[k]*100) : 0}%;background:${col(k)}"></i></div><div class="v">${vu(val(r,k),cx.M(id))}</div></div>`).join('') + '</div>').join(''));
  };
  R.stack100 = (o, a, ms, cx) => {
    const m = cx.M(ms[0]), sh = o.sh;
    const items = o.sorted.map(r => labs(r)[0]).slice(0, 7), ci = new Map(items.map((it, i) => [it, i]));
    const legend = `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;font-size:11px;margin:6px 0 8px">${items.map((it, i) => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col(i)};margin-right:4px;vertical-align:-1px"></i>${esc(it)}</span>`).join('')}</div>`;
    const seg = (a, T) => a.filter(x => ci.has(x[0])).map(x => `<em title="${esc(x[0])} ${vu(x[1],m)} · ${pct(x[1],T)}%" style="display:flex;align-items:center;justify-content:center;width:${pct(x[1],T)}%;height:100%;background:${col(ci.get(x[0]))};font:600 10px var(--num);color:#fff;overflow:hidden">${pct(x[1],T) >= 7 ? Math.round(pct(x[1],T)) + '%' : ''}</em>`).join('');
    if (sh.cols === 1) { const T = sum(nums(o.sorted));
      return card(`${m.n} 구성 · 전체 ${vu(T,m)}`, legend + `<div class="dl"><div class="n">전체</div><div class="bar" style="height:22px;display:flex;border-radius:6px">${seg(o.sorted.map(r => [labs(r)[0], val(r,0)||0]), T)}</div><div class="v">100%</div></div>`); }
    /* 묶음별 가로 누적 (연도면 연도 순, 아니면 묶음 합계 순) */
    const gcol = o.icol === 1 ? 0 : 1, G = new Map();
    a.rows.forEach(r => { const g = labs(r)[gcol]; (G.get(g) || G.set(g, []).get(g)).push([labs(r)[o.icol], val(r,0)||0]); });
    let gs = [...G.entries()].map(([g, arr]) => ({ g, arr, T: sum(arr.map(x => x[1])) }));
    gs = sh.ycol === gcol ? gs.sort((x, y) => String(x.g).localeCompare(String(y.g))) : gs.sort((x, y) => y.T - x.T).slice(0, 12);
    return card(`${m.n} 구성 · 묶음마다 100%`, legend + gs.map(x => `<div class="dl"><div class="n" title="${esc(x.g)}" style="${isMe([x.g],cx) ? 'font-weight:700;color:var(--accent)' : ''}">${esc(x.g)}</div><div class="bar" style="height:16px;display:flex">${seg(x.arr, x.T)}</div><div class="v">${vu(x.T,m)}</div></div>`).join(''));
  };
  /* 선·산점: 보드 univ_02 · univ_01 좌표계 */
  const CH = { x0: 52, x1: 496, y0: 278, y1: 16, W: 560, H: 310 };
  const nfmt = v => v >= 1e6 ? (v/1e6).toFixed(1)+'백만' : v >= 10000 ? Math.round(v/1000)+'천' : v >= 1000 ? (v/1000).toFixed(1)+'천' : (Math.round(v*100)/100).toString();
  const gridY = (min, max, n) => { const s = []; for (let i = 0; i <= n; i++) { const v = min + (max-min)*i/n, y = CH.y0 - (CH.y0-CH.y1)*i/n; s.push(`<line x1="${CH.x0}" x2="${CH.x1}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="44" y="${y+4}" text-anchor="end" font-size="10" fill="var(--ink3)">${nfmt(v)}</text>`); } return s.join(''); };
  const svg = (inner, h) => `<svg viewBox="0 0 ${CH.W} ${CH.H}" width="100%" style="max-height:${h||330}px;display:block">${inner}</svg>`;
  R.line = (o, a, ms, cx) => {
    const m = cx.M(ms[0]), g = o.series, names = [...g.keys()];
    /* 계열이 많으면 마지막 값 기준 상위 7 (우리는 항상) */
    const keep = names.length > 7 ? names.map(n => ({ n, v: g.get(n).slice(-1)[0][1] })).sort((x,y) => y.v-x.v).slice(0,7).map(x => x.n) : names;
    if (!keep.some(n => n.includes(cx.me)) && names.some(n => n.includes(cx.me))) keep[keep.length-1] = names.find(n => n.includes(cx.me));
    const years = [...new Set(keep.flatMap(n => g.get(n).map(p => p[0])))].sort();
    const all = keep.flatMap(n => g.get(n).map(p => p[1])), max = Math.max(...all, 1), min = 0;
    const X = y => CH.x0 + (CH.x1-CH.x0) * (years.length > 1 ? years.indexOf(y)/(years.length-1) : .5), Y = v => CH.y0 - (CH.y0-CH.y1)*(v-min)/(max-min || 1);
    const paths = keep.map((n, i) => { const pts = g.get(n).filter(p => years.includes(p[0])); const me = n.includes(cx.me);
      return `<polyline fill="none" stroke="${me ? 'var(--accent)' : col(i)}" stroke-width="${me ? 3.2 : 2.3}" points="${pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}"/>` + pts.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${me ? 4 : 3}" fill="${me ? 'var(--accent)' : col(i)}"><title>${esc(n)} ${p[0]} ${vu(p[1],m)}</title></circle>`).join(''); }).join('');
    const xl = years.map(y => `<text x="${X(y)}" y="293" text-anchor="middle" font-size="10" fill="var(--ink3)">${y}</text>`).join('');
    const legend = `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;font-size:11px;margin-top:6px">${keep.map((n, i) => `<span><i style="display:inline-block;width:14px;height:3px;background:${n.includes(cx.me) ? 'var(--accent)' : col(i)};margin-right:4px;vertical-align:3px"></i>${esc(n)}</span>`).join('')}${names.length > keep.length ? `<span style="color:var(--ink3)">그 밖 ${names.length-keep.length}개 계열은 표에</span>` : ''}</div>`;
    return card(`${m.n} · ${years[0]}~${years[years.length-1]}`, svg(gridY(min, max, 5) + paths + xl) + legend);
  };
  R.scatter = (o, a, ms, cx) => {
    const m0 = cx.M(ms[0]), m1 = cx.M(ms[1]), P = o.pts, xs = P.map(p => p.x), ys = P.map(p => p.y);
    const xmax = Math.max(...xs, 1), ymax = Math.max(...ys, 1), X = v => CH.x0 + (CH.x1-CH.x0)*v/xmax, Y = v => CH.y0 - (CH.y0-CH.y1)*v/ymax;
    const sizes = ms[2] ? a.rows.map(r => val(r,2)||0) : null, smax = sizes ? Math.max(...sizes, 1) : 1;
    const byx = P.slice().sort((a,b) => b.x-a.x), byy = P.slice().sort((a,b) => b.y-a.y);
    const tag = new Set(P.length <= 12 ? P : [byx[0], byx[1], byy[0], byy[1], byx[byx.length-1]].filter(Boolean));
    const dots = P.map((p, i) => { const me = p.n.includes(cx.me), r = sizes ? 3 + 9*Math.sqrt((sizes[i]||0)/smax) : 5;
      return `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${r}" fill="${me ? 'var(--accent)' : 'var(--s-blue)'}" fill-opacity=".75"><title>${esc(p.n)} · ${m0.n} ${vu(p.x,m0)} · ${m1.n} ${vu(p.y,m1)}</title></circle>` + (me || tag.has(p) ? `<text x="${X(p.x) + (p.x > xmax*.8 ? -8 : 7)}" y="${Y(p.y)+4}" text-anchor="${p.x > xmax*.8 ? 'end' : 'start'}" font-size="10" fill="var(--ink)">${esc(p.n.slice(0,10))}</text>` : ''); }).join('');
    const avg = `<line x1="${X(o.mx)}" x2="${X(o.mx)}" y1="${CH.y1}" y2="${CH.y0}" stroke="var(--ink3)" stroke-dasharray="4 3"/><line x1="${CH.x0}" x2="${CH.x1}" y1="${Y(o.my)}" y2="${Y(o.my)}" stroke="var(--ink3)" stroke-dasharray="4 3"/>`;
    const xl = [0,.25,.5,.75,1].map(t => `<text x="${CH.x0+(CH.x1-CH.x0)*t}" y="293" text-anchor="middle" font-size="10" fill="var(--ink3)">${nfmt(xmax*t)}</text>`).join('');
    return card(`가로 ${m0.n} · 세로 ${m1.n} · 점선은 평균`, svg(gridY(0, ymax, 5) + avg + dots + xl));
  };
  R.heat = (o, a, ms, cx) => {
    const m = cx.M(ms[0]), G = o.groups || (() => { const G = new Map(); a.rows.forEach(r => { const g = labs(r)[0]; (G.get(g) || G.set(g, []).get(g)).push([labs(r)[1], val(r,0)||0]); }); return [...G.entries()].map(([g, arr]) => ({ g, a: arr.sort((x,y) => y[1]-x[1]) })); })();
    const items = [...new Map(a.rows.map(r => [labs(r)[1], 0])).keys()]; const tot = new Map(); a.rows.forEach(r => tot.set(labs(r)[1], (tot.get(labs(r)[1])||0) + (val(r,0)||0)));
    const cols = items.sort((x,y) => tot.get(y)-tot.get(x)).slice(0, 8), max = Math.max(...a.rows.map(r => val(r,0)||0), 1);
    const short = s => { const t = String(s).replace(/,.*$/, ''); return t.length > 26 ? t.slice(0, 25) + '…' : t; };
    return card(`${m.n} · 진할수록 큼 · 열은 항목 상위 ${cols.length}`, `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:11px;width:100%"><thead><tr><th style="text-align:left;padding:4px"></th>${cols.map(c => `<th style="padding:4px 3px;font-weight:600;text-align:center;max-width:76px;white-space:normal;line-height:1.2;font-size:10px;vertical-align:bottom" title="${esc(c)}">${esc(short(c))}</th>`).join('')}</tr></thead><tbody>` +
      G.slice(0, 20).map(x => { const mp = new Map(x.a); return `<tr><td style="padding:4px;white-space:nowrap;${isMe([x.g],cx) ? 'font-weight:700;color:var(--accent)' : ''}">${esc(x.g)}</td>${cols.map(c => { const v = mp.get(c)||0, al = v/max; return `<td style="padding:4px;text-align:center;background:rgba(75,99,130,${(al*.85).toFixed(2)});color:${al > .5 ? '#fff' : 'var(--ink)'}" title="${esc(x.g)} × ${esc(c)} ${vu(v,m)}">${v ? nfmt(v) : ''}</td>`; }).join('')}</tr>`; }).join('') + '</tbody></table></div>');
  };
  R.kpi = (o, a, ms, cx) => {
    const rows = o.sorted.slice(0, 8), one = a.cols.length === 0 || rows.length === 1;
    const boxes = one ? ms.map((id, k) => `<div class="kpi"><div class="lb">${esc(cx.M(id).n)}</div><div class="vl">${N(val(rows[0],k))}<small>${esc(U(cx.M(id)))}</small></div></div>`)
      : rows.map(r => `<div class="kpi" style="${isMe(r,cx) ? '--c:var(--accent)' : ''}"><div class="lb">${esc(lab(r))}</div><div class="vl">${N(val(r,0))}<small>${esc(U(cx.M(ms[0])))}</small></div>${ms.slice(1,3).map((id, k) => `<div class="dt">${esc(cx.M(id).n)} <b>${vu(val(r,k+1),cx.M(id))}</b></div>`).join('')}</div>`);
    return card(one ? lab(rows[0]) : cx.M(ms[0]).n, `<div class="kpis" style="grid-template-columns:repeat(${boxes.length <= 3 ? boxes.length : boxes.length % 3 === 0 ? 3 : 4},minmax(0,1fr)) !important">${boxes.join('')}</div>`);
  };
  R.table_rank = (o, a, ms, cx) => {
    const k = o.sortBy || 0, rows = withMe((o.sorted || desc(a.rows, k)), cx);
    const ranks = ms.map((_, j) => { const ord = desc(a.rows, j); return new Map(ord.map((r, i) => [lab(r), i+1])); });
    return card(`${cx.M(ms[k]).n} 순 · 작은 숫자는 그 열의 순위`, `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;width:100%"><thead><tr><th style="text-align:left;padding:5px 6px">#</th><th style="text-align:left;padding:5px 6px">${esc(cx.AX[a.cols[0]] || a.cols[0] || '')}</th>${ms.map(id => `<th style="text-align:right;padding:5px 6px;white-space:nowrap">${esc(cx.M(id).n)}</th>`).join('')}</tr></thead><tbody>` +
      rows.map((r, i) => `<tr style="${isMe(r,cx) ? 'background:var(--t-blue);font-weight:700' : ''}"><td style="padding:4px 6px;color:var(--ink3)">${i+1}</td><td style="padding:4px 6px;white-space:nowrap">${esc(lab(r))}</td>${ms.map((id, j) => `<td style="padding:4px 6px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${vu(val(r,j),cx.M(id))}${ms.length > 1 && val(r,j) != null ? `<span style="font-size:9px;color:var(--ink3);margin-left:3px">${ranks[j].get(lab(r))}</span>` : ''}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>');
  };
  R.plain = (o, a, ms, cx) => card((a.mcols || ms).map(c => (cx.M(c)||{}).n || c).join(' · '), `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;width:100%"><thead><tr>${a.cols.map(c => `<th style="text-align:left;padding:5px 6px">${esc(cx.AX[c]||c)}</th>`).join('')}${(a.mcols || ms).map(c => `<th style="text-align:left;padding:5px 6px">${esc((cx.M(c)||{}).n || c)}</th>`).join('')}</tr></thead><tbody>` +
    a.rows.slice(0, 40).map(r => `<tr>${labs(r).map(v => `<td style="padding:4px 6px">${esc(v)}</td>`).join('')}${r.slice(1).map((v, j) => `<td style="padding:4px 6px;${typeof v === 'number' ? 'text-align:right' : ''}">${esc(typeof v === 'number' ? vu(v, cx.M((a.mcols || ms)[j])) : (v == null ? '—' : v))}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>');

  /* 상위 N 줄. 우리 줄이 그 밖에 있으면 끝에 붙인다 */
  const withMe = (rows, cx) => { const s = rows.slice(0, TABLE_N); if (rows.length > TABLE_N) { const me = rows.slice(TABLE_N).find(r => isMe(r, cx)); if (me && !s.some(r => isMe(r, cx))) s.push(me); } return s; };
  /* ── 표 (⑤) : 위젯과 무관하게 상위 N 을 낸다 ─────────────── */
  function table(o, a, ms, cx) {
    /* 추이(계열×연도)는 피벗으로. 연도가 열, 계열이 행 */
    if (o.series && o.sh && o.sh.ycol != null && o.sh.gcol != null) {
      const g = o.series, m0 = cx.M(ms[0]), years = [...new Set([...g.values()].flatMap(s => s.map(p => p[0])))].sort();
      if (years.length <= 8) {
        const names = withMe([...g.keys()].sort((x, y) => { const lx = g.get(x).slice(-1)[0][1], ly = g.get(y).slice(-1)[0][1]; return ly - lx; }).map(n => [n]), cx).map(r => r[0]);
        const hd = `<tr><th>${esc(cx.AX[a.cols[o.sh.gcol]] || a.cols[o.sh.gcol])}</th>${years.map(y => `<th class="n">${esc(y)}</th>`).join('')}<th class="n">증감</th></tr>`;
        return `<table class="t"><thead>${hd}</thead><tbody>${names.map(n => { const mp = new Map(g.get(n)), r = rate(g.get(n));
          return `<tr class="${isMe([n],cx) ? 'me' : ''}"><td>${esc(n)}</td>${years.map(y => `<td class="n">${mp.has(y) ? vu(mp.get(y),m0) : '—'}</td>`).join('')}<td class="n">${r == null ? '—' : sgn(r) + '%'}</td></tr>`; }).join('')}</tbody></table>`;
      }
    }
    const rows = withMe(o.sorted || a.rows, cx);
    const txt = ms.map((id, j) => !!(cx.M(id).text) || (rows.length > 0 && rows.every(r => typeof r[1+j] !== 'number')));
    const hd = `<tr>${a.cols.map(c => `<th>${esc(cx.AX[c]||c)}</th>`).join('')}${ms.map((id, j) => `<th class="${txt[j] ? '' : 'n'}">${esc(cx.M(id).n)}</th>`).join('')}</tr>`;
    return `<table class="t"><thead>${hd}</thead><tbody>${rows.map(r => `<tr class="${isMe(r,cx) ? 'me' : ''}">${labs(r).map(v => `<td>${esc(v)}</td>`).join('')}${ms.map((id, j) => `<td class="${txt[j] ? '' : 'n'}">${typeof r[1+j] === 'number' ? vu(val(r,j),cx.M(id)) : esc(r[1+j] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  /* 레시피 필터를 읽는 말로: {ai:'해당', role:'주저자'} → 'AI 주저자' */
  function ctxOf(F, cx) {
    if (!F) return '';
    return Object.entries(F).map(([k, v]) => {
      if (v == null || v === '*' || k === 'period') return '';
      if (k === 'ai') return v === '해당' ? 'AI' : v === '아님' ? 'AI 아닌' : `AI ${v}`;
      if (k === 'pct') { const m = String(v).match(/^<=\s*(\d+)/); return m ? `JCR 상위 ${m[1]}%` : `JCR ${v}`; }
      if (k === 'role') return v;
      if (k === 'kind') return v;
      return `${(cx.AX && cx.AX[k]) || k} ${v}`;
    }).filter(Boolean).join(' ');
  }
  /* ── 조립 ─────────────────────────────────────────────── */
  function build(rec, a, cx) {
    const intent = rec.case || 'rank', ms = a.measures; let widget = rec.widget || 'bar_h';
    let rows = a.rows;
    /* 질문이 콕 집은 대상이 있으면 그 줄과 우리 줄만 남긴다 (둘 이상 남을 때만) */
    const F = (cx.focus || []).filter(Boolean);
    if (F.length) { const want = [...F, cx.me], hit = a.rows.filter(r => want.some(w => lab(r).includes(w))); if (hit.length >= 2) rows = hit; }
    const sh = shape({ ...a, rows }, cx); sh.a = a; sh.pick = rec.pick || null; sh.omit = rec.omit || null; sh.lead = rec.lead || null; sh.ctx = ctxOf(rec.filters, cx);
    /* 질문어: «몇 편·몇 건»이면 개수를 앞세우고, «나눠·각각·따로»면 지표마다 순위를 결론에 나란히 */
    const qs = (rec.q || []).join(' '); sh.askCount = /몇 ?(편|건|명|개|곳|쌍)/.test(qs); sh.askSplit = /나눠|각각|따로/.test(qs); sh.askGroup = /끼리|서로|비교|견주|별로/.test(qs);
    const o = (INT[intent] || INT.rank)(rows, ms, sh, cx) || {};
    if (o.rows) rows = o.rows;   /* 의도가 줄을 더 좁혔으면 (묶음 안의 구성) 그 줄로 */
    if (o.fallback) widget = o.fallback;
    /* 짝 레시피(also): 그 답의 머리말을 둘째 줄과 첫 KPI 로 끌어온다 (한 단계만) */
    if (rec.also && cx.R && !cx._deep) { const c = cx.R(rec.also);
      if (c && c.rec && c.ans) { const o2 = build(c.rec, c.ans, { ...cx, _deep: true });
        if (o2.headline) { const CONJ = { '입니다': '이고', '큽니다': '크고', '됩니다': '되고' }, h = o.headline || '', tail = (h.match(/[가-힣]+니다$/) || [''])[0];
          const stem = tail ? (CONJ[tail] || (tail.endsWith('습니다') ? tail.slice(0, -3) + '고' : null)) : null;
          if (stem) o.headline = h.slice(0, -tail.length) + stem + ', ' + o2.headline;   /* «늘었습니다» → «늘었고, …» */
          else { o.points = o.points || []; o.points.splice(1, 0, o2.headline + '.'); }
          if (o2.kpi && o2.kpi[0]) { o.kpi = o.kpi || []; o.kpi.splice(2, 0, o2.kpi[0]); } } } }
    o.intent = intent; o.sh = sh; o.sorted = o.sorted || rows;
    const miss = cx.M(ms[0]).text || (rows.length && rows.every(r => typeof r[1] !== 'number')) ? 0 : rows.filter(r => val(r, 0) == null).length;
    if (miss) o.miss = miss;
    let fig = ''; try { fig = (R[widget] || R.bar_h)(o, { ...a, rows }, ms, cx); } catch (e) { fig = ''; o.err = String(e); }
    const W = cx.W[widget] || {}, lims = [];
    if (sh.d === 'low' && intent !== 'quality') lims.push(`${cx.M(ms[0]).n}${jo(cx.M(ms[0]).n,'은')} 낮을수록 좋은 값입니다.`);
    (o.lims || []).forEach(l => lims.push(l));
    if (a.capped && a.stats) lims.push(`표는 전체 ${N(a.n)}${sh.w} 중 상위 ${rows.length}${sh.w}까지만 담고 그중 ${Math.min(rows.length, TABLE_N)}${sh.w}${isMeIn(rows, cx) ? '과 우리 줄' : ''}만 보입니다 (합계·중앙값·최소는 전체 ${N(a.n)}${sh.w}${jo(sh.w,'로')} 계산).`);
    else if (a.capped) lims.push(`전체 ${N(a.n)}${sh.w} 중 상위 ${rows.length}${sh.w}만 미리 계산해 두었고, 표는 그중 ${Math.min(rows.length, TABLE_N)}${sh.w}${isMeIn(rows, cx) ? '과 우리 줄' : ''}만 보입니다.`);
    else if (rows.length > TABLE_N && !o.series) lims.push(`표는 ${TABLE_N}줄만 보입니다 (전체 ${rows.length}줄).`);
    if (o.miss) lims.push(`${cx.M(ms[0]).n} 값이 없는 ${o.miss}곳은 순위에서 뺐습니다.`);
    if (F.length && rows !== a.rows) lims.push(`${F.join(' · ')} 기준으로 ${rows.length}줄만 남겼습니다.`);
    /* 레시피 주의 가운데 위젯 한계가 같은 문턱(«10건 미만»)을 이미 말한 문장은 뺀다 */
    const thr = c => (c.match(/\d[\d,]*(편|건|명|개|곳|쌍|%) ?미만/g) || []);
    const said = new Set(lims.flatMap(thr)), caveats = (rec.caveats || []).filter(c => !thr(c).some(t => said.has(t)));
    return { widget, wname: `${W.no || ''} ${W.name || widget}`.trim(), intent, iname: (cx.I[intent] || {}).name || intent,
      headline: o.headline || '', points: (o.points || []).filter(Boolean).slice(0, 5), kpi: (o.kpi || []).slice(0, 3),
      fig, table: table(o, { ...a, rows }, ms, cx), lims, caveats, rows, err: o.err };
  }
  return { build, shape, intents: Object.keys(INT), widgets: Object.keys(R) };
})();
if (typeof module !== 'undefined') module.exports = WIDGET;
