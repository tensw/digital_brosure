# -*- coding: utf-8 -*-
# 하는 일: 집계 TSV 를 화면용 ucmp.json 으로 만든다
"""대학 비교 화면 데이터. DB 집계 + BK4 명단 규모를 한 파일로."""
import json, collections
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4"
UN=['서울대','연세대','고려대','성균관대','한양대','경희대','중앙대','서강대']
rd=lambda f: [l.rstrip('\n').split('|') for l in open(f,encoding='utf-8') if l.strip()]
num=lambda s: (float(s) if '.' in s else int(s)) if s not in ('','\\N') else None

yr=collections.defaultdict(dict)
for u,y,n,fw,c50,oa,corr,au in rd(f"{SP}/q_year.tsv"):
    yr[u][int(y)]={'n':int(n),'fw':num(fw),'c50':int(c50),'oa':int(oa),'corr':int(corr),'au':int(au)}
fld=collections.defaultdict(list)
for u,f,n,fw in rd(f"{SP}/q_field.tsv"):
    fld[u].append([f,int(n),num(fw)])
summ={}
for u,n,au,fw,fw2,c50,c100,oa,corr,first in rd(f"{SP}/q_sum.tsv"):
    summ[u]={'n':int(n),'au':int(au),'fw':num(fw),'fw2':int(fw2),'c50':int(c50),
             'c100':int(c100),'oa':int(oa),'corr':int(corr),'first':int(first)}

# BK4 명단 규모 (참여 인원)
bk4=json.load(open(f"{SP}/bk4.json"))
roster={}
for u in UN:
    v=bk4['sum'].get(u)
    if v: roster[u]={'prof':v['prof'],'new':v['new'],'dept':v['dept'],
                     'gy':v['gy'],'fld':v['fld']}

# 분야 상위 12 (전 대학 합 기준)
tot=collections.Counter()
for u,rows in fld.items():
    for f,n,_ in rows: tot[f]+=n
topf=[f for f,_ in tot.most_common(12)]

out={'built':'2026-09-02',
 'src':'논문·인용·FWCI = BIBLO paper.oa_work (OpenAlex 적재분) · 참여 인원 = 4단계 BK21 사업참여자 명단',
 'note':'논문 지표는 대학 전체(기관 소속 기준)입니다. BK21 참여자만의 실적이 아닙니다.',
 'univ':UN, 'years':list(range(2015,2027)), 'topFields':topf,
 'yr':{u:{str(k):v for k,v in yr[u].items()} for u in UN if u in yr},
 'fld':{u:fld[u][:20] for u in UN if u in fld},
 'sum':summ, 'roster':roster}
json.dump(out, open(f"{SP}/ucmp.json","w"), ensure_ascii=False, separators=(',',':'))
import os
print(f"  ucmp.json {os.path.getsize(f'{SP}/ucmp.json'):,} bytes")
print(f"  대학 {len(summ)} · 연도 {len(out['years'])} · 분야 {len(topf)}")
print("  상위 분야:", topf[:6])
