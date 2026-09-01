# -*- coding: utf-8 -*-
# 하는 일: 맞춘 결과를 bk21_tree 저널 겹침으로 검증한다
"""성균관대 교수로 정확도를 잰다. 우리 원장에 실제 논문이 있으니 대조가 된다.
   매칭된 OpenAlex 저자의 게재지가 우리 원장의 게재지와 겹치면 «맞다» 로 본다."""
import json, sys, time, re, urllib.parse
sys.path.insert(0,'/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4')
from match import candidates, score, oa
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4"
roster=json.load(open(f"{SP}/roster.json"))
tree=json.load(open('/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json'))
# 우리 원장: 이름 → 논문 게재지 집합
byname={}
for d,v in tree['depts'].items():
    for pr in (v.get('profs') or []):
        ps=tree['papers'].get(pr.get('sid')) or []
        if pr.get('name') and ps:
            byname.setdefault(pr['name'], set()).update(
                re.sub(r'[^a-z0-9]','',(x.get('j') or '').lower())[:28] for x in ps if x.get('j'))
skku=[r for r in roster if r['un']=='성균관대' and r['kind']=='prof' and r['name'] in byname]
print(f"  대조 가능한 성균관대 교수 {len(skku)}명")
import random; random.seed(11)
samp=random.sample(skku, min(14, len(skku)))
TH=60
ok=wrong=none=0
for r in samp:
    cs=candidates(r['un'], r['name'])
    best=None; bs=0; bw=[]
    for c in cs:
        s,w=score(r,c)
        if s>bs: bs, best, bw = s, c, w
    if not best or bs<TH:
        none+=1; print(f"  — {r['name']:5s} 후보{len(cs):3d} 최고점 {bs:3d}  (미확정)"); continue
    # 검증 — OpenAlex 저자의 논문 게재지를 받아 우리 원장과 겹치나
    aid=best['id'].split('/')[-1]
    w=oa(f"works?filter=author.id:{aid}&per-page=50&select=primary_location")
    jr={re.sub(r'[^a-z0-9]','',(((x.get('primary_location') or {}).get('source') or {}).get('display_name') or '').lower())[:28]
        for x in (w or {}).get('results',[])}
    jr.discard('')
    inter=jr & byname[r['name']]
    hit=len(inter)
    if hit>=2: ok+=1; mark='✅'
    elif hit==1: ok+=1; mark='✅'
    else: wrong+=1; mark='❌'
    print(f"  {mark} {r['name']:5s} {bs:3d}점 → {best['display_name'][:24]:26s} 게재지겹침 {hit:2d}  [{','.join(bw[:3])}]")
    time.sleep(.1)
n=ok+wrong
print(f"\n  확정 {n}명 중 맞음 {ok} · 틀림 {wrong} → 정확도 {ok/n*100:.0f}%" if n else "")
print(f"  미확정 {none}명 (임계 {TH}점 미만)")
