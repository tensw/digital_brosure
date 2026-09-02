# -*- coding: utf-8 -*-
# 하는 일: 레시피마다 집계 결과를 미리 계산해 answers.json 으로 뽑는다.
# 보드 데이터 16MB 는 깃 밖이므로, 화면이 쓰는 만큼(행 60개 이내)만 남긴다.
import json, io, os, collections, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
D    = os.path.join(HERE, '..', 'data')
def load(n): return json.load(io.open(os.path.join(D, n + '.json'), encoding='utf-8'))

T, K, U, C, N = load('bk21_tree'), load('kpi'), load('univ'), load('ucmp'), load('net')
G = load('glob')
P = load('pool')
M = json.load(io.open(os.path.join(HERE, 'metrics.json'), encoding='utf-8'))
R = json.load(io.open(os.path.join(HERE, 'recipes.json'), encoding='utf-8'))
MET = {m['id']: m for m in M['metrics']}
CAP = 60   # 화면에 낼 행 상한

# ── 논문 한 건을 한 행으로 펴 둔다. 축이 전부 붙어 있어 어느 방향으로도 자른다.
KIND = {'prof': '교수', 'jr': '신진', None: '미분류'}
sid2 = {}
for dn, d in T['depts'].items():
    for p in d.get('profs', []):
        sid2[p['sid']] = (dn, KIND.get(p.get('kind'), '미분류'), p.get('major'))
    for x in (d.get('unassigned') or []):
        sid2[x['sid']] = (dn, '학생', None)
    for p in d.get('profs', []):
        for kd in (p.get('kids') or []):
            sid2.setdefault(kd['sid'], (dn, '학생', None))
# 계열은 bk21_tree.gyo 가 아니라 kpi.depts[].gy 에 학과별로 들어 있다.
GY = {dn: d.get('gy') for dn, d in K['depts'].items()}

ROWS = []
for sid, ps in T['papers'].items():
    dn, kind, grp = sid2.get(sid, (None, '미분류', None))
    for p in ps:
        pct = p.get('pct')
        ROWS.append({
            'y': p.get('y'), 'r': p.get('r'), 'tr': p.get('tr'), 'g': p.get('g'),
            'ai': {0:'아님',1:'해당',2:'회색'}.get(p.get('ai'), '아님'),
            'pct': None if pct is None else ('≤5%' if pct<=5 else '5~10%' if pct<=10
                    else '10~25%' if pct<=25 else '25~50%' if pct<=50 else '50% 밖'),
            'j': p.get('j'), 'f': p.get('f') or None,
            'dept': dn, 'gy': GY.get(dn), 'kind': kind, 'grp': grp,
            '_c': p.get('c') or 0, '_sc': p.get('sc') or 0, '_gs': p.get('gs') or 0,
            '_if': p.get('if') or None, '_pctv': pct,
        })

def agg_paper(axes, filters, measures):
    rows = ROWS
    for k, v in (filters or {}).items():
        if v == '*': continue
        if k == 'role' and v == '주저자':
            rows = [x for x in rows if x['r'] in ('단독','제1','교신','제1+교신')]
        elif k == 'role': continue
        elif k == 'pct' and str(v).startswith('<='):
            lim = int(str(v)[2:]); rows = [x for x in rows if x['_pctv'] is not None and x['_pctv'] <= lim]
        elif k == 'period': continue
        elif k in ('gy','ai','kind','dept','tr','g'):
            rows = [x for x in rows if x.get(k) == v]
    if not axes:
        return [[measure(rows, m) for m in measures]], ['(전체)'], len(rows)
    grp = collections.defaultdict(list)
    for x in rows:
        key = tuple(x.get(a) for a in axes)
        if any(k is None for k in key): continue
        grp[key].append(x)
    out = [[list(k)] + [measure(v, m) for m in measures] for k, v in grp.items()]
    out.sort(key=lambda r: -(r[1] if isinstance(r[1], (int, float)) else 0))
    return out, axes, len(grp)

def measure(rows, mid):
    if not rows: return 0
    if mid == 'paper_count':   return len(rows)
    if mid == 'citations':     return sum(x['_c'] for x in rows)
    if mid == 'score':         return round(sum(x['_sc'] for x in rows), 1)
    if mid == 'grade_score':   return sum(x['_gs'] for x in rows)
    if mid == 'jcr_pct':
        v = [x['_pctv'] for x in rows if x['_pctv'] is not None]
        return round(statistics.median(v), 1) if v else None
    if mid == 'impact_factor':
        v = [float(x['_if']) for x in rows if x['_if'] not in (None,'')]
        return round(statistics.mean(v), 2) if v else None
    return len(rows)

PPL = []
for dn, d in T['depts'].items():
    for p in d.get('profs', []):
        PPL.append({'dept': dn, 'gy': GY.get(dn), 'kind': KIND.get(p.get('kind'), '미분류'),
                    'grp': p.get('major'), '_np': p.get('np') or 0,
                    '_nb': p.get('nb') or 0, '_na': p.get('na') or 0})
    for x in (d.get('unassigned') or []):
        PPL.append({'dept': dn, 'gy': GY.get(dn), 'kind': '학생', 'grp': None,
                    '_np': len(T['papers'].get(x['sid'], [])), '_nb': 0, '_na': 0})
    for p in d.get('profs', []):
        for kd in (p.get('kids') or []):
            PPL.append({'dept': dn, 'gy': GY.get(dn), 'kind': '학생', 'grp': None,
                        '_np': len(T['papers'].get(kd['sid'], [])), '_nb': 0, '_na': 0})

def agg_person(axes, filters, measures):
    rows = PPL
    for k, v in (filters or {}).items():
        if v in (None, '*') or k in ('period', 'role'): continue
        if k in ('kind', 'dept', 'gy'): rows = [x for x in rows if x.get(k) == v]
    grp = collections.defaultdict(list)
    for x in rows:
        key = tuple(x.get(a) for a in axes) if axes else ('(전체)',)
        if any(k is None for k in key): continue
        grp[key].append(x)
    F = {'person_papers': '_np', 'person_papers_pre': '_nb', 'person_papers_post': '_na'}
    out = []
    for k, v in grp.items():
        vals = []
        for mid in measures:
            f = F.get(mid)
            vals.append(sum(x[f] for x in v) if f else len(v))
        out.append([list(k)] + vals + [len(v)])
    out.sort(key=lambda r: -(r[1] or 0))
    return out, (axes or ['(전체)']), len(out)

def agg_field(axes, filters, measures):
    # 분야는 학과 집계(glob.deptfield)로만 있다. 논문에 붙어 있지 않다.
    want = (filters or {}).get('gy')
    acc = collections.defaultdict(int)
    for dn, fl in (G.get('deptfield') or {}).items():
        if want and GY.get(dn) != want: continue
        for e in (fl or []):
            if not (isinstance(e, list) and len(e) >= 2): continue
            key = (dn, e[0]) if axes == ['dept','f'] else (e[0],)
            acc[key] += e[1]
    out = [[list(k), v] for k, v in acc.items()]
    out.sort(key=lambda r: -r[1])
    return out, axes, len(out)

def agg_dept(axes, measures):
    out = []
    for dn, d in K['depts'].items():
        vals = []
        for mid in measures:
            f = MET[mid].get('field')
            vals.append(d.get(f) if f else None)
        if all(v is None for v in vals): continue
        out.append([[dn if 'dept' in axes else (GY.get(dn) or '미분류')]] + vals)
    if axes == ['gy']:
        acc = collections.defaultdict(list)
        for r in out: acc[r[0][0]].append(r[1:])
        out = [[[g]] + [round(statistics.mean([x[i] for x in v if x[i] is not None]), 2)
                        if any(x[i] is not None for x in v) else None
                        for i in range(len(measures))] for g, v in acc.items()]
    out.sort(key=lambda r: -(r[1] if isinstance(r[1], (int,float)) else -1))
    return out, axes, len(out)

def agg_uni(axes, measures, against):
    src = C['sum'] if against == 'BK21_8' else None
    out = []
    if 'y' in axes:
        for u in U['unis']:
            for yr in u.get('years', []):
                if not (2020 <= yr['y'] <= 2025): continue
                out.append([[u['nm'], str(yr['y'])], yr.get('w'), yr.get('c')])
        return out, ['uni','y'], len(out)
    if 'f' in axes:
        for un, fl in (C.get('fld') or {}).items():
            for e in (fl or [])[:8]:
                out.append([[un, e[0]], e[1], e[2] if len(e) > 2 else None])
        return out, ['uni','f'], len(out)
    for u in U['unis']:
        vals = []
        for mid in measures:
            f = MET[mid].get('field')
            if mid == 'uni_fwci':
                vals.append((src or {}).get(u['nm'], {}).get('fw') if src else (C['sum'].get(u['nm']) or {}).get('fw'))
            elif mid == 'uni_bk_prof':
                vals.append(((C.get('roster') or {}).get(u['nm']) or {}).get('prof'))
            else:
                vals.append(u.get(f))
        out.append([[u['nm']]] + vals)
    out.sort(key=lambda r: -(r[1] or 0))
    return out, ['uni'], len(out)

def agg_rel(axes, measures):
    if axes == ['dept']:
        acc = collections.Counter()
        for e in N['top']:
            acc[e['a']] += e['n']; acc[e['b']] += e['n']
        out = [[[k], v] for k, v in acc.most_common()]
        return out, ['dept'], len(out)
    if axes == ['y']:
        acc = collections.Counter()
        for e in N['trel']: acc[str(e.get('y0'))] += 1
        out = sorted([[[k], v] for k, v in acc.items()], key=lambda r: r[0][0])
        return out, ['y'], len(out)
    if axes == ['f']:
        acc = collections.Counter()
        for dn, fl in (G.get('deptfield') or {}).items():
            for e in (fl or []):
                if isinstance(e, list) and len(e) >= 2: acc[e[0]] += e[1]
        out = [[[k], v] for k, v in acc.most_common()]
        return out, ['f'], len(out)
    if axes == ['kind']:
        return [[[k], v] for k, v in (N.get('kind') or {}).items()], ['kind'], len(N.get('kind') or {})
    return [], axes, 0

def agg_qa(axes, measures):
    out = []
    for dn, d in K['depts'].items():
        out.append([[dn], d.get('Ur'), d.get('Q02'), d.get('Q04')])
    out.sort(key=lambda r: -(r[1] or 0))
    return out, ['dept'], len(out)

def agg_new(r):
    """스킨이 요구하는 새 집계들. 원장 위치가 제각각이라 레시피별로 갈라 쓴다."""
    rid, ms = r['id'], r['measures']
    if rid == 'n01_area':
        gy = T['gyo']
        rows = [[[g], round(v['RQ']['RQ'],1), round(v['RQ']['IQ'],1), round(v['RQ']['SQ'],1)]
                for g, v in gy.items()]
        return rows, ['gy'], len(rows)
    if rid in ('n02_signal','n03_twotrack'):
        rows=[]
        for dn, d in K['depts'].items():
            if d.get('A01') is None and d.get('B01pc') is None: continue
            rows.append([[dn], d.get('A01'), d.get('B01pc'), d.get('gy')])
        rows.sort(key=lambda x: -(x[1] or 0))
        return rows, ['dept'], len(rows)
    if rid == 'n04_relscope':
        return [[[k], v] for k, v in (N.get('scope') or {}).items()], ['scope'], 2
    if rid in ('n05_partnerdist','n07_netsize','n08_extstruct','n09_potential','n06_partners'):
        rows=[]
        for e in (G.get('dept') or []):
            if isinstance(e, list) and len(e) >= 3: rows.append([[e[0]], e[1], e[2]])
        rows.sort(key=lambda x: -(x[1] or 0))
        return rows, ['dept'], len(rows)
    if rid == 'n10_intl_dom':
        rows=[[[u['nm']], u.get('works'), u.get('kci')] for u in U['unis']]
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni'], len(rows)
    if rid == 'n11_bk_vs':
        b = U['meta']['skku_bk']
        return [[['BK21 참여학과'], b['bk']], [['그 외 학과'], b['nonbk']]], ['구분'], 2
    if rid == 'n13_measurable':
        rows=[[[m['axis']], m.get('oa'), m.get('kci'), m.get('rims')] for m in U['meta'].get('matrix',[])]
        return rows, ['축'], len(rows)
    if rid in ('n14_asia','n15_world'):
        src = U['asia'] if rid == 'n14_asia' else U['world']
        rows=[[[x.get('nm') or x.get('en')], x.get('works'), x.get('cites'), x.get('h')] for x in src]
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni'], len(rows)
    if rid == 'n16_pool':
        rows=[[[x.get('n')+' '+(x.get('t') or '')], len(x.get('items') or [])] for x in P['pool']]
        return rows, ['층'], len(rows)
    if rid == 'n17_bk_year':
        rows=[]
        for un, yy in (C.get('yr') or {}).items():
            if isinstance(yy, dict):
                for y, v in yy.items():
                    if 2020 <= int(y) <= 2025:
                        rows.append([[un, y], v.get('n') if isinstance(v, dict) else v])
            elif isinstance(yy, list):
                for e in yy:
                    if isinstance(e, list) and len(e) >= 2 and 2020 <= int(e[0]) <= 2025:
                        rows.append([[un, str(e[0])], e[1]])
        return rows, ['uni','y'], len(rows)
    if rid == 'n18_quality_rank':
        rows=[[[u], v.get('fw'), v.get('fw2'), v.get('c100'), v.get('oa'), v.get('corr'), v.get('first')]
              for u, v in C['sum'].items()]
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni'], len(rows)
    if rid == 'n19_uni_table':
        rows=[[[u['nm']], u.get('works'), u.get('cites'), u.get('h'), u.get('c2')] for u in U['unis']]
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni'], len(rows)
    if rid == 'n12_uni_topic':
        rows=[]
        for un, fl in (C.get('fld') or {}).items():
            for e in (fl or [])[:6]:
                rows.append([[un, e[0]], e[1]])
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni','f'], len(rows)
    if rid == 'n20_netmap':
        rows=[[[e['a'] + ' ↔ ' + e['b']], e['n']] for e in N['top']]
        rows.sort(key=lambda x: -x[1]); return rows, ['dept'], len(rows)
    return None

ANS, skipped = {}, []
for r in R['recipes']:
    if r['blocked'] or r.get('needs'): continue
    try:
        nuc, ax, ms = r['nucleus'], r['axes'], r['measures']
        got = agg_new(r)
        if got:
            rows, cols, n = got
        elif 'dept_field_papers' in ms:
            rows, cols, n = agg_field(ax, r['filters'], ms)
        elif nuc == 'paper':      rows, cols, n = agg_paper(ax, r['filters'], ms)
        elif nuc == 'person':     rows, cols, n = agg_person(ax, r['filters'], ms)
        elif nuc == 'dept':       rows, cols, n = agg_dept(ax if ax else ['dept'], ms)
        elif nuc == 'university': rows, cols, n = agg_uni(ax, ms, r['against'])
        elif nuc == 'relation':   rows, cols, n = agg_rel(ax, ms)
        elif nuc == 'quality':    rows, cols, n = agg_qa(ax, ms)
        else: rows, cols, n = [], ax, 0
        if not rows: skipped.append((r['id'], '집계 결과 없음')); continue
        ANS[r['id']] = {'cols': cols, 'measures': ms, 'n': n,
                        'rows': rows[:CAP], 'capped': n > CAP}
    except Exception as e:
        skipped.append((r['id'], type(e).__name__ + ': ' + str(e)[:60]))

json.dump({'built': R['built'], 'cap': CAP, 'answers': ANS},
          io.open(os.path.join(HERE, 'answers.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
sz = os.path.getsize(os.path.join(HERE, 'answers.json'))
print(f"계산 {len(ANS)} · 못 낸 것 {len(skipped)} · {sz/1024:.0f}KB")
for i, w in skipped: print('   -', i, w)
