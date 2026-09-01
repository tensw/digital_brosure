# -*- coding: utf-8 -*-
# 하는 일: 제목·게재지 용어 빈도를 세어 규칙 후보를 고른다
import re,unicodedata
t=unicodedata.normalize("NFC",open("/Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html",encoding="utf-8",errors="replace").read())
titles=re.findall(r'"t":"([^"]{5,200})"', t)
print(u"══ 'transformer' 가 든 제목 12건 ══")
n=0
for x in titles:
    if 'transformer' in x.lower():
        n+=1; print(u"  %2d. %s" % (n, x[:96]))
        if n>=12: break
print(u"\n══ 'attention' 이 든 제목 6건 ══")
n=0
for x in titles:
    if 'attention' in x.lower():
        n+=1; print(u"  %2d. %s" % (n, x[:96]))
        if n>=6: break
