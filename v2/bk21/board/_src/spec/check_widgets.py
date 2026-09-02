#!/usr/bin/env python3
"""데이터 모양 → 위젯 판단 규칙(설계 §2)을 69개 레시피에 적용한다.
   결과를 레시피의 widget 필드와 견주고, 의도(case)가 그 위젯을 허용하는지도 본다."""
import json, re, sys, os
H = os.path.dirname(os.path.abspath(__file__))
L = lambda f: json.load(open(f'{H}/{f}', encoding='utf-8'))
WJ = L('widgets.json'); W = WJ['widgets']; I = WJ['intents']
R = L('recipes.json'); A = L('answers.json')['answers']; M = {m['id']: {'u': m.get('unit'), 'd': m.get('direction','high')} for m in L('metrics.json')['metrics']}
recs = R['recipes'] if isinstance(R, dict) else R
ME = '성균관대'; YEAR = re.compile(r'^(19|20)\d\d$'); COUNT_U = {'편', '건', '명', '개', '곳', '회'}
lab = lambda r: r[0] if isinstance(r[0], list) else [r[0]]

def shape(a):
    rows, cols, ms = a['rows'], len(a['cols']), a['measures']
    ycol = next((i for i in range(cols) if rows and all(YEAR.match(str(lab(r)[i])) for r in rows)), None)
    years = len({lab(r)[ycol] for r in rows}) if ycol is not None else 0
    other = [i for i in range(cols) if i != ycol]
    series = len({lab(r)[other[0]] for r in rows}) if other else 0
    items2 = len({lab(r)[1] for r in rows}) if cols == 2 else 0
    m0 = M.get(ms[0]) or {}
    return dict(cols=cols, nm=len(ms), rows=len(rows), years=years, ycol=ycol, series=series, items2=items2,
                numeric=bool(rows) and all(isinstance(r[1], (int, float)) or r[1] is None for r in rows) and any(isinstance(r[1], (int, float)) for r in rows),
                me=any(ME in ' '.join(map(str, lab(r))) for r in rows),
                count=(m0.get('u') in COUNT_U), d=m0.get('d', 'high'))

def decide(s, intent):
    """설계 §2 판단 규칙. 위에서부터 첫 번째 맞는 것."""
    if not s['numeric']: return 'plain', '0 문자 값'
    if s['years']:
        if s['cols'] == 1: return ('line', '1a 연도만·3개 이상') if s['years'] >= 3 else ('bar_v', '1b 연도 2개 이하')
        if intent in ('share', 'profile') and s['count'] and s['series'] <= 7: return 'stack100', '1c 연도별 구성'
        if s['series'] <= 7 or intent in ('trend', 'grow'): return 'line', '1d 다계열 선' if s['series'] <= 7 else '1d 상위 7 계열만'
        return 'heat', '1e 계열 8 이상'
    if s['cols'] == 2:
        if s['count'] and s['items2'] <= 7 and intent not in ('profile', 'edge'): return 'stack100', '2a 묶음별 구성'
        return 'heat', '2b 2축 히트맵'
    if s['cols'] == 1:
        if s['nm'] >= 2 and s['rows'] >= 5 and intent == 'link': return 'scatter', '3a 관계 질문'
        if 2 <= s['nm'] <= 4 and s['rows'] <= 8 and intent in ('low', 'rank'): return 'bar_group', '3b 값 2~4 · 행 8 이하'
        if intent == 'conc': return ('pareto', '3c 쏠림·개수') if s['count'] else ('bar_h', '3c 쏠림·비율')
        if intent == 'share' and s['count'] and s['rows'] <= 12: return 'stack100', '3d 한 줄 구성'
        if s['nm'] >= 2: return 'table_rank', '3b 값 여러 개'
        if intent == 'lookup' and s['rows'] <= 8: return 'kpi', '3e 값 나열'
        if s['rows'] <= 3: return 'kpi', '3e 행 3 이하'
        return 'bar_h', '3f 행 4 이상'
    return 'kpi', '4 축 없음'

out = []; mism = 0; bad_i = 0
for r in recs:
    if r.get('blocked') or r.get('needs'): continue
    a = A.get(r['id'])
    if not a: out.append((r['id'], r.get('case'), '?', '집계표 없음', r.get('widget'), False)); continue
    s = shape(a); it = r.get('case') or '?'
    w, rule = decide(s, it)
    ok_i = w in I.get(it, {}).get('widgets', [])
    human = r.get('widget')
    if human and human != w: mism += 1
    if not ok_i: bad_i += 1
    out.append((r['id'], it, w, rule, human, ok_i, s))
if '--write' in sys.argv:
    for r in recs:
        for o in out:
            if o[0] == r['id'] and o[2] != '?': r['widget'] = o[2]
    json.dump(R, open(f'{H}/recipes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('recipes.json 에 widget 기록')
for rid, it, w, rule, human, ok_i, *s in out:
    flag = '✓' if ok_i else '✗'
    sh = s[0] if s else {}
    print(f"{flag} {rid:18} {str(it):8} → {str(w):10} {str(rule):14} {'' if ok_i else '의도가 이 위젯을 허용하지 않음'}"
          f"  [{sh.get('cols')}축 {sh.get('nm')}값 {sh.get('rows')}행 y{sh.get('years')} s{sh.get('series')} me{int(sh.get('me',0))} {'개수' if sh.get('count') else '비율·점수'}]")
print(f"\n의도↔위젯 어긋남 {bad_i} / {len(out)}   사람 배정과 다름 {mism}")
