# -*- coding: utf-8 -*-
# 하는 일: AI 논문 판정 1차 규칙 — 1군 용어 단순 매칭
import re,json,collections
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
recs=json.load(open(SP+"/papers.json"))

# ── 1군 : 그 말만으로 AI 로 본다 (오탐 거의 없음)
STRONG=[r'deep learning',r'machine learning',r'artificial intelligence',r'neural network',
 r'\bLLM\b',r'large language model',r'reinforcement learning',r'convolutional',
 r'\bCNN\b',r'\bRNN\b',r'\bLSTM\b',r'\bGAN\b',r'\bBERT\b',r'\bGPT\b',
 r'foundation model',r'transfer learning',r'federated learning',r'self-supervised',
 r'semi-supervised',r'unsupervised learning',r'supervised learning',
 r'generative model',r'diffusion model',r'computer vision',
 r'natural language processing',r'\bNLP\b',r'explainable AI',r'\bXAI\b',
 r'딥러닝',r'머신러닝',r'기계학습',r'인공지능',r'심층학습',r'신경망',r'생성형']
# ── 2군 : 문맥이 맞아야 AI 로 본다 (단독으로는 오탐)
WEAK={
 r'\btransformer\b': dict(need=[r'vision|swin|graph|attention|encoder|decoder|pretrain|token|\bViT\b|language|segmentation|detection|classification'],
                          block=[r'converter|winding|voltage|\bLLC\b|planar|tapped|solid-state|neutral|feeder|relay|kVA|kW\b|power']),
 r'\battention\b':     dict(need=[r'mechanism|self-attention|cross-attention|multi-head|network|model'], block=[]),
 r'\bAI\b':            dict(need=[r'model|learning|system|based|driven|algorithm|agent|generative'], block=[r'\bAl\b']),
 r'\bagent\b':         dict(need=[r'\bLLM\b|language|autonomous|multi-agent|reinforcement'], block=[r'contrast agent|antibacterial|reducing agent|chemical agent']),
}
def cls(title, jour):
    s=(title+" || "+jour)
    low=s.lower()
    for p in STRONG:
        if re.search(p, s, re.I): return "auto", p
    for p,cfg in WEAK.items():
        if re.search(p, s, re.I):
            if any(re.search(b, s, re.I) for b in cfg["block"]): return "block", p
            if any(re.search(n, s, re.I) for n in cfg["need"]):  return "auto", p+" (문맥)"
            return "gray", p
    return "no", None

cnt=collections.Counter(); hits=collections.Counter(); samples=collections.defaultdict(list)
for j,ti in recs:
    k,p=cls(ti,j); cnt[k]+=1
    if p: hits[p]+=1
    if len(samples[k])<8: samples[k].append((p,ti[:82],j[:28]))
tot=len(recs)
print(u"═══ 판정 결과 (논문 %d건) ═══" % tot)
for k,lab in [("auto",u"자동 인정"),("gray",u"회색 · 사람 확인"),("block",u"제외(문맥)"),("no",u"해당 없음")]:
    print(u"  %-14s %6d건  %5.2f%%" % (lab, cnt[k], cnt[k]/tot*100))
print(u"\n═══ 걸린 규칙 상위 ═══")
for k,v in hits.most_common(16): print(u"   %5d  %s" % (v,k))
for k,lab in [("auto",u"자동 인정"),("gray",u"회색"),("block",u"제외")]:
    print(u"\n═══ %s 표본 ═══" % lab)
    for p,ti,j in samples[k]: print(u"   [%s] %s" % (str(p)[:26], ti))
