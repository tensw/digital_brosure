# 난제 연구 기초데이터 — 희귀질환·의학 문샷 난제 × 국내 상위 15개 대학 (2020–2025)

- 배포: https://biblo.ai/kks/challenge
- `index.html` 대시보드(단일 파일) · `papers.json` 논문 단위 데이터(비교군 15개 대학 소속, 15,420편)
- `docs/` 기준서 1차(정의·카테고리·조회식·참고문헌) · 비교군 선정(순위 근거) · 지표 설계 · OpenAlex 덤프 검증
- `data/` 집계(aggregate.json) · PubMed MeSH 교차 집계(2006–2025) · 카테고리 조회식(categories_v0.py) · 대학 그룹 사전(groups.py)

데이터원: OpenAlex 덤프(2020–2025) 제목 키워드 조회 + PubMed E-utilities MeSH 교차. 조회식은 v0 초안으로 정밀도 검증(200건·80%) 전이다. 2026-09-18.
