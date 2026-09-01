# -*- coding: utf-8 -*-
# 하는 일: 성명을 성 1자 + * 로 가린다
"""배포용 JSON — 실명을 마스킹해서 내보낸다.
   실명은 roster.json(로컬 작업파일)에만 남고 배포물에는 안 나간다.
   우리 솔루션이 해당 학교로 들어갈 수 있어 이름은 가린다."""
import json, collections, re, unicodedata
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
rows=json.load(open(f"{SP}/bk4/roster.json"))

def mask(nm):
    n=unicodedata.normalize('NFC', nm or '').strip()
    if not n: return ''
    if re.search(r'[가-힣]', n):                 # 한글 — 성 1자 + 나머지 *
        return n[0] + '*'*max(len(n)-1, 1)
    t=n.split()                                  # 영문 — 첫 토큰만 남긴다
    return (t[0] + ' ' + ' '.join('*'*len(x) for x in t[1:])).strip() if len(t)>1 else t[0]

for r in rows:
    r['name']=mask(r['name']); r['en']=mask(r['en'])
    r.pop('mail', None)                          # 이메일은 안 내보낸다

UN=['서울대','연세대','고려대','성균관대','한양대','경희대','중앙대','서강대']
uni={}
for u in UN:
    rs=[r for r in rows if r['un']==u]
    uni[u]={'prof':sum(1 for r in rs if r['kind']=='prof'),
            'new':sum(1 for r in rs if r['kind']=='new'),
            'dept':len({r['dept'] for r in rs if r['dept']}),
            'gy':dict(collections.Counter(r['gy'] for r in rs)),
            'fld':dict(collections.Counter(r['fld'] for r in rs))}
flds=[f for f,_ in collections.Counter(r['fld'] for r in rows).most_common() if f!='기타']
out={'built':'2026-09-02','src':'4단계 BK21 사업참여자 명단 (각 대학 공개자료)',
     'note':'이름은 성만 남기고 가렸습니다. 학과·직위·분야는 공개 자료입니다.',
     'univ':UN, 'fields':flds, 'sum':uni, 'people':rows}
json.dump(out, open(f"{SP}/bk4/bk4.json","w"), ensure_ascii=False, separators=(',',':'))
import os
print(f"  bk4.json {os.path.getsize(f'{SP}/bk4/bk4.json'):,} bytes · {len(rows):,}명")
print("  마스킹 예:", [r['name'] for r in rows[:6]])
print()
print("══ 대학별 (참여교수 / 신진 / 학과수)")
for u in UN:
    v=uni[u]; print(f"  {u:6s} {v['prof']:5d} / {v['new']:4d} / {v['dept']:3d}   "
      + " · ".join(f"{k} {n}" for k,n in sorted(v['gy'].items(), key=lambda x:-x[1])))
