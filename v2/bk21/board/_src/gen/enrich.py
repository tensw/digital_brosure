# -*- coding: utf-8 -*-
# 하는 일: 트리에 신설 필드를 붙여 bk21_tree_final.json 을 만든다
"""RQ 세부지표 부착 — AI 논문 판정 · 학술대회 국제/국내 구분"""
import json, re, collections
SRC="/Users/karis/dev/biblo_rims_aws/bk21-src/bk21_tree.json"

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
 r'\battention\b': dict(need=[r'mechanism|self-|cross-|multi-head|-based|-aided|fusion|network|module|map|multiscale|multi-scale'], block=[]),
 r'\bAI\b': dict(need=[r'model|learning|system|based|driven|algorithm|agent|generative|assisted'], block=[]),
 r'\bagent\b': dict(need=[r'\bLLM\b|language|autonomous|multi-agent|reinforcement|intelligent'],
   block=[r'blowing agent|contrast agent|antibacterial|reducing agent|chemical agent|foaming agent|coupling agent|oxidizing agent']),
}
def ai_cls(title, jour):
    s=(title or '')+" || "+(jour or '')
    for p in STRONG:
        if re.search(p,s,re.I): return 1,p
    for p,cfg in WEAK.items():
        if re.search(p,s,re.I):
            if any(re.search(b,s,re.I) for b in cfg["block"]): return 0,'제외:'+p
            if any(re.search(n,s,re.I) for n in cfg["need"]):  return 1,p+'(문맥)'
            return 2,p+'(회색)'
    return 0,None

# 국내 학술대회 판별 — 한글 게재지이거나 한국·대한·Korea(n) Society 류
HANGUL=re.compile(r'[가-힣]')
DOMESTIC=re.compile(r'한국|대한|Korean?\s+(Society|Institute|Association|Conference|Academy)'
                    r'|Korea\s+(Conference|Symposium)|KCC|KSC\b', re.I)
def conf_scope(j):
    j=j or ''
    if HANGUL.search(j) or DOMESTIC.search(j): return '국내',1
    return '국제',2

def main():
    d=json.load(open(SRC))
    ac=collections.Counter(); cc=collections.Counter()
    for pl in d['papers'].values():
        for x in pl:
            a,why = ai_cls(x.get('t'), x.get('j'))
            x['ai']=a
            if why: x['air']=why
            ac[a]+=1
            if x.get('tr')=='P':
                sc,pt = conf_scope(x.get('j'))
                x['cf']=sc; x['cfp']=pt; cc[sc]+=1
            else:
                x.pop('cf',None); x.pop('cfp',None)
    json.dump(d, open(SRC,'w'), ensure_ascii=False, separators=(',',':'))
    tot=sum(ac.values())
    print("══ 1  AI 논문 판정 ══")
    for k,lab in [(1,'자동 인정'),(2,'회색 · 사람 확인'),(0,'해당 없음/제외')]:
        print(f"  {lab:16s} {ac[k]:6d}건  {ac[k]/tot*100:5.2f}%")
    print("\n══ 2  학술대회 국제/국내 ══")
    for k,v in cc.most_common():
        print(f"  {k}  {v:5d}건  ({2 if k=='국제' else 1}점)")
main()
