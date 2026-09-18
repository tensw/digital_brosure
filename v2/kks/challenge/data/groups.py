"""한국 기관 표시명(OpenAlex affiliation) → 대학 그룹 사전. 순서대로 첫 매치. 근거: kr_affiliations_sample1pct.json (2026-09-18)"""
import re
GROUP_RULES=[  # (그룹, 포함 정규식, 제외 정규식)
 ("서울대", r"^Seoul National University", r"Science and Technology|of Education"),
 ("연세대", r"^Yonsei University|Severance", None),
 ("성균관대", r"^Sungkyunkwan University|^Samsung Medical Center|^Kangbuk Samsung|^Samsung Changwon|^Samsung Seoul Hospital", None),
 ("가톨릭대", r"Catholic University of Korea|^Catholic Medical Center$|^Saint Vincent's Catholic Medical Center", r"Daegu Catholic|Kwandong|Catholic University of Pusan"),
 ("울산대", r"^University of Ulsan|^Asan Medical Center|^Ulsan College$|^Ulsan University Hospital", None),
 ("고려대", r"^Korea University( Medical Center| .*Hospital)?$|^Korea University (Anam|Guro|Ansan)", r"Technology and Education|Science and Technology|International Studies"),
 ("경희대", r"^Kyung Hee University", None),
 ("한양대", r"^Hanyang University", r"Cyber|Women"),
 ("아주대", r"^Ajou University", None),
 ("경북대", r"^Kyungpook National University", None),
 ("부산대", r"^Pusan National University", None),
 ("전남대", r"^Chonnam National University", None),
 ("충남대", r"^Chungnam National University", None),
 ("전북대", r"^Jeonbuk National University|^Chonbuk National University", None),
 ("인제대", r"^Inje University", None),
 ("이화여대", r"^Ewha Womans University", None),
 ("중앙대", r"^Chung-Ang University", None),
 ("순천향대", r"^Soonchunhyang University", None),
 ("가천대", r"^Gachon University", None),
 ("한림대", r"^Hallym University|Sacred Heart Hospital$", r"Polytechnic|^Sacred Heart Hospital$"),
 ("건국대", r"^Konkuk University", None),
 ("차의과학대", r"^CHA University|^CHA Bundang|^Bundang CHA|^CHA Medical Center", None),
 ("계명대", r"^Keimyung University", None),
 ("인하대", r"^Inha University", r"Technical College|Tashkent"),
 ("경상국립대", r"^Gyeongsang National University", None),
 ("제주대", r"^Jeju National University", None),
 ("강원대", r"^Kangwon National University", None),
 ("영남대", r"^Yeungnam University", r"College$"),
 ("조선대", r"^Chosun University", None),
 ("충북대", r"^Chungbuk National University", None),
 ("동아대", r"^Dong-A University", None),
 ("원광대", r"^Wonkwang University", None),
 ("단국대", r"^Dankook University", None),
 ("고신대", r"^Kosin University", None),
 ("을지대", r"^Eulji|Eulji Medical Center", None),
 ("건양대", r"^Konyang University", None),
 ("가톨릭관동대", r"^Catholic Kwandong University", None),
 ("대구가톨릭대", r"^Daegu Catholic University", None),
 ("동국대", r"^Dongguk University", None),
]
KR_ANY=re.compile(r"\bKorea\b|\(South Korea\)|Seoul|Busan|Daegu|Incheon|Gwangju|Daejeon|Ulsan|Sejong|KAIST|Advanced Institute of Science and Technology|Pohang|Gyeong|Chung|Jeon|Kyung|Sook|Sogang|Dongguk|Kookmin|Hongik|Kwangwoon|Myongji|Kyonggi|Hanyang|Ajou|Inha|Gachon|Hallym|CHA University|Keimyung|Wonkwang|Dankook|Kosin|Eulji|Konyang|Jeju|Kangwon|Yeungnam|Chosun|Samsung|Yonsei|Severance|Asan|Sungkyunkwan|Catholic University of Korea|Inje|Paik|Soonchunhyang|Ewha|Konkuk|Sacred Heart Hospital|Gil Medical|Dongsan|Ilsan|Bundang|Hwasun|Yangsan|Chilgok|Uijeongbu|Bucheon|Yeouido|Eunpyeong|Mokdong|Gwangmyeong", re.I)
KR_NOT=re.compile(r"Pakistan|Uzbekistan|Tajikistan|Panama|North Korea|Kista|Logistic|Newham|Sacred Heart College|Sacred Heart University|University of the Sacred Heart|Hasanuddin|Zhetysu|Chung Yuan|Chung Hua|Chung Shan|Chungbuk Health|Norway|Finnish|Saarland|Ontario|Thailand|Australasia|Communist|Rajamangala|Gnanamani|Fraunhofer|Kühne|Poznan|Wrocław|Trisakti|Soegijapranata|Atma Jaya|Parahyangan|Maule|Lublin|Eichstätt|Fu Jen|Bharathidasan|Maiduguri|Nagpur|Binhai|Khorasan|Lansana", re.I)
def group_of(aff):
    if not aff: return None
    for g,inc,exc in GROUP_RULES:
        if re.search(inc,aff) and not (exc and re.search(exc,aff)): return g
    return None
def is_korea(aff):
    if not aff: return False
    if group_of(aff): return True
    return bool(KR_ANY.search(aff)) and not KR_NOT.search(aff)
if __name__=="__main__":
    import json
    inv=json.load(open("kr_affiliations_sample1pct.json"))
    from collections import Counter
    c=Counter(); other=[]
    for r in inv:
        g=group_of(r["affiliation"])
        if g: c[g]+=r["n"]
        elif is_korea(r["affiliation"]): other.append((r["n"],r["affiliation"]))
    for g,n in c.most_common(): print(f"{n:>6} {g}")
    print("-- 기타 한국(상위 20):", other[:20])
    print("-- 비한국 판정(상위 15):", [(r["n"],r["affiliation"]) for r in inv if not is_korea(r["affiliation"])][:15])
