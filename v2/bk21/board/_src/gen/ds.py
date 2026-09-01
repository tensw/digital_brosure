# -*- coding: utf-8 -*-
# 하는 일: 보드 데이터 구조를 훑어 키를 확인한다
import re,unicodedata
t=unicodedata.normalize("NFC",open("/Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html",encoding="utf-8",errors="replace").read())
i=t.find("const DATA=")
if i<0: i=t.find("const DATA =")
seg=t[i:i+1400]
print(u"══ DATA 시작부 ══"); print(re.sub(r'\s+',' ',seg)[:900])
print(u"\n══ 사람 레코드 한 건 ══")
m=re.search(r'\{"n":"[^"]{2,30}"[^}]{0,700}\}', t[i:i+900000])
if m: print(re.sub(r'\s+',' ',m.group(0))[:700])
print(u"\n══ S/E 가 값으로 박혀 있나 ══")
for kw in ['"S":','"E":','"s":','"e":','"sc":','"score"']:
    print(u"  %-9s %d회" % (kw, t.count(kw)))
