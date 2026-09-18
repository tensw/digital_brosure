# data/ — 국내 대학별 난제 연구 성과 기초데이터 파일 설명

모든 파일은 같은 수집·집계에서 나왔으며 대시보드(`../index.html`)와 보고서(`../report.html`)가 쓰는 원본입니다. 값은 해석 없이 제공하며, 잣대가 다른 기법(PubMed MeSH+초록 / 덤프 제목 키워드 K / 덤프 주제명 T)의 편수를 서로 직접 비교하지 마십시오.

| 파일 | 내용 | 열·키 |
|---|---|---|
| `indicators_2021-2025.csv` | 대학 × 카테고리 지표표(정의서 기본 기간) | group, core15, category, track, category_name, window, n_pubmed, share_kr_pct, activity_index, growth_pct_2125_vs_1620, n_dump_K, n_dump_T, world_share_permille_K, fwci_mean_K, fwci_mean_T, fwci_ge2_pct_K |
| `indicators_2016-2025.csv` | 같은 지표표, 기간 2016–2025(덤프 지표는 2020–2025) | 위와 같음 |
| `pubmed_yearly.csv` | PubMed 연도별 건수(long) | category(ALL=카테고리 조건 없음), scope(대학 22·KR·WORLD), year, count |
| `works_2020-2025.csv` | 논문 단위(OpenAlex 덤프, 22개 대학, 2020–2025). 한 논문이 여러 카테고리에 속하면 행이 반복됨 | work_id, doi, title, journal, year, group, category, methods(K/T/KT), fwci, cited_by |
| `categories.csv` | 카테고리 사전 | code, name, track(M/R/P), group, pubmed_query, dump_title_tsquery, openalex_topics, note |
| `groups.csv` | 대학 그룹 사전(대학+부속병원) | group, core15, dump_affiliation_names, pubmed_affiliation_terms, openalex_lineage_ids |
| `dashboard_data.json` | 집계 JSON 전체 | meta(built, basis 집계 대상, cat_version), groups, categories, pubmed[cat][scope][연도], dump[cat][K/T][scope]{n, fwci_mean, n_fwci2, cites, n_null} |
| `pubmed_counts.json` | PubMed 건수 원자료 | 키 `카테고리|범위|연도` |
| `verification.json` | 원자료 독립 재계산 값(대시보드 수치 검증) | checks[{key,label,value}] |

## 지표 산식
- 편수: 조회식에 걸린 논문 수(공저 논문은 관련 대학마다 1편).
- 국내 점유율(%) = 대학 편수 ÷ 한국(Korea[ad]) 편수 × 100 (PubMed).
- 활동지수(Activity Index) = (대학 카테고리 편수 ÷ 대학 전체 편수) ÷ (한국 카테고리 편수 ÷ 한국 전체 편수). 1.0 = 국내 평균.
- 성장률(%) = 2021–2025 합계 ÷ 2016–2020 합계 − 1 (PubMed).
- 세계 점유율(‰) = 대학 편수 ÷ 세계 편수 × 1000 (덤프 K, 같은 조회식).
- FWCI 평균 = OpenAlex Field-Weighted Citation Impact 산술평균(결측 제외), 1.0 = 세계 평균. FWCI≥2 비중(%) = FWCI 2 이상 논문 ÷ FWCI 있는 논문 × 100.

## 원천·기간·문서유형
- PubMed E-utilities esearch(datetype=pdat), 2026-09-18 조회. 카테고리 = MeSH + 제목·초록 키워드, 기관 = 소속 문구([ad]). 문서유형 제외: editorial, letter, comment, news, erratum, retraction.
- OpenAlex works 덤프(2020–2025, CC0). 기관 = 저자 소속 표시명 정확 일치(대학+부속병원). 학회초록·보충자료 레코드(제목이 `Abstract ####:`, `Additional file`, `Supplementary` 등)는 논문 단위 집계에서 제외.
- 카테고리 조회식 버전은 `dashboard_data.json`의 `meta.cat_version`과 `categories.csv`에 기록.

## 라이선스·출처 표기
OpenAlex 데이터는 CC0, PubMed 건수는 미국 국립의학도서관 공개 API 결과입니다. 이 폴더의 파생 파일은 출처(대시보드 URL)와 기준일을 밝히고 자유롭게 재사용할 수 있습니다.
