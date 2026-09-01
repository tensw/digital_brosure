# -*- coding: utf-8 -*-
# 하는 일: 학교·이름골격·분야·활동연도·규모·ORCID 를 0~100 으로 채점해 인물을 맞춘다 (미검증)
"""다신호 매칭 — 이름만으로 안 되니 학교·분야·연도·규모를 겹쳐 점수로 판단한다.
   우리 AI 판별 규칙(이름+분야+저널+공저자+학과)과 같은 얼개."""
import json, urllib.request, urllib.parse, time, re, sys, unicodedata
sys.path.insert(0,'/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4')
from rom import rom, SURNAME, syl
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad/bk4"
MAIL='mystar0928@gmail.com'
INST=json.load(open(f"{SP}/inst.json"))

def oa(p, tries=3):
    u=f"https://api.openalex.org/{p}"+('&' if '?' in p else '?')+f"mailto={MAIL}"
    for i in range(tries):
        try:
            with urllib.request.urlopen(u,timeout=30) as r: return json.load(r)
        except Exception: time.sleep(.7*(i+1))
    return None

def skel(s):
    """자음 골격 — g/k, b/p, d/t, j/ch 를 같게 보고 모음을 지운다."""
    s=re.sub(r'[^a-z]','',(s or '').lower())
    for a,b in (('ch','j'),('kk','g'),('k','g'),('pp','b'),('p','b'),('tt','d'),('t','d'),('ss','s')):
        s=s.replace(a,b)
    return re.sub(r'[aeiouwy]+','',s)

def surnames(ko):
    """성씨 표기 변이 — Lee/Yi/Rhee 처럼 여러 개를 다 본다."""
    v={SURNAME.get(ko,''), syl(ko).capitalize()}
    ALT={'이':['Lee','Yi','Rhee','Ri'],'박':['Park','Bak','Pak'],'김':['Kim','Gim'],
         '정':['Jung','Jeong','Chung','Jong'],'최':['Choi','Choe'],'조':['Cho','Jo'],
         '유':['Yoo','Yu','Ryu'],'류':['Ryu','Yu','Lyu'],'노':['Noh','No','Roh'],
         '오':['Oh','O'],'우':['Woo','Wu'],'권:':['Kwon','Gwon'],'황':['Hwang','Whang'],
         '강':['Kang','Gang'],'윤':['Yoon','Yun'],'장':['Jang','Chang'],'임':['Lim','Im','Yim'],
         '신':['Shin','Sin'],'서':['Seo','Suh','Sur'],'구':['Koo','Ku','Goo'],'백':['Baek','Paik','Back'],
         '전':['Jeon','Jun','Chun'],'문':['Moon','Mun'],'심':['Shim','Sim'],'추':['Chu','Choo'],
         '주':['Joo','Ju','Chu'],'허':['Heo','Huh','Hur'],'천':['Chun','Cheon'],'표':['Pyo','Pyou']}
    v.update(ALT.get(ko,[]))
    return {x for x in v if x}

# OpenAlex 분야 → 우리 표준분야 (겹치면 신호 +)
F2STD={'Engineering':'전자·전기·컴퓨터','Computer Science':'전자·전기·컴퓨터',
 'Materials Science':'신소재·재료','Physics and Astronomy':'물리·천문','Chemistry':'화학',
 'Mathematics':'수학·통계','Biochemistry, Genetics and Molecular Biology':'생명과학',
 'Medicine':'의학','Pharmacology, Toxicology and Pharmaceutics':'약학','Nursing':'간호',
 'Business, Management and Accounting':'경영·경제','Economics, Econometrics and Finance':'경영·경제',
 'Social Sciences':'사회·행정·정치','Psychology':'심리·교육','Arts and Humanities':'사학·철학·종교',
 'Environmental Science':'지구·환경과학','Earth and Planetary Sciences':'지구·환경과학',
 'Energy':'나노·에너지','Chemical Engineering':'화학공학','Agricultural and Biological Sciences':'농림·수산',
 'Immunology and Microbiology':'생명과학','Neuroscience':'생명과학','Dentistry':'치의학·수의학',
 'Veterinary':'치의학·수의학','Health Professions':'의학','Decision Sciences':'수학·통계'}

SEL='&select=id,display_name,display_name_alternatives,works_count,cited_by_count,summary_stats,topics,counts_by_year,orcid,affiliations'
def candidates(un, ko_name):
    iid=INST.get(un,{}).get('id')
    if not iid: return []
    out={}
    for sur in list(surnames(ko_name[0]))[:2]:
        d=oa(f"authors?filter=affiliations.institution.id:{iid}&search={urllib.parse.quote(sur)}"
             f"&per-page=50&sort=works_count:desc{SEL}")
        for c in (d or {}).get('results') or []: out[c['id']]=c
        time.sleep(.08)
    return list(out.values())

def score(r, c):
    """0~100. 이름 하나로는 안 되고 분야·연도·규모가 같이 맞아야 올라간다."""
    s=0; why=[]
    nm=r['name']; want=skel(rom(nm)); ws=skel(list(surnames(nm[0]))[0])
    names=[c['display_name']]+ (c.get('display_name_alternatives') or [])
    # ① 이름 — 전체 골격 일치가 가장 강하다
    full=any(want and (want in skel(x) or skel(x) in want) and len(want)>=4 for x in names)
    if full: s+=45; why.append('이름전체')
    else:
        gi=''.join(skel(syl(ch))[:1] for ch in nm[1:] if '가'<=ch<='힣')
        ok=False
        for x in names:
            toks=[t for t in re.split(r'[\s,.\-‐‑‒–—]+',x) if t]
            oi=''.join(skel(t)[:1] for t in toks if skel(t) and skel(t)!=ws)
            if gi and oi and gi==oi: ok=True; break
        if ok: s+=18; why.append('이니셜')
        else: return 0, []
    # ② 분야 — 우리 표준분야와 OpenAlex 상위 분야가 겹치나
    flds={F2STD.get((t.get('field') or {}).get('display_name')) for t in (c.get('topics') or [])[:6]}
    flds.discard(None)
    if r.get('fld') and r['fld'] in flds: s+=28; why.append('분야일치')
    elif r.get('gy') and any(f and f==r['fld'] for f in flds): s+=14
    # ③ 연도 — 사업기간(2020~2026)에 활동했나
    cy={x['year'] for x in (c.get('counts_by_year') or []) if x.get('works_count')}
    act=len(cy & set(range(2020,2027)))
    if act>=5: s+=17; why.append('활동7년중%d년'%act)
    elif act>=3: s+=11
    elif act>=1: s+=5
    # ④ 규모 — 교수라면 논문이 어느 정도 있다
    w=c.get('works_count') or 0
    if w>=30: s+=10; why.append('논문%d'%w)
    elif w>=10: s+=6
    elif w<3: s-=12
    # ⑤ ORCID 있으면 신뢰
    if c.get('orcid'): s+=5; why.append('ORCID')
    return s, why
