# -*- coding: utf-8 -*-
# 하는 일: 등급 커버리지(미판정 비율)를 센다
import re,json,collections
# bk21_tree.json 에서 논문의 등재유형(tr)과 JCR 사분위 보유 여부를 본다
p="/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json"
t=open(p,encoding="utf-8",errors="replace").read()
print(u"bk21_tree.json  %.1f MB" % (len(t)/1e6))
tr=collections.Counter(re.findall(r'"tr":"([^"]{0,6})"', t))
print(u"\n══ 등재유형(tr) 분포 ══")
for k,v in tr.most_common(10): print(u"   %-6s %7d" % (k or '(빈값)', v))
ifv=re.findall(r'"if":"?([0-9.]*)"?', t)
has=sum(1 for x in ifv if x)
print(u"\n══ IF 값 보유 ══")
print(u"   if 필드 %d건 중 값 있음 %d건 (%.1f%%)" % (len(ifv), has, has/max(1,len(ifv))*100))
