# -*- coding: utf-8 -*-
# 하는 일: 저자 소속으로 IQ 해외공동연구·SQ 산업계협업을 판정한다
"""IQ 해외공동연구(2점) · SQ 산업계 협업(1점) 부착 후 학과·계열 재집계"""
import json, collections
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
SRC="/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json"
M=json.load(open(f"{SP}/iqsq.json"))
d=json.load(open(SRC))
KEYS=('RQ','RQ_jr','RQ_cf','RQ_ai','n_jr','n_cf','n_ai','IQ','IQ_intl','SQ','SQ_ind','n_intl','n_ind')

def attach(pr):
    ni,nd = M.get(pr.get('sid'), (0,0))
    pr['n_intl']=ni; pr['n_ind']=nd
    pr['IQ_intl']=ni*2; pr['IQ']=ni*2
    pr['SQ_ind']=nd*1;  pr['SQ']=nd*1
    for k in (pr.get('kids') or []): attach(k)
for dept,v in d['depts'].items():
    for g in ('profs','unassigned'):
        for pr in (v.get(g) or []): attach(pr)

GY=collections.defaultdict(lambda: collections.defaultdict(float))
GYd=collections.defaultdict(list); GYg=collections.defaultdict(collections.Counter)
for dept,v in d['depts'].items():
    st=d['stats'][dept]; gy=st.get('gy')
    acc=collections.defaultdict(float); Sg=collections.Counter(); U=C=0
    for pr in (v.get('profs') or []):
        for k in KEYS: acc[k]+=pr.get(k,0) or 0
        pl=d['papers'].get(pr.get('sid')) or []
        Sg+=collections.Counter(x['gs'] for x in pl if x.get('gs') is not None)
        U+=sum(1 for x in pl if x.get('tr')=='U'); C+=sum(1 for x in pl if x.get('tr')=='P')
    prof=st.get('prof',0) or 1
    st['S']=round(acc['RQ'],1); st['Savg']=round(acc['RQ']/prof,1)
    st['RQ']={k:round(acc[k],1) for k in KEYS}
    st['Sg']={str(a):b for a,b in sorted(Sg.items(),reverse=True)}
    st['undet']=U; st['conf']=C
    for k in KEYS: GY[gy][k]+=acc[k]
    GY[gy]['prof']+=st.get('prof',0); GY[gy]['papers']+=st.get('papers',0)
    GY[gy]['undet']+=U; GY[gy]['conf']+=C; GY[gy]['nstu']+=st.get('nstu',0)
    GYd[gy].append(dept); GYg[gy]+=Sg
out={}
for gy,a in GY.items():
    out[gy]={'S':round(a['RQ'],1),'Savg':round(a['RQ']/(a['prof'] or 1),1),
      'RQ':{k:round(a[k],1) for k in KEYS},
      'prof':int(a['prof']),'nstu':int(a['nstu']),'papers':int(a['papers']),
      'Sg':{str(x):y for x,y in sorted(GYg[gy].items(),reverse=True)},
      'undet':int(a['undet']),'conf':int(a['conf']),
      'depts':sorted(GYd[gy], key=lambda x:-d['stats'][x]['S'])}
d['gyo']=out
A=d['areas']
A['IQ']['have']=True; A['IQ']['items'][0]=['해외공동연구를 통한 논문발표 2','IQ_intl',True]
A['SQ']['have']=True; A['SQ']['items'][1]=['산업계 협업 공동연구 1','SQ_ind',True]
json.dump(d, open(SRC,'w'), ensure_ascii=False, separators=(',',':'))
print("══ 계열별 RQ · IQ · SQ (참여교수) ══")
for k,v in sorted(out.items(), key=lambda a:-a[1]['S']):
    r=v['RQ']
    print(f"  {k:6s} RQ {r['RQ']:>9,.0f}  IQ {r['IQ']:>7,.0f} (국제 {r['n_intl']:>5,.0f}편)  "
          f"SQ {r['SQ']:>6,.0f} (산학 {r['n_ind']:>4,.0f}편)")
n=sum(len(v['items']) for v in A.values()); ok=sum(1 for v in A.values() for i in v['items'] if i[2])
print(f"\n  지표 {n}개 중 산출 {ok}개")
