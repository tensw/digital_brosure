# -*- coding: utf-8 -*-
# 하는 일: 떼어낸 CSS 를 .rpwrap 스코프로 감싸고 충돌 클래스에 접두사를 단다
"""원본 CSS 를 .rpwrap 아래로 스코프한다.
   @media 를 평탄화하지 않는다 — 슬라이드 23~26 에서 그렇게 하다 레이아웃이 무너졌다."""
import re, sys
SP="/private/tmp/claude-501/-Users-karis-dev-biblo-rims-front/9d99337a-c669-4c91-b528-cfc7c84b97fe/scratchpad"
css=open(f"{SP}/perf.css",encoding='utf-8').read()
css=re.sub(r'/\*.*?\*/', '', css, flags=re.S)          # 주석이 셀렉터로 잡힌다. 먼저 걷어낸다.

DROP={'body','html','.slide','.wrap','.kicker','.spacer','.picks','.pick','*','#stage',
      '.emb-bg0','.emb-bg0 body','.emb-bg0 .slide','h1','h1 span','.lead','.lead b','.foot'}
def scope_sel(sel):
    out=[]
    for one in sel.split(','):
        one=one.strip()
        if not one: continue
        if one in DROP or one.startswith('@'): continue
        if one.startswith(':root'):            # 변수는 래퍼로 옮긴다
            out.append('.rpwrap'); continue
        if one.startswith('.rpwrap'): out.append(one); continue
        out.append('.rpwrap '+one)
    return ', '.join(out)

def walk(text):
    res=[]; i=0
    while i < len(text):
        b=text.find('{', i)
        if b<0: res.append(text[i:]); break
        head=text[i:b].strip()
        # 블록 끝 찾기
        depth=0; j=b
        while j < len(text):
            if text[j]=='{': depth+=1
            elif text[j]=='}':
                depth-=1
                if depth==0: break
            j+=1
        body=text[b+1:j]
        if head.startswith('@media') or head.startswith('@supports'):
            res.append(head+'{'+walk(body)+'}')
        elif head.startswith('@'):
            res.append(head+'{'+body+'}')          # @keyframes 등 그대로
        else:
            s=scope_sel(head)
            if s: res.append(s+'{'+body+'}')
        i=j+1
    return '\n'.join(res)

out=walk(css)
open(f"{SP}/perf.scoped.css","w",encoding='utf-8').write(out)
print(f"  스코프 완료 {len(out):,}자 · 규칙 {out.count('{')}개")
print(f"  @media 보존 {out.count('@media')}개 (원본 {css.count('@media')}개)")
