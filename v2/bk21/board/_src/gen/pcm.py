# -*- coding: utf-8 -*-
# 하는 일: paper_citation_metric 의 IF_PUB_RANK 를 훑어 형태를 확인한다
import re,collections
p="/Users/karis/dev/biblo_rims_aws/tools/data/pcm.sql"
head=open(p,encoding="utf-8",errors="replace").read(3000)
print(u"══ 파일 머리 ══"); print(head[:900])
