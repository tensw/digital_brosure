# -*- coding: utf-8 -*-
# 하는 일: metrics.json + recipes.json 을 erd.html 안에 박아 넣는다.
# 판이 문서와 어긋나지 않게, 화면은 언제나 spec 파일을 그대로 읽는다.
import json, io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ERD  = os.path.join(HERE, '..', '..', '..', 'erd.html')
ERD  = os.path.normpath(ERD)

M = json.load(io.open(os.path.join(HERE, 'metrics.json'), encoding='utf-8'))
R = json.load(io.open(os.path.join(HERE, 'recipes.json'), encoding='utf-8'))

KO = {'paper':'논문','person':'사람','dept':'학과','relation':'관계',
      'university':'대학','quality':'품질'}

# 화면이 쓰는 만큼만 추린다. 17MB 보드와 달리 이 판은 가벼워야 한다.
spec = {
 'axes': M['axes'],
 'sliceable': M['sliceable'],
 'grains': {k: {'ko': KO[k], 'note': v} for k, v in M['grains'].items()},
 'metrics': [{'id':m['id'],'name':m['name'],'grain':m['grain'],'unit':m.get('unit'),
              'caveat':m.get('caveat')} for m in M['metrics']],
 'uncollected': M['uncollected'],
 'period': M['period'],
 'recipes': [{'id':r['id'],'q':r['q'][0],'nucleus':r['nucleus'],'axes':r['axes'],
              'filters':r['filters'],'measures':r['measures'],'against':r['against'],
              'chart':r['chart'],'caveats':r['caveats'],'covered_by':r['covered_by'],
              'blocked':r['blocked']} for r in R['recipes']],
}
# 핵별 조합 수
combo = {g: 2**len(ax)-1 for g, ax in M['sliceable'].items()}
spec['combos'] = combo
spec['combo_total'] = sum(combo.values())
spec['built'] = R['built']

blob = 'const SPEC=' + json.dumps(spec, ensure_ascii=False, separators=(',',':')) + ';'

html = io.open(ERD, encoding='utf-8').read()
pat = re.compile(r'/\*SPEC_START\*/[\s\S]*?/\*SPEC_END\*/')
if not pat.search(html):
    raise SystemExit('erd.html 에 /*SPEC_START*/ … /*SPEC_END*/ 자리가 없다')
REPL = '/*SPEC_START*/' + blob + '/*SPEC_END*/'
# re.sub 는 치환문자열의 \n · \\ · \1 을 해석해 JSON 을 깨뜨린다. 람다로 그대로 넣는다.
html = pat.sub(lambda m: REPL, html)
io.open(ERD, 'w', encoding='utf-8').write(html)
print(f"spec 주입 {len(blob):,}자 · 레시피 {len(spec['recipes'])} · 지표 {len(spec['metrics'])} · 조합 {spec['combo_total']:,}")
print('→', ERD)
