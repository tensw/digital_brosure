# -*- coding: utf-8 -*-
# 하는 일: 좌측 레일 메뉴 구성을 확인한다
import re,unicodedata
t=unicodedata.normalize("NFC",open("/Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html",encoding="utf-8",errors="replace").read())
strip=lambda s: re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',s)).strip()
print(u"══ 레일 버튼 ══")
for m in re.finditer(r'data-v="([a-z]+)"[^>]*>(.*?)</button>', t, re.S):
    print(u"  %-7s %s" % (m.group(1), strip(m.group(2))[:46]))
print(u"\n══ 화면별 h1 ══")
for m in re.finditer(r'id="v-([a-z]+)"', t):
    key=m.group(1); seg=t[m.start():m.start()+3000]
    h=re.search(r'<h1[^>]*>(.*?)</h1>', seg, re.S)
    print(u"  %-7s %s" % (key, strip(h.group(1))[:52] if h else '-'))
print(u"\n══ 화면 키가 붙은 카드 수 (data-cid) ══")
import collections
c=collections.Counter(re.findall(r'data-cid="([a-z]+)-', t))
for k,v in c.most_common(): print(u"  %-7s %d개" % (k,v))
