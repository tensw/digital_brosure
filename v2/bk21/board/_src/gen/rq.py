# -*- coding: utf-8 -*-
# 하는 일: RQ 연구역량 세부지표(학술지·학회·AI)를 분해한다
"""RQ 세부지표로 분해. 매뉴얼 3쪽 배점표 그대로.
   학회는 학술지 등급이 아니라 «학술대회» 지표다 — 국제 2 · 국내 1, 주저자만."""
import json, collections
SRC="/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json"
MAIN={'단독','제1','교신','제1+교신'}

def main():
    d=json.load(open(SRC))
    per={}
    agg=collections.Counter()
    for sid, pl in d['papers'].items():
        jr=cf=ai=0.0; njr=ncf=nai=0
        for x in pl:
            main_a = x.get('r') in MAIN
            if x.get('tr')=='P':
                # 학술대회 — 주저자만 인정 (매뉴얼: 공저자 인정 안 함)
                pt = x.get('cfp',2) if main_a else 0
                x['sc']=float(pt); x['gs']=None; x['gw']=1.0 if main_a else 0.0
                x['why']=f"{x.get('cf','국제')}학술대회" + ('' if main_a else ' · 공저 미인정')
                cf+=pt; ncf += 1 if pt else 0
            else:
                s=(x.get('gs') or 0)*(x.get('gw') or 0)
                x['sc']=round(s,2); jr+=s; njr+=1
            if x.get('ai')==1: ai+=1; nai+=1
        per[sid]={'RQ_jr':round(jr,1),'RQ_cf':round(cf,1),'RQ_ai':round(ai,1),
                  'RQ':round(jr+cf+ai,1),'n_jr':njr,'n_cf':ncf,'n_ai':nai}
        agg['jr']+=jr; agg['cf']+=cf; agg['ai']+=ai
    # 인물 레코드에 부착
    def attach(pr):
        v=per.get(pr.get('sid'))
        if v: pr.update(v)
        for k in (pr.get('kids') or []): attach(k)
    for dept,v in d['depts'].items():
        for g in ('profs','unassigned'):
            for pr in (v.get(g) or []): attach(pr)
    json.dump(d, open(SRC,'w'), ensure_ascii=False, separators=(',',':'))
    print("══ 3  RQ 세부지표 (전체 인물 합) ══")
    print(f"  학술지        {agg['jr']:>12,.1f}")
    print(f"  학술대회      {agg['cf']:>12,.1f}   (국제 2점 · 주저자만)")
    print(f"  AI 관련 논문  {agg['ai']:>12,.1f}   (1편 1점 · 역할 무관 · 중복 인정)")
    print(f"  RQ 합계       {sum(agg.values()):>12,.1f}")
main()
