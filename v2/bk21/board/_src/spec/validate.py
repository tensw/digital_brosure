# -*- coding: utf-8 -*-
# 하는 일: 레시피가 만들어질 수 있는지 검사 4개를 돌리고, 막힌 것에 이유를 적는다.
import json, io, sys

M = json.load(io.open('metrics.json', encoding='utf-8'))
R = json.load(io.open('recipes.json', encoding='utf-8'))
MET = {m['id']: m for m in M['metrics']}
SLICE = M['sliceable']
AXES = M['axes']
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
        cv = []
        for a in r['axes']:
            n = AXES[a].get('note')
            if n: cv.append(f"{AXES[a]['name']}: {n}")
        for mid in r['measures']:
            c = MET.get(mid, {}).get('caveat')
            if c: cv.append(c)
        r['caveats'] = cv

json.dump(R, io.open('recipes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"\n통과 {ok} · 막힘 {blocked} / 전체 {len(R['recipes'])}")
