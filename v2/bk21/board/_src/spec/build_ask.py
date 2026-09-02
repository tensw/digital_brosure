# -*- coding: utf-8 -*-
# 하는 일: recipes.json + answers.json + metrics.json 을 ask.html 에 박는다.
import json, io, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ASK  = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'ask.html'))
M = json.load(io.open(os.path.join(HERE,'metrics.json'), encoding='utf-8'))
R = json.load(io.open(os.path.join(HERE,'recipes.json'), encoding='utf-8'))
A = json.load(io.open(os.path.join(HERE,'answers.json'), encoding='utf-8'))
SKN = json.load(io.open(os.path.join(HERE,'skins.json'), encoding='utf-8'))
WD = json.load(io.open(os.path.join(HERE,'widgets.json'), encoding='utf-8'))
WJS = io.open(os.path.join(HERE,'widget.js'), encoding='utf-8').read()
PJS = io.open(os.path.join(HERE,'person.js'), encoding='utf-8').read()
KO = {'paper':'논문','person':'사람','dept':'학과','relation':'관계','university':'대학','quality':'품질'}

# 스텝1 에 먼저 보일 다섯 (레시피 §6-3 우선순위)
FRONT = ['s01_uni_field','s02_qual_trend','s03_concentration','s04_stu_spread','s05_prof_stu']

spec = {
 'built': R['built'],
 'axes': {k:v['name'] for k,v in M['axes'].items()},
 'axnote': {k:v.get('note') for k,v in M['axes'].items() if v.get('note')},
 'grains': KO,
 'metrics': {m['id']:{'n':m['name'],'u':m.get('unit'),'g':m['grain'],'d':m.get('direction'),'y':m.get('yearcmp'),'s':m.get('size'),'pc':m.get('pc')} for m in M['metrics']},
 'period': M['period'],
 'front': FRONT,
 'recipes': [{'id':r['id'],'q':r['q'],'nucleus':r['nucleus'],'axes':r['axes'],
              'filters':r['filters'],'measures':r['measures'],'against':r['against'],
              'chart':r['chart'],'case':r.get('case'),'widget':r.get('widget'),'pick':r.get('pick'),'omit':r.get('omit'),'also':r.get('also'),
              'caveats':r['caveats'],'covered_by':r.get('covered_by') or [],'needs':r.get('needs'),
              'blocked':r['blocked'] or r.get('blocked_reason_fixed')} for r in R['recipes']],
 'answers': A['answers'],
 'cap': A['cap'],
 'uncollected': M['uncollected'],
 # 위젯 11종 · 의도 10종 (이름·정렬 규칙). 그리기는 widget.js 가 보드 문법으로 한다
 'widgets': {'W': WD['widgets'], 'I': WD['intents']},
 'skincss': SKN['css'],
}
blob = 'const SPEC=' + json.dumps(spec, ensure_ascii=False, separators=(',',':')) + ';'
html = io.open(ASK, encoding='utf-8').read()
pat = re.compile(r'/\*SPEC_START\*/[\s\S]*?/\*SPEC_END\*/')
if not pat.search(html): raise SystemExit('ask.html 에 SPEC 자리가 없다')
REPL = '/*SPEC_START*/' + blob + '/*SPEC_END*/'
# re.sub 는 치환문자열의 \n · \\ · \1 을 해석해 JSON 을 깨뜨린다. 람다로 그대로 넣는다.
html = pat.sub(lambda m: REPL, html)
# 위젯 엔진 본문. 브라우저에서는 module 이 없어 export 줄은 그냥 지나간다
wpat = re.compile(r'/\*WIDGET_START\*/[\s\S]*?/\*WIDGET_END\*/')
if not wpat.search(html): raise SystemExit('ask.html 에 WIDGET 자리가 없다')
WREPL = '/*WIDGET_START*/\n' + WJS + '\n/*WIDGET_END*/'
html = wpat.sub(lambda m: WREPL, html)
# 사람 단위 장치. 자료(people.json)는 여기 박지 않고 화면이 로그인 뒤에 읽는다
ppat = re.compile(r'/\*PERSON_START\*/[\s\S]*?/\*PERSON_END\*/')
if not ppat.search(html): raise SystemExit('ask.html 에 PERSON 자리가 없다')
html = ppat.sub(lambda m: '/*PERSON_START*/\n' + PJS + '\n/*PERSON_END*/', html)
io.open(ASK, 'w', encoding='utf-8').write(html)
print(f"위젯 엔진 주입 {len(WJS)/1024:.0f}KB")
print(f"spec 주입 {len(blob)/1024:.0f}KB · 레시피 {len(spec['recipes'])} · 답 {len(A['answers'])}")
print('→', ASK)
