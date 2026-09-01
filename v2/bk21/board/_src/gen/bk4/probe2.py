# -*- coding: utf-8 -*-
# 하는 일: OpenAlex 저자 검색 결과를 확인한다
"""매칭 전략 비교 — ① 정규 로마자 ② 성만 ③ 성+이름 첫글자"""
import json, urllib.request, urllib.parse, time, sys, random, re
sys.path.insert(0,'/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4')
from rom import rom, SURNAME, syl
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4"
MAIL='mystar0928@gmail.com'
INST=json.load(open(f"{SP}/inst.json")); rows=json.load(open(f"{SP}/roster.json"))
def oa(p):
    u=f"https://api.openalex.org/{p}"+('&' if '?' in p else '?')+f"mailto={MAIL}"
    for _ in range(3):
        try:
            with urllib.request.urlopen(u,timeout=25) as r: return json.load(r)
        except Exception: time.sleep(1.0)
    return None
# 자음 골격 — g/k, b/p, d/t, j/ch 를 같게 보고 모음 변이를 줄인다
def skel(s):
    s=re.sub(r'[^a-z]','',(s or '').lower())
    s=s.replace('ch','j').replace('kk','g').replace('k','g').replace('pp','b').replace('p','b')
    s=s.replace('tt','d').replace('t','d').replace('ss','s')
    s=re.sub(r'[aeiouwy]+','',s)
    return s
def initials(korean):
    return ''.join(skel(syl(c))[:1] for c in korean[1:] if '가'<=c<='힣')
random.seed(7)
samp=random.sample([r for r in rows if r['kind']=='prof'], 12)
SEL='&select=id,display_name,works_count,cited_by_count,orcid'
hit=0
for r in samp:
    iid=INST.get(r['un'],{}).get('id'); nm=r['name']
    sur=SURNAME.get(nm[0], syl(nm[0]).capitalize())
    d=oa(f"authors?filter=affiliations.institution.id:{iid}&search={urllib.parse.quote(sur)}&per-page=50&sort=works_count:desc{SEL}")
    cands=(d or {}).get('results') or []
    want=skel(rom(nm)); wi=initials(nm); ws=skel(sur)
    best=None
    for c in cands:
        dn=c['display_name']; s2=skel(dn)
        if want and want in s2 or s2 in want and len(s2)>=4: best=(c,'전체일치'); break
        toks=[t for t in re.split(r'[\s,.]+',dn) if t]
        gi=''.join(skel(t)[:1] for t in toks if skel(t)[:1] and skel(t)!=ws)
        if wi and gi and (wi==gi or wi in gi or gi in wi): best=best or (c,'이니셜')
    ok='✅' if best else '—'
    if best: hit+=1
    print(f"  {ok} {r['un']:5s} {nm:5s} {sur:6s} 후보{len(cands):3d} "
          + (f"→ {best[0]['display_name'][:24]:26s} 논문{best[0].get('works_count',0):5d} [{best[1]}]" if best else f"(want={want} init={wi})"))
    time.sleep(.12)
print(f"\n  표본 매칭 {hit}/12 = {hit/12*100:.0f}%")
