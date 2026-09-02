# -*- coding: utf-8 -*-
# 하는 일: 보드에서 떠낸 섹션 스킨을 skins.html 에 박는다.
# 스킨은 보드 CSS 위에 서므로 iframe 으로 격리한다. 안 그러면 서로 스타일을 덮는다.
import json, io, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'skins.html'))
S = json.load(io.open(os.path.join(HERE, 'skins.json'), encoding='utf-8'))
W, H = 720, 1040  # A4 세로 안쪽 (210×297mm · 96dpi · 여백 제외)
out = {'built': S['built'], 'css': S['css'], 'a4': [W, H], 'skins': []}
for s in S['skins']:
    sc = min(W / s['w'], 1.0)
    shape = ('그래픽' if s['svg'] else '표' if s['table'] else
             '막대' if s['bars'] > 3 else '수치' if s['kpi'] > 2 else '글')
    out['skins'].append({'id': s['id'], 'view': s['view'], 't': s['t'], 'ins': s['ins'],
                         'w': s['w'], 'h': s['h'], 'sc': round(sc, 3),
                         'fit': s['h'] * sc <= H, 'shape': shape,
                         'rows': s['rows'], 'html': s['html']})
blob = 'const SK=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';'
html = io.open(OUT, encoding='utf-8').read()
pat = re.compile(r'/\*SPEC_START\*/[\s\S]*?/\*SPEC_END\*/')
if not pat.search(html): raise SystemExit('skins.html 에 SPEC 자리가 없다')
REPL = '/*SPEC_START*/' + blob + '/*SPEC_END*/'
# re.sub 는 치환문자열의 \n · \\ · \1 을 해석해 JSON 을 깨뜨린다. 람다로 그대로 넣는다.
io.open(OUT, 'w', encoding='utf-8').write(pat.sub(lambda m: REPL, html))
print(f"스킨 {len(out['skins'])} · {len(blob)/1024/1024:.2f}MB · A4 맞음 {sum(x['fit'] for x in out['skins'])}")
