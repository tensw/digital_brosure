import re
# -*- coding: utf-8 -*-
# 하는 일: 레시피마다 집계 결과를 미리 계산해 answers.json 으로 뽑는다.
# 보드 데이터 16MB 는 깃 밖이므로, 화면이 쓰는 만큼(행 60개 이내)만 남긴다.
import json, io, os, collections, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
D    = os.path.join(HERE, '..', 'data')
def clean(v):
    """라벨 앞의 '· ' 같은 꾸밈 글자를 뗀다"""
    v = re.sub(r'^[\s·•\-]+', '', str(v)).strip() if v else None
    return v or None

def load(n): return json.load(io.open(os.path.join(D, n + '.json'), encoding='utf-8'))

T, K, U, C, N = load('bk21_tree'), load('kpi'), load('univ'), load('ucmp'), load('net')
G = load('glob')
P = load('pool')
M = json.load(io.open(os.path.join(HERE, 'metrics.json'), encoding='utf-8'))
R = json.load(io.open(os.path.join(HERE, 'recipes.json'), encoding='utf-8'))
MET = {m['id']: m for m in M['metrics']}
CAP = 60   # 화면에 낼 행 상한 (1축)
CAP2 = 200 # 2축(학과×역할 같은 구성표)은 잘리면 몫이 틀리므로 여기까지는 통째로 둔다
def cap_for(cols): return CAP2 if len(cols) >= 2 else CAP

# ── 논문 한 건을 한 행으로 펴 둔다. 축이 전부 붙어 있어 어느 방향으로도 자른다.
KIND = {'prof': '교수', 'jr': '신진', None: '미분류'}
sid2 = {}
for dn, d in T['depts'].items():
    for p in d.get('profs', []):
        sid2[p['sid']] = (dn, KIND.get(p.get('kind'), '미분류'), clean(p.get('major')))
    for x in (d.get('unassigned') or []):
        sid2[x['sid']] = (dn, '학생', None)
    for p in d.get('profs', []):
        for kd in (p.get('kids') or []):
            sid2.setdefault(kd['sid'], (dn, '학생', None))
# 계열은 bk21_tree.gyo 가 아니라 kpi.depts[].gy 에 학과별로 들어 있다.
GY = {dn: d.get('gy') for dn, d in K['depts'].items()}

JN = {}   # 표기만 다른 같은 저널(대소문자·&/and·구두점)을 한 이름으로. 먼저 본 표기를 대표로 쓴다
def jnorm(j):
    if not j: return j
    k = re.sub(r'[\W_]+', ' ', str(j).lower().replace('&', ' and ')).strip()   # 한글 등 비ASCII 글자도 남긴다
    return JN.setdefault(k, str(j).strip()) if k else str(j).strip()
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
            'j': jnorm(p.get('j')), 'f': p.get('f') or None,
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
    if axes == ['dept']:
        # 조건에 맞는 논문이 없는 학과도 0으로 둔다. 빼 버리면 «N곳 중»이 실제 학과 수와 어긋난다
        for dn in K['depts']:
            if (dn,) not in grp: out.append([[dn]] + [0 for _ in measures])
    out.sort(key=lambda r: -(r[1] if isinstance(r[1], (int, float)) else 0))
    return out, axes, len(out)

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
                    'grp': clean(p.get('major')), '_np': p.get('np') or 0,
                    '_nb': p.get('nb') or 0, '_na': p.get('na') or 0})
    for x in (d.get('unassigned') or []):
        PPL.append({'dept': dn, 'gy': GY.get(dn), 'kind': '학생', 'grp': None,
                    '_np': len(T['papers'].get(x['sid'], [])), '_nb': 0, '_na': 0})
    for p in d.get('profs', []):
        for kd in (p.get('kids') or []):
            PPL.append({'dept': dn, 'gy': GY.get(dn), 'kind': '학생', 'grp': None,
                        '_np': len(T['papers'].get(kd['sid'], [])), '_nb': 0, '_na': 0})

# 규모(분모) 값의 출처. metrics.size 가 가리키는 지표 id → 라벨을 받아 값을 준다
_DEPT_N = collections.Counter(x['dept'] for x in PPL)
SIZE_SRC = {
    'gy_prof':  lambda g: (T['gyo'].get(g) or {}).get('prof'),
    'person_n': lambda dn: _DEPT_N.get(dn),
}

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
    return out, (axes or ['(전체)']), len(out), list(measures) + ['person_n']

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
        want = [m for m in measures if m in ('uni_works', 'uni_cites')] or ['uni_works']
        for u in U['unis']:
            for yr in u.get('years', []):
                if not (2020 <= yr['y'] <= 2025): continue
                out.append([[u['nm'], str(yr['y'])]] + [yr.get({'uni_works':'w','uni_cites':'c'}.get(m, '_')) for m in want])
        return out, ['uni','y'], len(out), want
    if 'f' in axes:
        for un, fl in (C.get('fld') or {}).items():
            for e in (fl or [])[:8]:
                out.append([[un, e[0]], e[1], e[2] if len(e) > 2 else None])
        return out, ['uni','f'], len(out), ['uni_field_papers', 'uni_fwci']
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

def agg_rel(axes, measures, filters=None):
    # glob.dept 열: [학과, 참여자, 관계망보유, 연결선, 교외연결선, 교내연결선, 공저자수, 논문]
    GD = {e[0]: e for e in (G.get('dept') or []) if isinstance(e, list) and len(e) >= 7}
    def dur(dn):
        rel = (N.get('rel') or {}).get(dn) or []
        v = [(e['y1'] - e['y0'] + 1) for e in rel if e.get('y1') is not None and e.get('y0') is not None]
        return round(statistics.mean(v), 1) if v else None
    def relpap(dn):
        rel = (N.get('rel') or {}).get(dn) or []
        return sum(e.get('n') or 0 for e in rel) or None
    if (filters or {}).get('scope') and axes != ['dept']:
        return [], axes, 0   # 교외·교내 구분은 학과 행(glob.dept)에만 있다. 다른 축으로는 답을 만들지 않는다
    F = {'partner_count': lambda dn: GD.get(dn, [None]*7)[6],
         'ext_partner':   lambda dn: GD.get(dn, [None]*7)[4],
         'ext_ratio':     lambda dn: (round(GD[dn][4] / GD[dn][3] * 100, 1) if dn in GD and GD[dn][3] else None),
         'coauth_papers': relpap, 'duration': dur}
    if axes == ['dept', 'sc']:
        # 학과마다 교외(학교 밖 사람)·교내(학교 안 사람) 관계 수. 관계는 참여자 쪽에서 센다
        out = []
        for dn in GD:
            out.append([[dn, '교외'], GD[dn][4]]); out.append([[dn, '교내'], GD[dn][5]])
        return out, ['dept', 'sc'], len(out), ['rel_count']
    if axes == ['dept']:
        out = []
        for dn in GD:
            vals = [F[m](dn) if m in F else None for m in measures]
            if all(v is None for v in vals): continue
            out.append([[dn]] + vals)
        out.sort(key=lambda r: -(r[1] or 0))
        return out, ['dept'], len(out)
    if axes == ['y']:
        # 교외 관계가 시작된 해 (glob.ext.year)
        out = [[[str(y)], n] for y, n in (G.get('ext') or {}).get('year', []) if 2020 <= int(y) <= 2025]
        out.sort(key=lambda r: r[0][0])
        return out, ['y'], len(out), ['ext_new']
    if axes == ['f']:
        # glob.fields 열: [분야, 논문, 사람, 학과 수]
        out = [[[e[0]], e[2]] for e in (G.get('fields') or []) if isinstance(e, list) and len(e) >= 3]
        out.sort(key=lambda r: -(r[1] or 0))
        return out, ['f'], len(out), ['field_people']
    if axes == ['kind']:
        # net.kind 는 사람 구분별 공저쌍 수(쌍)다. 편수가 아니다
        return [[[k], v] for k, v in (N.get('kind') or {}).items()], ['kind'], len(N.get('kind') or {}), ['rel_kind']
    if axes == ['dur']:
        # glob.ext.dur: 교외 관계를 지속 기간 구간으로 나눈 수
        out = [[[k], v] for k, v in (G.get('ext') or {}).get('dur', [])]
        return out, ['dur'], len(out), ['ext_rel']
    return [], axes, 0

def agg_qa(axes, measures):
    F = {'qa_coverage': 'Q04', 'qa_undetermined': 'Ur', 'qa_review': 'Q02'}
    out = []
    for dn, d in K['depts'].items():
        out.append([[dn]] + [d.get(F[m]) if m in F else None for m in measures])
    if not axes:
        vals = []
        for i in range(len(measures)):
            v = [r[1 + i] for r in out if r[1 + i] is not None]
            vals.append(round(statistics.mean(v), 1) if v else None)
        return [[['전체']] + vals], ['(전체)'], len(out)
    k = next((i for i, m in enumerate(measures) if MET[m].get('direction') == 'low'), 0)
    out.sort(key=lambda r: -(r[1 + k] or 0))
    return out, ['dept'], len(out)

def agg_new(r):
    """스킨이 요구하는 새 집계들. 원장 위치가 제각각이라 레시피별로 갈라 쓴다."""
    rid, ms = r['id'], r['measures']
    if rid in ('gnb_exec','e06_gy_score'):
        rows=[]
        for g, v in T['gyo'].items():
            rq=v['RQ']
            rows.append([[g], round(v.get('S',0),1), round(v.get('Savg',0),1),
                         round(rq.get('RQ',0),1), round(rq.get('IQ',0),1), round(rq.get('SQ',0),1),
                         v.get('papers'), v.get('prof'), v.get('nstu'), v.get('undet')])
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['gy'], len(rows)
    if rid in ('gnb_sheet','e17_uni_rank','n19_uni_table'):
        rows=[]
        for u in U['unis']:
            rows.append([[u['nm']], u.get('works'), u.get('cites'), u.get('h'), u.get('i10'),
                         u.get('c2'), u.get('authors'), u.get('kci'),
                         (C['sum'].get(u['nm']) or {}).get('fw')])
        rows.sort(key=lambda x: -(x[1] or 0))
        return rows, ['uni'], len(rows), ['uni_works','uni_cites','uni_h','uni_i10','uni_c2','uni_authors','uni_kci','uni_fwci']
    if rid in ('n14_asia','n15_world'):
        src = U['asia'] if rid == 'n14_asia' else U['world']
        rows=[[[x.get('nm') or x.get('en')], x.get('works'), x.get('cites'), x.get('h'),
               x.get('i10'), x.get('c2')] for x in src]
        if not any(r[0][0] == '성균관대' for r in rows):
            me = next((u for u in U['unis'] if u['nm'] == '성균관대'), None)
            if me: rows.append([['성균관대'], me.get('works'), me.get('cites'), me.get('h'), me.get('i10'), me.get('c2')])
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni'], len(rows)
    if rid == 'n01_area':
        gy = T['gyo']
        rows = [[[g], round(v['RQ']['RQ'],1), round(v['RQ']['IQ'],1), round(v['RQ']['SQ'],1)]
                for g, v in gy.items()]
        return rows, ['gy'], len(rows)
    if rid == 'n09_potential':
        rows=[[[f"{a}({ad}) ↔ {b}({bd})"], round(sim*100, 1)] for a, ad, b, bd, sim, sh, tp in (G.get('reco') or {}).get('top', [])]
        return rows, ['ppair'], (G.get('reco') or {}).get('n') or len(rows)
    if rid == 'n10_intl_dom':
        rows=[[[u['nm']], u.get('works'), u.get('kci')] for u in U['unis']]
        rows.sort(key=lambda x: -(x[1] or 0)); return rows, ['uni'], len(rows)
    if rid == 'n11_bk_vs':
        rows = [[[x['k']], x.get('papers'), x.get('ppl'), x.get('fwci')] for x in U['meta']['bk3']]
        return rows, ['구분'], len(rows), ['bk_papers', 'bk_people', 'bk_fwci']
    if rid == 'n13_measurable':
        rows=[[[m['axis']], m.get('oa'), m.get('kci'), m.get('rims')] for m in U['meta'].get('matrix',[])]
        return rows, ['축'], len(rows)
    if rid == 'n16_pool':
        def num(v):
            try: return int(str(v).replace(',', ''))
            except Exception: return None
        rows=[[[x.get('n')+' '+(x.get('t') or '')], (x.get('main') or {}).get('k'), num((x.get('main') or {}).get('v'))] for x in P['pool']]
        return rows, ['층'], len(rows), ['pool_what', 'qa_layer']
    if rid in ('n17_bk_year', 'gnb_ucmp'):
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
        return rows, ['uni','y'], len(rows), ['ucmp_works']
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
    if rid in ('n20_netmap', 'gnb_net', 'e21_net_dept', 'n06_partners'):   # 학과 쌍(net.top 상위 쌍)
        rows=[[[e['a'] + ' ↔ ' + e['b']], e['n']] for e in N['top']]
        rows.sort(key=lambda x: -x[1]); return rows, ['pair'], len(rows)
    return None

ANS, skipped = {}, []
for r in R['recipes']:
    if r['blocked'] or r.get('needs'): continue
    try:
        nuc, ax, ms = r['nucleus'], r['axes'], r['measures']
        got = agg_new(r)
        if got:
            res = got
        elif 'dept_field_papers' in ms:
            res = agg_field(ax, r['filters'], ms)
        elif nuc == 'paper':      res = agg_paper(ax, r['filters'], ms)
        elif nuc == 'person':     res = agg_person(ax, r['filters'], ms)
        elif nuc == 'dept':       res = agg_dept(ax if ax else ['dept'], ms)
        elif nuc == 'university': res = agg_uni(ax, ms, r['against'])
        elif nuc == 'relation':   res = agg_rel(ax, ms, r['filters'])
        elif nuc == 'quality':    res = agg_qa(ax, ms)
        else: res = ([], ax, 0)
        rows, cols, n = res[0], res[1], res[2]
        if not rows: skipped.append((r['id'], '집계 결과 없음')); continue
        # 집계가 값 열을 더 붙였으면 (사람 수·피인용·FWCI) 그 이름을 함께 선언한다. 이름 없는 값 열은 자른다
        width = max(len(x) - 1 for x in rows)
        if len(res) > 3: ms = list(res[3])   # 집계가 낸 값 열 순서 그대로의 이름표
        if len(ms) > width: ms = ms[:width]
        if width > len(ms):
            rows = [x[:1 + len(ms)] for x in rows]
            skipped.append((r['id'], f'이름 없는 값 열 {width - len(ms)}개 잘라냄'))
        # 첫 값이 규모를 따라가는 지표(size)면 그 분모 열을 옆에 붙인다. 위젯이 1인당을 같이 낸다
        sz = (MET.get(ms[0], {}).get('size') or {}) if ms else {}
        sid = sz.get(cols[0] if cols else '*') or sz.get('*')
        if sid and sid not in ms and len(cols) == 1 and sid in SIZE_SRC and not (r['filters'] or {}).get('kind'):
            vals = [SIZE_SRC[sid](x[0][0]) for x in rows]
            if all(v is not None for v in vals):
                rows = [x + [v] for x, v in zip(rows, vals)]; ms = ms + [sid]
        cap = cap_for(cols)
        keep = rows[:cap]
        # 상한 밖에 우리 줄이 있으면 마지막 줄 대신 남긴다 (자리 질문은 우리 줄이 있어야 답이 된다)
        if n > cap and not any(x[0][0] == '성균관대' for x in keep):
            me = next((x for x in rows[cap:] if x[0][0] == '성균관대'), None)
            if me: keep = keep[:-1] + [me]
        ANS[r['id']] = {'cols': cols, 'measures': ms, 'n': n,
                        'rows': keep, 'capped': n > cap}
        # 상한에 걸리면 전체 기준 합계·중앙값·꼴찌를 같이 둔다 (표 안 60줄로 점유율을 내면 부풀려진다)
        if n > cap and len(rows) == n:   # 전 행을 손에 쥔 경우만. 추천 상위 N처럼 일부만 온 목록은 통계를 내지 않는다
            vs = sorted([x for x in rows if isinstance(x[1], (int, float))], key=lambda x: -x[1])
            if vs:
                nums = [x[1] for x in vs]
                nz = [x for x in vs if x[1] > 0] or vs
                ANS[r['id']]['stats'] = {'total': sum(nums), 'median': statistics.median(nums),
                                         'bottom': [nz[-1][0], nz[-1][1]], 'zeros': len(vs) - len(nz),
                                         'zero_names': [(' · '.join(x[0]) if isinstance(x[0], list) else x[0]) for x in vs if not x[1] > 0][:3]}
        # 상한에 걸린 목록은 우리 줄의 진짜 순위(지표마다)를 같이 둔다
        if n > cap and len(cols) == 1 and any(x[0][0] == '성균관대' for x in rows):
            mr = []
            for i in range(len(ms)):
                ordered = [x for x in rows if isinstance(x[1 + i], (int, float))]
                mv = next((x[1 + i] for x in ordered if x[0][0] == '성균관대'), None)
                # 같은 값은 같은 등수(1224식). [등수, 전체, 같은 값인 다른 곳 수]
                mr.append(None if mv is None else [sum(1 for x in ordered if x[1 + i] > mv) + 1, len(ordered),
                                                   sum(1 for x in ordered if x[1 + i] == mv) - 1])
            ANS[r['id']]['me_rank'] = mr
    except Exception as e:
        skipped.append((r['id'], type(e).__name__ + ': ' + str(e)[:60]))

json.dump({'built': R['built'], 'cap': CAP, 'cap2': CAP2, 'answers': ANS},
          io.open(os.path.join(HERE, 'answers.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
sz = os.path.getsize(os.path.join(HERE, 'answers.json'))
print(f"계산 {len(ANS)} · 못 낸 것 {len(skipped)} · {sz/1024:.0f}KB")
for i, w in skipped: print('   -', i, w)
