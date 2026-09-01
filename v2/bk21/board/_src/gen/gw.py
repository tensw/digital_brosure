# -*- coding: utf-8 -*-
# 하는 일: 등급·가중 분포를 확인한다
import re,unicodedata,collections
t=unicodedata.normalize("NFC",open("/Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html",encoding="utf-8",errors="replace").read())
# 화면 렌더 함수 이름으로 구간을 잘라, 각 구간에서 g/w/환산 사용 여부를 본다
keys=['sheet','univ','tree','exec','net','glob','pool','exp']
print(u"══ 환산점수·등급·역할가중 언급 위치 ══")
for kw in [u'환산점수',u'환산편수',u'저널등급',u'역할가중',u'Σ(g',u'Σw',u'주저자',u'공저자 가중']:
    n=t.count(kw)
    print(u"  %-8s %d회" % (kw,n))
print(u"\n══ 계열·등급 판정 관련 ══")
for kw in [u'IF_PUB_RANK',u'JCR',u'SCIE',u'SSCI',u'A&HCI',u'KCI',u'등재']:
    print(u"  %-12s %d회" % (kw,t.count(kw)))
print(u"\n══ 산식이 실제로 계산되는 코드 ══")
for m in list(re.finditer(r'[^\n]{0,110}(?:g\s*\*\s*w|gw|score\s*\+=|S\s*=\s*[^=])[^\n]{0,110}', t))[:6]:
    s=re.sub(r'\s+',' ',m.group(0))
    if any(x in s for x in ['g*w','g *','w)','점수']): print(u"   …%s…" % s[:150])
