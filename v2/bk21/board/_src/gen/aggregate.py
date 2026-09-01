# -*- coding: utf-8 -*-
# 하는 일: 학과·계열 단위로 1차 집계한다
"""개인 → 학과 → 계열 집계. 대학원생(kids)은 학과 합계에 넣지 않는다 (work-plan §5-5)."""
import json, collections
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
d=json.load(open(f"{SP}/bk21_tree_scored.json"))
PAP=d['papers']

def score_of(sid):
    pl=PAP.get(sid) or []
    S=sum(x['sc'] for x in pl); Sn=sum(x['gw'] for x in pl)
    Sg=collections.Counter(x['gs'] for x in pl)
    undet=sum(1 for x in pl if x['tr']=='U')
    conf =sum(1 for x in pl if x['tr']=='P')
    return S,Sn,Sg,undet,conf

GY=collections.defaultdict(lambda: {'S':0.0,'prof':0,'papers':0,'Sg':collections.Counter(),
                                    'undet':0,'conf':0,'depts':[]})
for dept, v in d['depts'].items():
    st=d['stats'][dept]; gy=st.get('gy')
    dS=dSn=0.0; dSg=collections.Counter(); dU=dC=0; np_=0
    for pr in (v.get('profs') or []):
        S,Sn,Sg,u,c = score_of(pr.get('sid'))
        pr['S']=round(S,1); pr['Sn']=round(Sn,1); pr['Sg']={str(k):n for k,n in sorted(Sg.items(),reverse=True)}
        pr['undet']=u
        dS+=S; dSn+=Sn; dSg+=Sg; dU+=u; dC+=c; np_+=len(PAP.get(pr.get('sid')) or [])
    # 학과 내 백분위 (screen-design §2 결정 — 순위 아닌 분위)
    arr=sorted((v.get('profs') or []), key=lambda pr: -pr.get('S',0.0))
    n=len(arr) or 1
    for i,pr in enumerate(arr): pr['Spct']=round((i+0.5)/n*100,1)
    prof=st.get('prof',0) or 1
    st['S']=round(dS,1); st['Savg']=round(dS/prof,1)
    st['Sg']={str(k):c for k,c in sorted(dSg.items(),reverse=True)}
    st['undet']=dU; st['conf']=dC
    g=GY[gy]; g['S']+=dS; g['prof']+=st.get('prof',0); g['papers']+=st.get('papers',0)
    g['Sg']+=dSg; g['undet']+=dU; g['conf']+=dC; g['depts'].append(dept)

out={}
for k,v in GY.items():
    out[k]={'S':round(v['S'],1),'Savg':round(v['S']/(v['prof'] or 1),1),
            'prof':v['prof'],'papers':v['papers'],
            'Sg':{str(a):b for a,b in sorted(v['Sg'].items(),reverse=True)},
            'undet':v['undet'],'conf':v['conf'],
            'depts':sorted(v['depts'], key=lambda x:-d['stats'][x]['S'])}
d['gyo']=out
json.dump(d, open(f"{SP}/bk21_tree_final.json","w"), ensure_ascii=False, separators=(',',':'))

print("══ 계열 집계 ══")
for k,v in sorted(out.items(), key=lambda a:-a[1]['S']):
    print(f"  {k:6s} 환산 {v['S']:>10,.1f}  1인당 {v['Savg']:>6.1f}  교수 {v['prof']:4d}  미판정 {v['undet']:5d}  학회 {v['conf']:5d}")
print("\n══ 학과 상위 8 (1인당) ══")
rows=sorted(d['stats'].items(), key=lambda a:-a[1]['Savg'])[:8]
for k,v in rows:
    print(f"  {v['Savg']:>7.1f}  {k:22s} {v['gy']:5s} 합계 {v['S']:>9,.1f} 교수 {v['prof']:3d}")
