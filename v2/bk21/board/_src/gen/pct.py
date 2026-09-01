# -*- coding: utf-8 -*-
# 하는 일: IF_PUB_RANK «순위/전체» 를 백분위로 환산하고 구간 분포를 낸다
import re,collections
p="/Users/karis/dev/biblo_rims_aws/tools/data/pcm.sql"
rows=collections.Counter(); pct=[]; papers=set(); bad=0
rx=re.compile(r'^(\d+)\t(\d+)\tIF_PUB_RANK\t\\N\t(\d+)/(\d+)\t', re.M)
mt=collections.Counter()
with open(p,encoding="utf-8",errors="replace") as f:
    for line in f:
        parts=line.rstrip("\n").split("\t")
        if len(parts)<7: continue
        mt[parts[2]]+=1
        if parts[2]=="IF_PUB_RANK":
            v=parts[4]
            m=re.match(r'^(\d+)/(\d+)$', v)
            if m:
                r_,t_=int(m.group(1)),int(m.group(2))
                if t_>0:
                    pct.append((r_/t_*100, parts[1])); papers.add(parts[1])
            else: bad+=1
print(u"══ metric_type 분포 ══")
for k,v in mt.most_common(12): print(u"   %-14s %8d" % (k,v))
print(u"\n══ IF_PUB_RANK ══")
print(u"   파싱 성공 %d건 · 형식 이상 %d건 · 고유 논문 %d편" % (len(pct), bad, len(papers)))
if pct:
    b=collections.Counter()
    for v,_ in pct:
        if v<=5: b['상위 5% 이내']+=1
        elif v<=10: b['5~10%']+=1
        elif v<=25: b['10~25%']+=1
        elif v<=50: b['25~50%']+=1
        else: b['50% 밖']+=1
    tot=len(pct)
    print(u"\n   SGCPI+ 구간별")
    for k in ['상위 5% 이내','5~10%','10~25%','25~50%','50% 밖']:
        print(u"     %-12s %7d건  %5.1f%%" % (k,b[k],b[k]/tot*100))
