# -*- coding: utf-8 -*-
# 하는 일: OpenAlex 기관 ID 를 대학별로 찾는다
import json, urllib.request, urllib.parse, time
MAIL='mystar0928@gmail.com'
def oa(path):
    u=f"https://api.openalex.org/{path}"+('&' if '?' in path else '?')+f"mailto={MAIL}"
    for _ in range(3):
        try:
            with urllib.request.urlopen(u, timeout=25) as r: return json.load(r)
        except Exception as e:
            time.sleep(1.2)
    return None
Q={'서울대':'Seoul National University','연세대':'Yonsei University','고려대':'Korea University',
   '성균관대':'Sungkyunkwan University','한양대':'Hanyang University','경희대':'Kyung Hee University',
   '중앙대':'Chung-Ang University','서강대':'Sogang University'}
out={}
for k,v in Q.items():
    d=oa('institutions?search='+urllib.parse.quote(v)+'&per-page=3')
    if not d or not d.get('results'): print(f"  {k:6s} ❌"); continue
    best=None
    for r in d['results']:
        if (r.get('country_code')=='KR'): best=r; break
    best=best or d['results'][0]
    out[k]={'id':best['id'].split('/')[-1],'name':best['display_name'],
            'works':best.get('works_count'),'cited':best.get('cited_by_count')}
    print(f"  {k:6s} {out[k]['id']:10s} {best['display_name'][:36]:38s} 논문 {best.get('works_count'):,}")
    time.sleep(.15)
json.dump(out, open('/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4/inst.json','w'), ensure_ascii=False, indent=1)
