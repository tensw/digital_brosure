# -*- coding: utf-8 -*-
# 하는 일: recipes.json + answers.json + metrics.json 을 ask.html 에 박는다.
import json, io, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ASK  = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'ask.html'))
M = json.load(io.open(os.path.join(HERE,'metrics.json'), encoding='utf-8'))
R = json.load(io.open(os.path.join(HERE,'recipes.json'), encoding='utf-8'))
A = json.load(io.open(os.path.join(HERE,'answers.json'), encoding='utf-8'))
KO = {'paper':'논문','person':'사람','dept':'학과','relation':'관계','university':'대학','quality':'품질'}

# 스텝1 에 먼저 보일 다섯 (레시피 §6-3 우선순위)
FRONT = ['s01_uni_field','s02_qual_trend','s03_concentration','s04_stu_spread','s05_prof_stu']

spec = {
 'built': R['built'],
 'axes': {k:v['name'] for k,v in M['axes'].items()},
 'axnote': {k:v.get('note') for k,v in M['axes'].items() if v.get('note')},
 'grains': KO,
 'metrics': {m['id']:{'n':m['name'],'u':m.get('unit'),'g':m['grain'],'d':m.get('direction')} for m in M['metrics']},
 'period': M['period'],
 'front': FRONT,
 'recipes': [{'id':r['id'],'q':r['q'],'nucleus':r['nucleus'],'axes':r['axes'],
              'filters':r['filters'],'measures':r['measures'],'against':r['against'],
              'chart':r['chart'],'caveats':r['caveats'],'covered_by':r['covered_by'],
              'blocked':r['blocked'] or r.get('blocked_reason_fixed')} for r in R['recipes']],
 'answers': A['answers'],
 'cap': A['cap'],
 'uncollected': M['uncollected'],
}
blob = 'const SPEC=' + json.dumps(spec, ensure_ascii=False, separators=(',',':')) + ';'
html = io.open(ASK, encoding='utf-8').read()
pat = re.compile(r'/\*SPEC_START\*/[\s\S]*?/\*SPEC_END\*/')
if not pat.search(html): raise SystemExit('ask.html 에 SPEC 자리가 없다')
REPL = '/*SPEC_START*/' + blob + '/*SPEC_END*/'
# re.sub 는 치환문자열의 \n · \\ · \1 을 해석해 JSON 을 깨뜨린다. 람다로 그대로 넣는다.
io.open(ASK, 'w', encoding='utf-8').write(pat.sub(lambda m: REPL, html))
print(f"spec 주입 {len(blob)/1024:.0f}KB · 레시피 {len(spec['recipes'])} · 답 {len(A['answers'])}")
print('→', ASK)
