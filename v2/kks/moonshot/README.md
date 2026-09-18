# 국내 대학별 난제 연구 성과 기초데이터 (moonshot)

희귀질환(트랙 R)과 의학 문샷 난제 카테고리 초안 v0(M1~M11)에 대해 병원·의과대학 보유 국내 대학 22곳(핵심 비교군 15곳)의 논문 성과를 두 원천에서 같은 조회식으로 집계한 정적 대시보드.

- `index.html` — 대시보드(단일 파일, 데이터 내장). 탭: 개요 → 기준·카테고리 → 대학×카테고리 → 카테고리 상세 → 대학 상세 → 방법·출처 → 데이터
- `data/dashboard_data.json` — 집계 데이터(연도별 편수·FWCI 평균·FWCI≥2 수·피인용, 세계·한국 합계, 카테고리·대학 사전)
- `data/works_2020-2025.csv` — 논문 단위 데이터(OpenAlex 덤프 2020–2025: work_id, doi, title, journal, year, group, category, methods(K=제목 키워드, T=주제명), fwci, cited_by)
- `data/pubmed_counts.json` — PubMed E-utilities 건수 원자료(키 `카테고리|범위|연도`)

원천: PubMed E-utilities(2026-09-18 조회) · OpenAlex works 덤프(2020–2025, CC0). 지표 산식·조회식·한계·참고문헌은 대시보드의 ⑥ 방법·출처 탭에 있다. 생성 파이프라인은 비공개 레포에서 관리한다.
