import urllib.request, urllib.parse, json, time, sys
BASE="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
def count(term):
    for attempt in range(4):
        try:
            q=urllib.parse.urlencode({"db":"pubmed","term":term,"retmode":"json","rettype":"count"})
            with urllib.request.urlopen(BASE+"?"+q, timeout=30) as r:
                d=json.load(r); time.sleep(0.4); return int(d["esearchresult"]["count"])
        except Exception as e:
            time.sleep(2)
    return None
RD='("rare disease"[tiab] OR "rare diseases"[tiab] OR "rare disorder"[tiab] OR "rare disorders"[tiab] OR "orphan drug"[tiab] OR "orphan drugs"[tiab] OR "Rare Diseases"[Mesh] OR "Orphan Drug Production"[Mesh])'
KR='(Korea[ad] OR "Republic of Korea"[ad])'
SKKU='("Samsung Medical Center"[ad] OR Sungkyunkwan[ad] OR "Kangbuk Samsung"[ad] OR "Samsung Changwon"[ad])'
out={"years":{}, "diseases":{}}
for y in range(2006,2026):
    tot=count(f'{y}[dp]'); rd=count(f'{RD} AND {y}[dp]')
    ktot=count(f'{KR} AND {y}[dp]'); krd=count(f'{RD} AND {KR} AND {y}[dp]')
    out["years"][y]={"world_total":tot,"world_rd":rd,"kr_total":ktot,"kr_rd":krd}
    print(y,tot,rd,ktot,krd, file=sys.stderr)
DIS={"모야모야병":'moyamoya[tiab]',"샤르코-마리-투스병":'"Charcot-Marie-Tooth"[tiab]',"시신경척수염":'("neuromyelitis optica"[tiab] OR NMOSD[tiab])',
 "발작성 야간혈색소뇨증":'"paroxysmal nocturnal hemoglobinuria"[tiab]',"특발성 폐섬유증":'"idiopathic pulmonary fibrosis"[tiab]',"다발성경화증":'"multiple sclerosis"[tiab]',
 "AL 아밀로이드증":'("AL amyloidosis"[tiab] OR "light chain amyloidosis"[tiab] OR "light-chain amyloidosis"[tiab])',"프라더-윌리 증후군":'"Prader-Willi"[tiab]',
 "뮤코다당증":'(mucopolysaccharidosis[tiab] OR mucopolysaccharidoses[tiab])',"베체트병":'(Behcet[tiab] OR Behçet[tiab])',"중증근무력증":'"myasthenia gravis"[tiab]',"마르판 증후군":'Marfan[tiab]'}
P='2006:2025[dp]'
for k,t in DIS.items():
    w=count(f'{t} AND {P}'); kr=count(f'{t} AND {KR} AND {P}'); s=count(f'{t} AND {SKKU} AND {P}')
    out["diseases"][k]={"world":w,"korea":kr,"skku":s}
    print(k,w,kr,s,file=sys.stderr)
# totals 2006-2025
out["totals"]={"world_total":count(P),"world_rd":count(f'{RD} AND {P}'),"kr_total":count(f'{KR} AND {P}'),"kr_rd":count(f'{RD} AND {KR} AND {P}'),
 "skku_total":count(f'{SKKU} AND {P}'),"skku_rd":count(f'{RD} AND {SKKU} AND {P}')}
print(out["totals"],file=sys.stderr)
json.dump(out,open("pubmed_bench.json","w"),ensure_ascii=False,indent=1)
import urllib.request, urllib.parse, json, time, sys
BASE="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
def count(term):
    for attempt in range(4):
        try:
            q=urllib.parse.urlencode({"db":"pubmed","term":term,"retmode":"json","rettype":"count"})
            with urllib.request.urlopen(BASE+"?"+q, timeout=30) as r:
                d=json.load(r); time.sleep(0.4); return int(d["esearchresult"]["count"])
        except Exception as e:
            time.sleep(2)
    return None
RD='("rare disease"[tiab] OR "rare diseases"[tiab] OR "rare disorder"[tiab] OR "rare disorders"[tiab] OR "orphan drug"[tiab] OR "orphan drugs"[tiab] OR "Rare Diseases"[Mesh] OR "Orphan Drug Production"[Mesh])'
KR='(Korea[ad] OR "Republic of Korea"[ad])'
SKKU='("Samsung Medical Center"[ad] OR Sungkyunkwan[ad] OR "Kangbuk Samsung"[ad] OR "Samsung Changwon"[ad])'
out=json.load(open("pubmed_bench.json"))
for y in range(2006,2026):
    st=count(f'{SKKU} AND {y}[dp]'); srd=count(f'{RD} AND {SKKU} AND {y}[dp]')
    out["years"][str(y)].update({"skku_total":st,"skku_rd":srd}); print(y,st,srd,file=sys.stderr)
DIS={"근위축성측삭경화증(ALS)":'"amyotrophic lateral sclerosis"[tiab]',"전신홍반루푸스":'"systemic lupus erythematosus"[tiab]',"혈구탐식성 림프조직구증":'"hemophagocytic lymphohistiocytosis"[tiab]'}
P='2006:2025[dp]'
for k,t in DIS.items():
    w=count(f'{t} AND {P}'); kr=count(f'{t} AND {KR} AND {P}'); s=count(f'{t} AND {SKKU} AND {P}')
    out["diseases"][k]={"world":w,"korea":kr,"skku":s}; print(k,w,kr,s,file=sys.stderr)
# peer Korean hospitals, RD phrase share (same method) for context
PEERS={"서울대병원":'("Seoul National University Hospital"[ad] OR "Seoul National University College of Medicine"[ad])',
 "연세대 세브란스":'("Yonsei University College of Medicine"[ad] OR "Severance Hospital"[ad])',
 "울산대 서울아산병원":'("Asan Medical Center"[ad])',
 "가톨릭대 의대":'("Catholic University of Korea"[ad] AND (Medicine[ad] OR Hospital[ad]))'}
out["peers"]={}
for k,t in PEERS.items():
    tot=count(f'{t} AND {P}'); rd=count(f'{RD} AND {t} AND {P}')
    out["peers"][k]={"total":tot,"rd":rd}; print(k,tot,rd,file=sys.stderr)
json.dump(out,open("pubmed_bench.json","w"),ensure_ascii=False,indent=1)
print("done")
import urllib.request, urllib.parse, json, time, sys
BASE="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
def count(term):
    for attempt in range(4):
        try:
            q=urllib.parse.urlencode({"db":"pubmed","term":term,"retmode":"json","rettype":"count"})
            with urllib.request.urlopen(BASE+"?"+q, timeout=30) as r:
                d=json.load(r); time.sleep(0.4); return int(d["esearchresult"]["count"])
        except Exception as e:
            time.sleep(2)
    return None
RD='("rare disease"[tiab] OR "rare diseases"[tiab] OR "rare disorder"[tiab] OR "rare disorders"[tiab] OR "orphan drug"[tiab] OR "orphan drugs"[tiab] OR "Rare Diseases"[Mesh] OR "Orphan Drug Production"[Mesh])'
MED='("Samsung Medical Center"[ad] OR "Sungkyunkwan University School of Medicine"[ad] OR "Kangbuk Samsung"[ad] OR "Samsung Changwon"[ad])'
P='2006:2025[dp]'
out=json.load(open("pubmed_bench.json"))
out["skku_med"]={"total":count(f'{MED} AND {P}'),"rd":count(f'{RD} AND {MED} AND {P}')}
print(out["skku_med"],file=sys.stderr)
out["skku_med"]["years"]={}
for y in range(2006,2026):
    t=count(f'{MED} AND {y}[dp]'); r=count(f'{RD} AND {MED} AND {y}[dp]')
    out["skku_med"]["years"][y]={"total":t,"rd":r}; print(y,t,r,file=sys.stderr)
json.dump(out,open("pubmed_bench.json","w"),ensure_ascii=False,indent=1)
print("done")
