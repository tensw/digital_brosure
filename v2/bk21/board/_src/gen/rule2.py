# -*- coding: utf-8 -*-
# 하는 일: AI 논문 판정 2차 규칙 — 2군 용어에 문맥조건, 회색 분리
import re,json,collections
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
recs=json.load(open(SP+"/papers.json"))
STRONG=[r'deep learning',r'machine learning',r'artificial intelligence',r'neural network',
 r'\bLLM\b',r'large language model',r'reinforcement learning',r'convolutional',
 r'\bCNN\b',r'\bRNN\b',r'\bLSTM\b',r'\bGAN\b',r'\bBERT\b',r'\bGPT\b',r'\bViT\b',
 r'foundation model',r'transfer learning',r'federated learning',r'self-supervised',
 r'semi-supervised',r'unsupervised learning',r'supervised learning',r'contrastive learning',
 r'generative model',r'diffusion model',r'computer vision',r'few-shot',r'zero-shot',
 r'natural language processing',r'\bNLP\b',r'explainable AI',r'\bXAI\b',r'knowledge distillation',
 r'딥러닝',r'머신러닝',r'기계학습',r'인공지능',r'심층학습',r'신경망',r'생성형']
WEAK={
 r'\btransformer\b': dict(
   need=[r'vision|swin|graph|attention|encoder|decoder|pretrain|token|language|'
         r'segmentation|detection|classification|estimation|pose|-based|prediction|recognition'],
   block=[r'converter|winding|voltage|\bLLC\b|planar|tapped|solid-state|neutral|'
          r'feeder|relay|kVA|\bkW\b|resonant|charger|inductor|transformerless']),
 r'\battention\b': dict(
   need=[r'mechanism|self-|cross-|multi-head|-based|-aided|fusion|network|module|map|multiscale|multi-scale'],
   block=[]),
 r'\bAI\b': dict(need=[r'model|learning|system|based|driven|algorithm|agent|generative|assisted'],
                 block=[]),
 r'\bagent\b': dict(need=[r'\bLLM\b|language|autonomous|multi-agent|reinforcement|intelligent'],
                    block=[r'blowing agent|contrast agent|antibacterial|reducing agent|'
                           r'chemical agent|foaming agent|coupling agent|oxidizing agent']),
}
def cls(title, jour):
    s=title+" || "+jour
    for p in STRONG:
        if re.search(p,s,re.I): return "auto",p
    for p,cfg in WEAK.items():
        if re.search(p,s,re.I):
            if any(re.search(b,s,re.I) for b in cfg["block"]): return "block",p
            if any(re.search(n,s,re.I) for n in cfg["need"]):  return "auto",p+"(문맥)"
            return "gray",p
    return "no",None
cnt=collections.Counter(); samples=collections.defaultdict(list)
for j,ti in recs:
    k,p=cls(ti,j); cnt[k]+=1
    if len(samples[k])<10: samples[k].append((p,ti[:86]))
tot=len(recs)
print(u"═══ 최종 판정 (논문 %d건) ═══" % tot)
for k,lab in [("auto",u"자동 인정"),("gray",u"회색 · 사람 확인"),("block",u"제외(문맥)"),("no",u"해당 없음")]:
    print(u"  %-16s %6d건  %5.2f%%" % (lab,cnt[k],cnt[k]/tot*100))
for k,lab in [("gray",u"회색 (남은 것 전부)"),("block",u"제외")]:
    print(u"\n═══ %s ═══" % lab)
    for p,ti in samples[k]: print(u"   [%s] %s" % (str(p)[:22],ti))
