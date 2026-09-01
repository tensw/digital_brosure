# AI 관련 논문 추출 규칙

정리 2026-09-01 · 기준 SGCPI+ 배점표(2026) · 대상 BK21 보드 `/bk21/board/`

SGCPI+ 의 **RQ · AI 관련 논문(1점)** 을 우리 논문 데이터에서 뽑는 규칙이다.
매뉴얼은 범위만 열어 두고(«학술지 구분 없이 전체 인정») 판정 기준은 비워 두었다.
그 기준을 여기서 정한다.

## 0. 배점 규칙 (매뉴얼 그대로)

- 논문 **1편 = 1점 고정**. 저널등급과 무관
- **역할가중을 쓰지 않는다.** 주저자든 공저자든 1점
- **학술지 지표와 중복된다.** 같은 논문이 등급 점수와 AI 1점을 둘 다 받는다
- 따라서 화면에서 **환산점수와 별도 칸**으로 센다. 합치면 이중계산이 된다

## 1. 무엇을 보고 판정하나

우리 데이터에는 **제목과 게재지명**이 있다. 분야 분류는 사실상 비어 있어(값 9종) 쓰지 못한다.
초록과 키워드도 없다. 그래서 **제목 + 게재지명** 두 문자열만으로 판정한다.

판정 대상 문자열 = `제목 + " || " + 게재지명`

## 2. 판정 순서

```
1군(강한 말)에 걸리면           → 자동 인정
2군(약한 말)에 걸리면
   ├ 제외조건에 걸리면          → 제외
   ├ 문맥조건에 걸리면          → 자동 인정
   └ 둘 다 아니면              → 회색 (사람이 확인)
아무것도 안 걸리면              → 해당 없음
```

대소문자를 가리지 않는다. `\b` 는 낱말 경계다.

## 3. 1군 — 그 말만으로 인정 (문맥을 보지 않는다)

```
deep learning · machine learning · artificial intelligence · neural network
LLM · large language model · reinforcement learning · convolutional
CNN · RNN · LSTM · GAN · BERT · GPT · ViT
foundation model · transfer learning · federated learning
self-supervised · semi-supervised · unsupervised learning · supervised learning
contrastive learning · generative model · diffusion model · computer vision
few-shot · zero-shot · natural language processing · NLP
explainable AI · XAI · knowledge distillation
딥러닝 · 머신러닝 · 기계학습 · 인공지능 · 심층학습 · 신경망 · 생성형
```

## 4. 2군 — 문맥을 봐야 하는 말

이 말들은 **다른 뜻으로 더 많이 쓰인다.** 성균관대에 전력·전자·화학 연구가 많아
그냥 잡으면 절반 넘게 헛짚는다.

### 4-1. `transformer`

| | 조건 |
|---|---|
| **제외** | converter · winding · voltage · LLC · planar · tapped · solid-state · neutral · feeder · relay · kVA · kW · resonant · charger · inductor · transformerless |
| **인정** | vision · swin · graph · attention · encoder · decoder · pretrain · token · language · segmentation · detection · classification · estimation · pose · -based · prediction · recognition |

제외 쪽은 전부 **변압기**다. 실측에서 25건이 걸렸고 전수가 변압기였다.

### 4-2. `attention`

| | 조건 |
|---|---|
| 제외 | 없음 |
| **인정** | mechanism · self- · cross- · multi-head · -based · -aided · fusion · network · module · map · multiscale · multi-scale |

`attention` 은 하이픈 복합어로 쓰이면 대부분 AI 다.

### 4-3. `AI`

| | 조건 |
|---|---|
| **인정** | model · learning · system · based · driven · algorithm · agent · generative · assisted |

두 글자라 우연히 걸리는 일이 잦다. 반드시 짝이 되는 말이 있어야 한다.

### 4-4. `agent`

| | 조건 |
|---|---|
| **제외** | blowing agent · contrast agent · antibacterial · reducing agent · chemical agent · foaming agent · coupling agent · oxidizing agent |
| **인정** | LLM · language · autonomous · multi-agent · reinforcement · intelligent |

제외 쪽은 화학 시약이다.

## 5. 실측 결과

논문 **30,872건**(제목·게재지명이 있는 전수)에 돌린 결과.

| 판정 | 건수 | 비율 |
|---|---:|---:|
| 자동 인정 | 1,713 | 5.55% |
| 회색 · 사람 확인 | 108 | 0.35% |
| 제외(문맥) | 25 | 0.08% |
| 해당 없음 | 29,026 | 94.02% |

**회색이 108건이다.** 사람이 하루면 다 본다. 이 정도가 목표다.

### 걸러진 것 (제외 25건 전수 확인)

전부 변압기와 화학 시약이었다. 오분류 없음.

```
Design Methodology of a Planar Transformer in LLC Converters
A 2-GHz Reconfigurable Transmitter Using … Multi-Tapped Transformer
A Study on the Impact of AC Transformer due to Shared AC/DC Neutral Line
Hosting capacity improvement method using MV-MV solid-state-transformer
Laser-assisted micro/nano-porous patterning with blowing agent
```

### 남은 회색 (표본)

```
Hierarchical Transformer for Brain Computer Interface        → AI 로 보임
Error Correction Code Transformer for Short Block Codes      → AI 로 보임
Dispersion-assisted carbon nanotubes as a conductive agent   → 화학, 제외해야
High-frequency Transmission … Potential Transformer          → 변압기, 제외해야
AI 채팅로봇 «이루다» 개인정보 침해 사건                        → 법학 논문. 판단 필요
```

법학·정책 논문이 AI 를 **소재로** 다루는 경우는 별도 판단이 필요하다.
매뉴얼이 «학술지 구분 없이 전체 인정» 이라 했으므로 넓게 보는 것이 취지에 맞지만,
「AI 역량」을 재는 지표라는 점에서는 어긋난다. 학교에 확인할 사항으로 남긴다.

## 6. 남겨야 할 것

논문마다 **왜 AI 로 봤는지**를 함께 저장한다.

```
ai_flag      auto | gray | block | no
ai_rule      걸린 규칙 (예: "transformer(문맥)")
ai_checked   회색을 사람이 확인한 결과 (인정 | 제외 | 미확인)
ai_checked_by, ai_checked_at
```

근거가 없으면 나중에 왜 그 숫자가 나왔는지 설명하지 못한다.
저자매칭에서 쓰는 방식과 같다. 확실한 것은 자동, 애매한 것만 사람에게.

## 7. 규칙을 고칠 때

1. 새 말을 넣기 전에 **전수에 돌려 보고** 자동·회색·제외 건수를 확인한다
2. 회색이 300건을 넘으면 문맥조건이 모자란 것이다
3. 제외가 늘면 표본을 전수로 열어 오분류가 없는지 본다
4. 고친 날짜와 사유를 이 문서에 남긴다

## 8. 우리가 못 만드는 AI 지표

SGCPI+ 의 AI 관련 지표 6개 중 **논문 하나만** 우리 데이터로 낼 수 있다.

| 지표 | 점수 | 우리 |
|---|---|---|
| RQ · AI 관련 논문 | 1 | **이 규칙으로 산출** |
| RQ · AI 관련 수상 | 1 | 미수집 |
| LQ · 도전학기(교과) AI | 1.5 | 미수집 (학사) |
| LQ · AI 교과 이수 | 1 (AI관련학과 0.5) | 미수집 (학사) |
| IQ · 비교과 AI | 1.5 | 미수집 (챌린지스퀘어) |
| IQ · AI 역량개발 활동 | 1 | 미수집 |

### AI관련학과 12곳 (매뉴얼 명시 · AI 교과 이수가 0.5점)

데이터사이언스융합학과 · 인공지능학과 · 소프트웨어학과 · 인공지능융합학과 ·
인간AI인터랙션융합전공 · 지능형소프트웨어학과 · AI시스템공학과 ·
전자전기컴퓨터공학과 · DMC공학과 · 지능형로봇학과 · 지능형정밀헬스케어융합전공
