/* BK21 보고서 묶음 정의
   한 보고서 = 차트 여러 개. 차트 하나가 대시보드의 위젯 타일 하나가 된다.
   size: 그리드 칸 수 "가로x세로" (6열 그리드 기준)
   rid : SPEC.recipes / SPEC.answers 의 레시피 id            */
window.REPORTS = [
  {
    id: 'perf',
    title: '우리 성과는 어떤가',
    sub: '학교·계열·학과의 현재 수준과 최근 흐름',
    tag: '성과',
    tone: 'green',
    period: '2020–2025',
    lead: '학과별 생산량과 질을 같은 기간에 놓고 본다. 편수는 규모를 따라가므로 1인당과 등급 구성을 함께 읽는다.',
    charts: [
      { rid: 'gnb_tree',       size: '3x2', head: '학과별 논문이 어떻게 움직였나' },
      { rid: 'e01_dept_count', size: '3x2', head: '어느 학과가 얼마나 썼나' },
      { rid: 's02_qual_trend', size: '2x2', head: '양만 늘었나, 질도 늘었나' },
      { rid: 'e07_gy_trend',   size: '2x2', head: '어느 계열이 자라고 있나' },
      { rid: 'e06_gy_score',   size: '2x2', head: '계열별 환산점수' },
      { rid: 'e02_dept_role',  size: '3x1', head: '주도해서 쓰나, 이름만 올리나' },
      { rid: 'e03_dept_pct',   size: '3x1', head: 'JCR 상위 논문의 몫' }
    ]
  },
  {
    id: 'issue',
    title: '무엇이 문제인가',
    sub: '병목과 쏠림. 먼저 손댈 자리',
    tag: '진단',
    tone: 'amber',
    period: '2020–2025',
    lead: '낮은 성과와 기록이 덜 붙은 것은 처방이 다르다. 신호를 보기 전에 데이터 품질을 함께 확인한다.',
    charts: [
      { rid: 'n02_signal',        size: '3x2', head: '어느 학과가 처져 있나' },
      { rid: 'n03_twotrack',      size: '3x2', head: '교수 성과가 학생에게 이어지나' },
      { rid: 's03_concentration', size: '2x2', head: '성과가 몇 사람에게 몰렸나' },
      { rid: 's04_stu_spread',    size: '2x2', head: '학생 성과가 몇 명에게 있나' },
      { rid: 'n01_area',          size: '2x2', head: '세 계열 중 어디가 약한가' },
      { rid: 'n05_partnerdist',   size: '3x1', head: '몇 사람이 협업을 떠받치나' }
    ]
  },
  {
    id: 'uni',
    title: '누구와 견주면 어디인가',
    sub: '국내 7개교 · BK21 8개교 · 아시아 · 글로벌',
    tag: '비교',
    tone: 'blue',
    period: '2020–2025',
    lead: '규모와 질은 다른 축이다. 편수 순위와 파급력 순위를 나란히 놓고 본다.',
    charts: [
      { rid: 'e17_uni_rank',      size: '3x2', head: '국내 7개교에서 우리 자리' },
      { rid: 's01_uni_field',     size: '3x2', head: '앞서는 분야와 뒤처지는 분야' },
      { rid: 'e18_uni_year',      size: '3x2', head: '대학별로 어떻게 움직였나' },
      { rid: 'n18_quality_rank',  size: '3x2', head: '편수 말고 질은 어디쯤인가' },
      { rid: 'n10_intl_dom',      size: '2x2', head: '국제지와 국내지를 나눠 보면' },
      { rid: 'e20_uni_bk',        size: '2x2', head: 'BK21 참여 규모' },
      { rid: 'n14_asia',          size: '2x2', head: '아시아에서 우리 위치' }
    ]
  },
  {
    id: 'net',
    title: '누구와 연결할 수 있나',
    sub: '교내 기존 관계 · 교외 접점 · 무접점 후보',
    tag: '관계',
    tone: 'teal',
    period: '2020–2025',
    lead: '이미 맺은 관계와 아직 없는 관계를 나눠 본다. 관계는 참여자 쪽에서 세므로 교내 관계는 양쪽 학과에서 한 번씩 센다.',
    charts: [
      { rid: 'n20_netmap',      size: '3x2', head: '학과 협업 지도' },
      { rid: 'e21_net_dept',    size: '3x2', head: '어느 학과끼리 붙어 있나' },
      { rid: 'n07_netsize',     size: '2x2', head: '밖과 얼마나 넓게 닿아 있나' },
      { rid: 's06_partner_mix', size: '2x2', head: '넓게 만나나, 오래 만나나' },
      { rid: 's07_ext_new',     size: '2x2', head: '교외 관계가 새로 생기나' },
      { rid: 's07b_ext_dur',    size: '3x1', head: '교외 협력이 얼마나 이어지나' },
      { rid: 'n04_relscope',    size: '3x1', head: '교내에서 도나, 밖으로 나가나' }
    ]
  },
  {
    id: 'trust',
    title: '이 숫자를 믿어도 되나',
    sub: '커버리지 · 미판정 · 검토 대상',
    tag: '신뢰',
    tone: 'slate',
    period: '2020–2025',
    lead: '값 옆에 품질을 같이 둔다. 미판정은 실적 없음이 아니라 등급을 못 붙인 상태다.',
    charts: [
      { rid: 'e23_qa_all',    size: '3x2', head: '전체 데이터 품질' },
      { rid: 'gnb_pool',      size: '3x2', head: '학과별 커버리지와 미판정' },
      { rid: 'e24_qa_dept',   size: '2x2', head: '어느 학과가 기록이 덜 붙었나' },
      { rid: 's11_fix_first', size: '2x2', head: '무엇부터 고치면 판단이 달라지나' },
      { rid: 'e25_qa_grade',  size: '2x2', head: '등급을 못 붙인 몫' },
      { rid: 'n13_measurable', size: '3x1', head: '경쟁대학을 어디까지 잴 수 있나' }
    ]
  },
  {
    id: 'ai',
    title: 'AI 연구는 어디까지 왔나',
    sub: '신설 배점이 겨냥한 자리',
    tag: 'AI',
    tone: 'violet',
    period: '2020–2025',
    lead: 'AI 판정은 제목·게재지명의 용어 규칙으로 한다. 회색 107건은 사람 확인 대기.',
    charts: [
      { rid: 'e14_ai_year',   size: '3x2', head: 'AI 논문이 늘고 있나' },
      { rid: 's09_ai_lead',   size: '3x2', head: '참여만 하나, 주도하나' },
      { rid: 'e04_dept_ai',   size: '3x2', head: '어느 학과가 AI를 하고 있나' },
      { rid: 'new_ai_grade',  size: '3x1', head: 'AI 논문이 좋은 저널에 실리나' }
    ]
  },
  {
    id: 'people',
    title: '사람과 분야로 찾기',
    sub: '연구그룹 · 분야 · 잠재 파트너',
    tag: '탐색',
    tone: 'green',
    period: '2020–2025',
    lead: '분야는 논문 한 건마다 붙어 있지 않다. 학과·대학 단위 집계로만 있으므로 합계가 논문 수보다 많다.',
    charts: [
      { rid: 'new_group',      size: '3x2', head: '연구그룹별로 어디가 강한가' },
      { rid: 'e10_field_dept', size: '3x2', head: '학과 이름과 실제 분야가 맞나' },
      { rid: 'new_hss_field',  size: '2x2', head: '인문사회는 어느 분야에 있나' },
      { rid: 'e22_net_field',  size: '2x2', head: '이 분야로 같이 할 사람' },
      { rid: 'e12_journal_dept', size: '2x2', head: '주로 어디에 싣나' },
      { rid: 'e16_stu_first',  size: '3x1', head: '학생이 주저자로 쓰고 있나' }
    ]
  }
];
