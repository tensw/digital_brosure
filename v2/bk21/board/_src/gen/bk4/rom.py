# -*- coding: utf-8 -*-
# 하는 일: 한글 성명을 로마자 이름골격으로 바꾼다
"""한글 → 로마자 (국어의 로마자 표기법 근사). 성씨는 관용 표기를 우선한다."""
CHO=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
JUNG=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
JONG=['','k','k','k','n','n','n','t','l','l','l','l','l','l','l','l','m','p','p','t','t','ng','t','t','k','t','p','t']
SURNAME={'김':'Kim','이':'Lee','박':'Park','최':'Choi','정':'Jung','강':'Kang','조':'Cho','윤':'Yoon',
 '장':'Jang','임':'Lim','한':'Han','오':'Oh','서':'Seo','신':'Shin','권':'Kwon','황':'Hwang','안':'Ahn',
 '송':'Song','류':'Ryu','전':'Jeon','홍':'Hong','고':'Ko','문':'Moon','양':'Yang','손':'Son','배':'Bae',
 '백':'Baek','허':'Heo','유':'Yoo','남':'Nam','심':'Shim','노':'Noh','하':'Ha','곽':'Kwak','성':'Sung',
 '차':'Cha','주':'Joo','우':'Woo','구':'Koo','민':'Min','진':'Jin','지':'Ji','엄':'Eom','채':'Chae',
 '원':'Won','천':'Chun','방':'Bang','공':'Kong','현':'Hyun','함':'Ham','변':'Byun','염':'Yeom',
 '여':'Yeo','추':'Chu','도':'Do','소':'So','석':'Seok','선':'Sun','설':'Seol','마':'Ma','길':'Gil',
 '위':'Wi','표':'Pyo','명':'Myung','기':'Ki','반':'Ban','왕':'Wang','금':'Keum','옥':'Ok','육':'Yook',
 '인':'In','맹':'Maeng','제':'Je','모':'Mo','장':'Jang','탁':'Tak','국':'Kook','여':'Yeo','편':'Pyun'}
def syl(ch):
    o=ord(ch)-0xAC00
    if o<0 or o>11171: return ch
    return CHO[o//588]+JUNG[(o%588)//28]+JONG[o%28]
def given(s):
    return ''.join(syl(c) for c in s).capitalize()
def rom(name):
    n=(name or '').strip()
    if not n or not any('가'<=c<='힣' for c in n): return n
    sur = SURNAME.get(n[0], syl(n[0]).capitalize())
    gv  = given(n[1:]) if len(n)>1 else ''
    return (sur+' '+gv).strip()
if __name__=='__main__':
    for x in ['김도일','이준신','신정근','박지용','강바다','최윤희','황정민','노단경']:
        print(f"  {x} → {rom(x)}")
