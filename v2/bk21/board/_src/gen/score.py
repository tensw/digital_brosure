# -*- coding: utf-8 -*-
# 하는 일: SGCPI+ 배점표로 논문·사람 환산점수를 매긴다 (bk21_tree_scored.json)
"""SGCPI+ 환산점수 산출 — work-plan.md §5 구현"""
import json, re, collections, sys

SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
SRC="/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json"

# 조정 손잡이 세 개 (screen-design.md §9)
G_CONF_TOP   = 4     # 최상위 학회
G_CONF_OTHER = 1     # 그 밖의 학회
G_BELOW50    = 2     # JCR 50% 밖

CONF = re.compile(r'proceedings|conference|symposium|workshop|congress', re.I)
TOP  = re.compile(r'\b(NeurIPS|Neural Information Processing|CVPR|Computer Vision and Pattern'
                  r'|ICCV|ECCV|ICML|ICLR|AAAI|IJCAI|ACL|EMNLP|NAACL|SIGGRAPH|INTERSPEECH'
                  r'|ICASSP|KDD|WWW|CHI|USENIX|NDSS|OSDI|SOSP|ISCA|MICRO|HPCA|DAC|VLSI)\b', re.I)

def load_jrank():
    m={}
    for ln in open(f"{SP}/jrank.tsv", encoding='utf-8'):
        k,v = ln.rstrip("\n").split("\t"); m[k]=float(v)
    return m

def build_map(d):
    """인물키 → 학과. kids 를 재귀로 탄다 (work-plan §5-5)"""
    p2d={}
    def reg(pr, dept):
        if not isinstance(pr, dict): return
        if pr.get('sid'): p2d[pr['sid']]=dept
        for k in (pr.get('kids') or []): reg(k, dept)
    for dept, v in d['depts'].items():
        for grp in ('profs','unassigned'):
            for pr in (v.get(grp) or []): reg(pr, dept)
    return p2d

def grade(x, gy, J):
    """→ (gs, 근거라벨, tr2)"""
    j  = (x.get('j') or '').strip()
    jn = j.upper()
    tr = x.get('tr')
    if CONF.search(j):
        return (G_CONF_TOP,'최상위 학회','P') if TOP.search(j) else (G_CONF_OTHER,'학회발표','P')
    if tr=='K': return 2,'KCI','K'
    if gy=='인문사회':
        if tr in ('S','A','B','C'): return 6,'SCI 계열','E' if tr is None else tr
        return 0,'미판정','U'
    pct = J.get(jn)
    if pct is not None:
        p = round(pct*100, 2)
        if p<=5:  return 6,f'상위 {p:.1f}%','S'
        if p<=10: return 5,f'상위 {p:.1f}%','S'
        if p<=25: return 4,f'상위 {p:.1f}%','A'
        if p<=50: return 3,f'상위 {p:.1f}%','B'
        return G_BELOW50, f'상위 {p:.1f}%','C'
    return 0,'미판정','U'

MAIN={'단독','제1','교신','제1+교신'}

def main():
    d=json.load(open(SRC)); J=load_jrank(); p2d=build_map(d)
    gyof={k:v.get('gy') for k,v in d['stats'].items()}
    unmapped=0
    gcnt=collections.Counter(); trcnt=collections.Counter()
    per_person={}
    for key, plist in d['papers'].items():
        dept=p2d.get(key)
        if dept is None: unmapped+=len(plist)
        gy=gyof.get(dept)
        S=Sn=0.0; Sg=collections.Counter()
        for x in plist:
            gs,why,tr2 = grade(x, gy, J)
            gw = 1.0 if x.get('r') in MAIN else 0.5
            sc = gs*gw
            x['gs'],x['gw'],x['sc'],x['why'],x['tr']=gs,gw,round(sc,2),why,tr2
            pct=J.get((x.get('j') or '').upper())
            x['pct']=round(pct*100,2) if pct is not None else None
            S+=sc; Sn+=gw; Sg[gs]+=1; gcnt[gs]+=1; trcnt[tr2]+=1
        per_person[key]={'S':round(S,1),'Sn':round(Sn,1),'Sg':dict(Sg)}
    print(f"  미매핑 논문 {unmapped}건  (0 이어야 함)")
    print("\n══ 등급 분포 ══")
    tot=sum(gcnt.values())
    for g in (6,5,4,3,2,1,0):
        n=gcnt.get(g,0); print(f"  g={g}  {n:6d}  {n/tot*100:5.1f}%")
    print("\n══ tr 재부여 ══")
    for k,v in trcnt.most_common(): print(f"  {k}  {v:6d}")
    json.dump({'person':per_person}, open(f"{SP}/person_score.json","w"), ensure_ascii=False)
    json.dump(d, open(f"{SP}/bk21_tree_scored.json","w"), ensure_ascii=False)
    print(f"\n  저장 → bk21_tree_scored.json")
main()
