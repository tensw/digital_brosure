# -*- coding: utf-8 -*-
# 하는 일: OpenAlex 응답 형태를 확인한다
"""표본 12명으로 매칭률·정확도를 본다. 전체 4,226명을 돌리기 전에 확인한다."""
import json, urllib.request, urllib.parse, time, sys, random
sys.path.insert(0,'/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4')
from rom import rom
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4"
MAIL='mystar0928@gmail.com'
INST=json.load(open(f"{SP}/inst.json"))
rows=json.load(open(f"{SP}/roster.json"))
def oa(path):
    u=f"https://api.openalex.org/{path}"+('&' if '?' in path else '?')+f"mailto={MAIL}"
    for _ in range(3):
        try:
            with urllib.request.urlopen(u, timeout=25) as r: return json.load(r)
        except Exception: time.sleep(1.0)
    return None
random.seed(7)
samp=random.sample([r for r in rows if r['kind']=='prof'], 12)
SEL='&select=id,display_name,works_count,cited_by_count,summary_stats,affiliations,orcid'
hit=0
for r in samp:
    iid=INST.get(r['un'],{}).get('id')
    q=(r['en'] or rom(r['name'])).replace(',',' ').strip()
    d=oa(f"authors?filter=affiliations.institution.id:{iid}&search={urllib.parse.quote(q)}&per-page=3{SEL}")
    n=(d or {}).get('meta',{}).get('count',0)
    top=((d or {}).get('results') or [None])[0]
    ok='✅' if top else '—'
    if top: hit+=1
    print(f"  {ok} {r['un']:5s} {r['name']:5s} → {q:20s} 후보 {n:3d}"
          + (f"  {top['display_name'][:26]:28s} 논문 {top.get('works_count',0):5d}" if top else ''))
    time.sleep(.12)
print(f"\n  표본 매칭 {hit}/12 = {hit/12*100:.0f}%")
