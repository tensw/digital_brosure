# -*- coding: utf-8 -*-
# 하는 일: AI 논문 판정 결과를 보드 데이터에 되먹인다
import re,unicodedata,collections
t=unicodedata.normalize("NFC",open("/Users/karis/dev/bibloai-homepage/v2/bk21/board/index.html",encoding="utf-8",errors="replace").read())
print(u"══ 논문 레코드 필드 ══")
m=re.search(r'\{"y":\d{4},[^}]{0,400}\}', t)
if not m: m=re.search(r'\{"[a-z]{1,3}":"[^"]{0,40}","r":"[^"]{0,10}"[^}]{0,400}\}', t)
print("  ", re.sub(r'\s+',' ',m.group(0))[:400] if m else "못 찾음")
print(u"\n══ 분야(f) 값 상위 ══")
c=collections.Counter(re.findall(r'"f":"([^"]{1,40})"', t))
for k,v in c.most_common(14): print(u"   %5d  %s" % (v,k))
print(u"   빈값 포함 총 %d종" % len(c))
print(u"\n══ AI 관련 용어가 논문 제목에 몇 건 ══")
titles=re.findall(r'"t":"([^"]{5,200})"', t)
print(u"   제목 총 %d건" % len(titles))
terms=[u'딥러닝','머신러닝','인공지능','신경망','기계학습',
       'deep learning','machine learning','neural network','artificial intelligence',
       'transformer','LLM','GPT','reinforcement learning','convolutional']
low=[x.lower() for x in titles]
for w in terms:
    n=sum(1 for x in low if w.lower() in x)
    if n: print(u"   %-22s %d건" % (w,n))
