# -*- coding: utf-8 -*-
# 하는 일: 집계를 보드 트리 형태에 맞춰 다시 묶는다
"""RQ 세부지표 기준 재집계. 대학원생(kids)은 학과 합계에 넣지 않고 따로 센다."""
import json, collections
SRC="/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json"
KEYS=('RQ','RQ_jr','RQ_cf','RQ_ai','n_jr','n_cf','n_ai')

def main():
    d=json.load(open(SRC)); PAP=d['papers']
    def own(sid):
        pl=PAP.get(sid) or []
        Sg=collections.Counter(x['gs'] for x in pl if x.get('gs') is not None)
        return (Sg, sum(1 for x in pl if x.get('tr')=='U'), sum(1 for x in pl if x.get('tr')=='P'))
    GY=collections.defaultdict(lambda: collections.defaultdict(float))
    GYd=collections.defaultdict(list); GYg=collections.defaultdict(collections.Counter)
    for dept, v in d['depts'].items():
        st=d['stats'][dept]; gy=st.get('gy')
        acc=collections.defaultdict(float); Sg=collections.Counter(); U=C=0
        stu=collections.defaultdict(float); nstu=0
        for pr in (v.get('profs') or []):
            for k in KEYS: acc[k]+=pr.get(k,0) or 0
            g,u,c=own(pr.get('sid')); Sg+=g; U+=u; C+=c
            for kid in (pr.get('kids') or []):
                nstu+=1
                for k in KEYS: stu[k]+=kid.get(k,0) or 0
        for kid in (v.get('unassigned') or []):
            nstu+=1
            for k in KEYS: stu[k]+=kid.get(k,0) or 0
        prof=st.get('prof',0) or 1
        st['S']=round(acc['RQ'],1); st['Savg']=round(acc['RQ']/prof,1)
        st['RQ']={k:round(acc[k],1) for k in KEYS}
        st['RQs']={k:round(stu[k],1) for k in KEYS}; st['nstu']=nstu
        st['Sg']={str(a):b for a,b in sorted(Sg.items(),reverse=True)}
        st['undet']=U; st['conf']=C
        for k in KEYS: GY[gy][k]+=acc[k]
        for k in KEYS: GY[gy]['s_'+k]+=stu[k]
        GY[gy]['prof']+=st.get('prof',0); GY[gy]['papers']+=st.get('papers',0)
        GY[gy]['undet']+=U; GY[gy]['conf']+=C; GY[gy]['nstu']+=nstu
        GYd[gy].append(dept); GYg[gy]+=Sg
        # 학과 내 백분위
        arr=sorted((v.get('profs') or []), key=lambda p:-(p.get('RQ',0) or 0))
        n=len(arr) or 1
        for i,pr in enumerate(arr): pr['Spct']=round((i+0.5)/n*100,1)
    out={}
    for gy,a in GY.items():
        out[gy]={'S':round(a['RQ'],1),'Savg':round(a['RQ']/(a['prof'] or 1),1),
          'RQ':{k:round(a[k],1) for k in KEYS},
          'RQs':{k:round(a['s_'+k],1) for k in KEYS},
          'prof':int(a['prof']),'nstu':int(a['nstu']),'papers':int(a['papers']),
          'Sg':{str(x):y for x,y in sorted(GYg[gy].items(),reverse=True)},
          'undet':int(a['undet']),'conf':int(a['conf']),
          'depts':sorted(GYd[gy], key=lambda x:-d['stats'][x]['S'])}
    d['gyo']=out
    # 영역 정의 — 미수집을 화면이 알아야 한다
    d['areas']={
     'RQ':{'label':'연구역량','have':True,
           'items':[['학술지','RQ_jr',True],['학술대회','RQ_cf',True],['AI 관련 논문','RQ_ai',True],
                    ['학술대회·학술지 수상',None,False],['연구조교(RA) 활동',None,False],
                    ['AI 관련 수상',None,False]]},
     'LQ':{'label':'교육역량','have':False,'items':[['국내외 강의 제공',None,False],
           ['교육조교(TA) 활동',None,False],['URP 지도대학원생',None,False],
           ['도전학기(교과) 일반·AI',None,False],['AI 교과 이수',None,False],['학점 4.0 이상',None,False]]},
     'IQ':{'label':'소통역량','have':False,'items':[['해외공동연구 논문발표',None,False],
           ['교환학생',None,False],['해외연수',None,False],['팀연구프로젝트',None,False],
           ['비교과 프로그램 일반·AI',None,False],['AI 역량개발 활동',None,False]]},
     'SQ':{'label':'사회기여역량','have':False,'items':[['SDG 분야 국제논문',None,False],
           ['산업계 협업 공동연구',None,False],['지역사회 연계 프로젝트',None,False],
           ['특허 출원',None,False],['특허 등록',None,False]]}}
    json.dump(d, open(SRC,'w'), ensure_ascii=False, separators=(',',':'))
    print("══ 계열 재집계 (RQ) ══")
    for k,v in sorted(out.items(), key=lambda a:-a[1]['S']):
        r=v['RQ']
        print(f"  {k:6s} RQ {v['S']:>10,.1f} (1인당 {v['Savg']:>6.1f})  "
              f"학술지 {r['RQ_jr']:>9,.1f} · 학술대회 {r['RQ_cf']:>6,.1f} · AI {r['RQ_ai']:>5,.0f}  "
              f"교수 {v['prof']:3d} 학생 {v['nstu']:4d}")
main()
