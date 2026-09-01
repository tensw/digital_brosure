# -*- coding: utf-8 -*-
# 하는 일: 대학·연도·분야 단위로 집계한다
"""대학 × 연도 × 분야 집계 — 이름 매칭 없이 기관 단위로 바로 센다.
   개인 이름 매칭은 한국 이름 로마자 변이 때문에 오귀속이 심해 쓰지 않는다."""
import json, urllib.request, urllib.parse, time, os
MAIL='mystar0928@gmail.com'
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4"
I=json.load(open(f"{SP}/inst.json"))
def oa(p, tries=4):
    u=f"https://api.openalex.org/{p}"+('&' if '?' in p else '?')+f"mailto={MAIL}"
    for i in range(tries):
        try:
            with urllib.request.urlopen(u,timeout=35) as r: return json.load(r)
        except Exception: time.sleep(.8*(i+1))
    return None
YRS=[str(y) for y in range(2020,2027)]
out={}
for u,meta in I.items():
    iid=meta['id']; d={'inst':iid,'name':meta['name']}
    g=oa(f"works?filter=institutions.id:{iid}&group_by=publication_year")
    d['yr']={x['key']:x['count'] for x in (g or {}).get('group_by',[]) if x['key'] in YRS}
    g=oa(f"works?filter=institutions.id:{iid},publication_year:2020-2026&group_by=primary_topic.field.id")
    d['fld']={x['key_display_name']:x['count'] for x in (g or {}).get('group_by',[])[:26]}
    g=oa(f"works?filter=institutions.id:{iid},publication_year:2020-2026&group_by=open_access.is_oa")
    d['oa']={x['key']:x['count'] for x in (g or {}).get('group_by',[])}
    # 인용 구간 · 국제공동
    tot=oa(f"works?filter=institutions.id:{iid},publication_year:2020-2026&per-page=1")
    d['total']=(tot or {}).get('meta',{}).get('count',0)
    for k,f in (('c50','cited_by_count:>50'),('c100','cited_by_count:>100'),
                ('intl','institutions.country_code:!kr'),('top10','best_oa_location.source.is_in_doaj:true')):
        r=oa(f"works?filter=institutions.id:{iid},publication_year:2020-2026,{f}&per-page=1")
        d[k]=(r or {}).get('meta',{}).get('count',0)
    out[u]=d
    print(f"  {u:6s} 총 {d['total']:>7,} · 연도 {len(d['yr'])} · 분야 {len(d['fld'])} · 인용50+ {d['c50']:>6,} · 국제공동 {d['intl']:>7,}")
    time.sleep(.2)
json.dump(out, open(f"{SP}/agg.json","w"), ensure_ascii=False)
print(f"\n  agg.json {os.path.getsize(f'{SP}/agg.json'):,} bytes")
