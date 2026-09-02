# -*- coding: utf-8 -*-
# 하는 일: 레시피가 만들어질 수 있는지 검사 4개를 돌리고, 막힌 것에 이유를 적는다.
import json, re, io, sys

M = json.load(io.open('metrics.json', encoding='utf-8'))
R = json.load(io.open('recipes.json', encoding='utf-8'))
MET = {m['id']: m for m in M['metrics']}
SLICE = M['sliceable']
AXES = M['axes']
ORG_AXES = {'dept', 'gy', 'uni', 'grp', 'pair'}   # 행이 조직인 축
ROLE_LEAD = ['제1', '교신', '제1+교신', '단독']      # 주저자 묶음 (공저만 뺀 역할)
GRAIN_KO = {'paper':'논문','person':'사람','dept':'학과','relation':'관계',
            'university':'대학','quality':'품질'}
BAN = [
 ({'gy'}, None, '계열이 다른 학과를 한 줄로 세우지 않는다'),
]

def check(r):
    prob = []
    ax = r['axes']

    # 검사1 — 축은 셋까지
    if len(ax) > 3:
        prob.append(('축 초과', f"축 {len(ax)}개. 표로만 내고 결론 금지"))

    # 검사2 — 값의 저장 층이 축을 감당하는가
    for mid in r['measures']:
        m = MET.get(mid)
        if not m:
            prob.append(('없는 지표', mid)); continue
        allowed = SLICE.get(m['grain'], [])
        bad = [a for a in ax if a not in allowed]
        if bad:
            prob.append(('층 불일치',
              f"{m['name']}({mid})은 {GRAIN_KO[m['grain']]} 단위로만 있다. "
              f"{'·'.join(AXES[b]['name'] for b in bad)}(으)로 자를 수 없다"))

    # 검사3 — 없는 축
    for a in ax:
        if a not in AXES:
            prob.append(('없는 축', a))

    # 검사4 — 핵과 값의 핵이 맞는가
    for mid in r['measures']:
        m = MET.get(mid)
        if not m: continue
        if m['grain'] == 'university' and r['nucleus'] != 'university':
            prob.append(('핵 불일치', f"{m['name']}은 대학 핵에서만 쓴다"))
        if m['grain'] == 'relation' and r['nucleus'] != 'relation':
            prob.append(('핵 불일치', f"{m['name']}은 관계 핵에서만 쓴다"))
    return prob

ok = blocked = 0
for r in R['recipes']:
    p = check(r)
    if p:
        blocked += 1
        r['blocked'] = ' / '.join(f"{k}: {v}" for k, v in p)
        if len(r['axes']) > 3:
            r['chart'] = 'table'
        print(f"막힘  {r['id']:16} {r['q'][0][:34]:36} {r['blocked'][:96]}")
    else:
        ok += 1
        r['blocked'] = None
        # caveat 자동 주입
        # 몫·집중·상관·추세처럼 절대량을 견주지 않는 답에는 «규모를 따라간다» 류(caveat_abs) 주의를 붙이지 않는다
        rel_case = r.get('case') in ('share', 'conc', 'profile', 'link', 'quality', 'trend', 'grow')
        cv = [r['note']] if r.get('note') else []
        for a in r['axes']:
            n = AXES[a].get('note')
            if n: cv.append(f"{AXES[a]['name']}: {n}")
        # «규모를 따라간다»(caveat_abs)는 행이 조직(학과·계열·대학·그룹)일 때만 뜻이 있다. 저널·분야·연도 행에는 붙이지 않는다
        org_rows = bool(r['axes']) and r['axes'][0] in ORG_AXES
        for mid in r['measures']:
            m = MET.get(mid, {})
            if m.get('caveat_abs') and (rel_case or not org_rows): continue
            # 연도 비교에 안 쓰는 지표(yearcmp:false)는 추세 위젯이 한계란에 직접 적는다. 주의란에 되풀이하지 않는다
            if m.get('yearcmp') is False and r.get('case') in ('trend', 'grow'): continue
            c = m.get('caveat')
            if c: cv.append(c)
        seen = set()
        # 같은 문장, 또는 같은 주어(«사람 이름은 …»)로 시작하는 문장은 앞의 것 하나만 (note가 먼저)
        subj = lambda c: (re.match(r'^(.{1,10}?)(은|는|이|가|도)\s', c) or [None, c])[1]
        cv = [c for c in cv if not (subj(c) in seen or seen.add(subj(c)))]
        # 문장 단위 중복: 서술어(끝 두 어절)가 같은 문장은 앞의 것 하나만 («학과·대학·분야 단위 집계로만 있다» 뒤의 «분야는 학과 집계로만 있다»)
        pred, out = set(), []
        for c in cv:
            mm = re.match(r'^([^:]{1,12}):\s*(.*)$', c)
            lab, body = (mm.group(1), mm.group(2)) if mm else ('', c)
            keep = []
            for st in re.split(r'\.\s+', body):
                k = ' '.join(st.rstrip('.').split()[-2:])
                # 같은 뜻의 서술어는 한 키로 (집계 단위가 고정돼 다른 축으로 못 자른다)
                if re.search(r'(집계로만|단위로만) 있다$|자를 수 없다$|겹칠 수 없다$', st.rstrip('.')): k = '단위고정'
                if k in pred: continue
                pred.add(k); keep.append(st.rstrip('.'))
            if keep: out.append((lab + ': ' if lab else '') + '. '.join(keep))
        r['caveats'] = out
        # 역할 축 질문이 «주저자·주도·이름만»을 물으면 주저자 묶음(제1·교신·제1+교신·단독)의 몫이 결론 (레시피에 pick이 없을 때만)
        if 'r' in r['axes'] and not r.get('pick') and r.get('case') in ('share', 'grow') and any(re.search('주저자|주도|이름만', q) for q in r['q']):
            r['pick'] = {'i': ROLE_LEAD, 'name': '주저자'}

json.dump(R, io.open('recipes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"\n통과 {ok} · 막힘 {blocked} / 전체 {len(R['recipes'])}")
