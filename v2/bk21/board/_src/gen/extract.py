# -*- coding: utf-8 -*-
# 하는 일: 보드에서 논문 목록을 뽑아 papers.json 으로 저장한다
import re,unicodedata,json,collections
t=unicodedata.normalize("NFC",open("/Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html",encoding="utf-8",errors="replace").read())
# 제목과 저널을 짝지어 뽑는다
recs=re.findall(r'"j":"([^"]{0,120})","t":"([^"]{5,300})"', t)
if len(recs)<1000:
    recs=[(j,ti) for ti,j in zip(re.findall(r'"t":"([^"]{5,300})"',t), re.findall(r'"j":"([^"]{0,120})"',t))]
print(u"논문 레코드 %d건 (제목+저널)" % len(recs))
json.dump(recs, open(SP:="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"+"/papers.json","w"), ensure_ascii=False)
print(u"저장: papers.json")
print(u"\n샘플 3건")
for j,ti in recs[:3]: print(u"   [%s] %s" % (j[:34], ti[:74]))
