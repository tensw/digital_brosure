-- 대학 비교용 요약 — 운영 스키마(paper)는 건드리지 않는다.
CREATE SCHEMA IF NOT EXISTS bk21;

DROP TABLE IF EXISTS bk21.univ_work;
CREATE TABLE bk21.univ_work AS
WITH ua AS (
  SELECT a.work_id,
         CASE
           WHEN a.affiliation ~* 'sungkyunkwan|성균관'      THEN '성균관대'
           WHEN a.affiliation ~* 'seoul national'           THEN '서울대'
           WHEN a.affiliation ~* 'yonsei'                   THEN '연세대'
           WHEN a.affiliation ~* 'korea univ'               THEN '고려대'
           WHEN a.affiliation ~* 'hanyang'                  THEN '한양대'
           WHEN a.affiliation ~* 'kyung *hee|kyunghee'      THEN '경희대'
           WHEN a.affiliation ~* 'chung-?ang|chungang'      THEN '중앙대'
           WHEN a.affiliation ~* 'sogang'                   THEN '서강대'
         END AS un,
         a.openalex_id, a.orcid, a.name, a.pos, a.is_corr
  FROM paper.oa_work_author a
  WHERE a.affiliation IS NOT NULL
    AND a.affiliation ~* 'sungkyunkwan|성균관|seoul national|yonsei|korea univ|hanyang|kyung *hee|kyunghee|chung-?ang|chungang|sogang'
)
SELECT ua.un, w.work_id, w.pub_year, w.field, w.journal_name,
       w.cited_by, w.fwci, w.is_oa,
       ua.openalex_id, ua.orcid, ua.name, ua.pos, ua.is_corr
FROM ua
JOIN paper.oa_work w ON w.work_id = ua.work_id
WHERE ua.un IS NOT NULL
  AND w.pub_year BETWEEN 2015 AND 2026;

CREATE INDEX univ_work_un_yr ON bk21.univ_work (un, pub_year);
CREATE INDEX univ_work_aid   ON bk21.univ_work (openalex_id);
CREATE INDEX univ_work_wid   ON bk21.univ_work (work_id);
ANALYZE bk21.univ_work;
SELECT un, count(*) rows, count(DISTINCT work_id) works, count(DISTINCT openalex_id) authors
FROM bk21.univ_work GROUP BY un ORDER BY works DESC;
