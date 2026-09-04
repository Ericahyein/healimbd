# 홈페이지 명시 전체 질환 1:1 Dry-run QA 시스템 구축 계획

## 1. 개요 및 배경

현재 해아림한의원 분당점의 AI 의학 칼럼 발행 파이프라인은 틱장애(`tic`) 및 미디어 노출(`media-exposure`) 주제에 대해 Dry-run 품질 검증을 완료했습니다.
그러나 실제 웹사이트에는 12개 대분류 카테고리 내에 여러 세부 질환 및 증상(예: 우울증과 강박증, 틱장애와 뚜렛증후군, 불안장애와 사회공포증, 소아 ADHD와 성인 ADHD 등)이 환자에게 각각 독립적으로 노출되고 있습니다.

따라서 단편적인 카테고리 테스트가 아니라, **홈페이지에 실제로 명시된 모든 개별 질환/증상**을 1:1로 구분하여 최소 1회씩 순차 Dry-run QA를 진행할 수 있는 전용 QA 인프라를 구축합니다.

---

## 2. User Review Required (중요 확인 사항)

> [!IMPORTANT]
> **안전 원칙 및 차단 정책 유지**:
> - `AUTO_COLUMN_ENABLED=false`를 유지하며, 프로덕션 자동 발행 및 스케줄 발행은 계속 차단됩니다.
> - 이번 단계에서는 OpenAI API 비용이 다량 발생하는 전체 질환 AI 일괄 생성을 수행하지 않고, **QA 타겟 매트릭스 정의 및 1건씩 안전하게 실행할 수 있는 QA 시스템만 구축**합니다.
> - QA 실행(Dry-run)은 프로덕션 이력(`data/auto_column_history.json`) 및 90일/3일 쿨다운에 일체 영향을 주지 않으며, 전용 QA 이력(`data/auto_column_qa_results.json`)에 분리 기록됩니다.
> - AI나 검증기가 통과(PASS)하더라도 사람의 검토 상태(`humanReviewStatus`)는 자동으로 `approved`로 바뀌지 않으며, 원장님/사용자의 직접 승인 전까지 `generated`로 유지됩니다.

---

## 3. 홈페이지 실제 전체 질환 목록 및 QA Target Matrix

홈페이지 소스코드(`layouts/index.html`, `layouts/treatments/list.html`, `layouts/blog/list.html`, `layouts/inquiry/list.html`, `disease_taxonomy.json`, `medical_knowledge/*.json`)를 전수 조사한 결과, 환자에게 노출되는 개별 질환 및 추천 QA Target은 **총 18개**입니다.

| 순서 | qaId | 개별 질환/증상명 | categoryId | 대표 TopicAngle | focus 핵심 | ageGroup | 권장 지역 (Geo) | 초기 상태 |
|:---:|:---|:---|:---:|:---|:---|:---:|:---|:---:|
| 1 | `qa-01-tic` | **소아 틱장애** | `tic` | `media-exposure` | 미디어·스마트폰 자극과 틱 증상 악화 | `child` | 성남 분당 | **approved** (완료) |
| 2 | `qa-02-panic` | **공황장애** | `panic` | `sudden-palpitation` | 갑작스러운 두근거림·호흡곤란과 초기 공황 | `adult` | 성남 분당 | `not_tested` |
| 3 | `qa-03-adhd-child` | **소아 ADHD** | `adhd` | `child-impulsivity` | 산만함과 충동성 조절 / 실행기능 | `child` | 용인 수지 | `not_tested` |
| 4 | `qa-04-sleep` | **불면증** | `sleep` | `early-awakening` | 잠은 드는데 새벽마다 깨는 수면유지장애 | `adult` | 성남 판교 | `not_tested` |
| 5 | `qa-05-autonomic` | **자율신경실조증** | `autonomic` | `digestive-dizziness` | 원인 모를 어지럼증과 소화불량 동시 발현 | `adult` | 성남 분당 | `not_tested` |
| 6 | `qa-06-anxiety` | **불안장애** | `anxiety` | `chronic-worry` | 사소한 일에도 꼬리를 무는 걱정과 만성 긴장 | `adult` | 용인 기흥 | `not_tested` |
| 7 | `qa-07-hyperhidrosis` | **다한증** | `hyperhidrosis` | `hands-feet-sweat` | 긴장 시 손발 축축함과 자율신경 조절 | `mixed` | 성남 분당 | `not_tested` |
| 8 | `qa-08-ibs` | **과민성대장증후군** | `ibs` | `morning-diarrhea` | 출근길·긴장 시 화장실 / 장-뇌 축 안정 | `adult` | 수원 영통 | `not_tested` |
| 9 | `qa-09-syncope` | **미주신경성 실신** | `syncope` | `subway-dizziness` | 대중교통 내 눈앞 캄캄함과 실신 전조증상 | `mixed` | 성남 분당 | `not_tested` |
| 10 | `qa-10-headache` | **두통** | `headache` | `tension-headache` | 뒷목 조임과 뻐근한 긴장성·경추성 두통 | `adult` | 성남 중원 | `not_tested` |
| 11 | `qa-11-dizziness` | **어지럼증** | `headache` | `chronic-dizziness` | 이비인후과 이상 없는 붕 뜨는 비회전성 어지럼 | `adult` | 성남 분당 | `not_tested` |
| 12 | `qa-12-depression` | **우울증** | `depression` | `burnout-lethargy` | 번아웃, 만성 무기력 및 의욕 저하 지속 | `adult` | 경기 광주 | `not_tested` |
| 13 | `qa-13-ocd` | **강박증/OCD** | `depression` | `intrusive-thoughts` | 침투적 불안 사고와 반복 확인 행동 | `adult` | 성남 분당 | `not_tested` |
| 14 | `qa-14-social-phobia` | **사회공포증** | `anxiety` | `presentation-anxiety` | 발표·시선 공포와 대인관계 긴장 | `adult` | 성남 수정 | `not_tested` |
| 15 | `qa-15-separation-anxiety` | **소아 분리불안** | `child` | `separation-anxiety` | 등교·등원 전 복통 호소와 양육자 분리불안 | `child` | 용인 수지 | `not_tested` |
| 16 | `qa-16-adhd-adult` | **성인 ADHD** | `adhd` | `adult-work-mistakes` | 직장 업무 중 반복되는 실수와 마무리의 어려움 | `adult` | 성남 판교 | `not_tested` |
| 17 | `qa-17-tourette` | **뚜렛증후군** | `tic` | `parent-guidance` | 복합 운동틱·음성틱 지속과 가정 대처 원칙 | `child` | 성남 분당 | `not_tested` |
| 18 | `qa-18-child-sleep` | **소아 수면·야경증** | `child` | `night-terrors` | 자다 깨서 우는 야경증 및 소아 야뇨 | `child` | 성남 분당 | `not_tested` |

---

## 4. 세부 구현 내용

### [Component 1] QA Targets & Result History 관리

#### [NEW] [qa_targets.json](file:///c:/Users/28529/OneDrive/%EB%B0%94%ED%83%95%20%ED%99%94%EB%A9%B4/%ED%95%B4%EC%95%84%EB%A6%BC%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/scripts/auto_column/qa_targets.json)
- 18개 질환의 고유 메타데이터(qaId, diseaseId, displayDisease, categoryId, topicAngle, recommendedGeo, ageGroup, enabled, description 등) 정의.

#### [NEW] [auto_column_qa_results.json](file:///c:/Users/28529/OneDrive/%EB%B0%94%ED%83%95%20%ED%99%94%EB%A9%B4/%ED%95%B4%EC%95%84%EB%A6%BC%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/data/auto_column_qa_results.json)
- QA 전용 이력 관리 파일.
- `qa-01-tic`은 이미 틱장애 Dry-run 통과 및 검증 완료이므로 `humanReviewStatus: "approved"`로 기록.
- 나머지 17개는 초기 상태 `not_tested`.

#### [NEW] [qa_manager.js](file:///c:/Users/28529/OneDrive/%EB%B0%94%ED%83%95%20%ED%99%94%EB%A9%B4/%ED%95%B4%EC%95%84%EB%A6%BC%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/scripts/auto_column/qa_manager.js)
- `getQATarget(qaId)`: 특정 qaId에 대한 계획(plan) 객체 합성.
- `recordQAResult(...)`: Dry-run 통과 시 QA 결과 파일에 `generated` 상태 및 소요 비용($USD, KRW) 기록.
- 프로덕션 `auto_column_history.json`과의 완전 분리 보장.

---

### [Component 2] Pipeline & Workflow 연동

#### [MODIFY] [index.js](file:///c:/Users/28529/OneDrive/%EB%B0%94%ED%83%95%20%ED%99%94%EB%A9%B4/%ED%95%B4%EC%95%84%EB%A6%BC%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/scripts/auto_column/index.js)
- 환경변수 `TEST_QA_TARGET` 파싱 로직 추가.
- **안전 규칙**:
  - `isDryRun`일 때만 `TEST_QA_TARGET`이 작동.
  - `forcePublish=true`이거나 스케줄 실행인 경우 `TEST_QA_TARGET`을 무시하고 기존 `planNextColumn()` 로테이션 사용.
  - QA Dry-run 완료 시 `recordQAResult`를 호출하여 `data/auto_column_qa_results.json`에 기록.
  - 프로덕션 `data/auto_column_history.json`은 1바이트도 수정하지 않음.

#### [MODIFY] [auto_publish_column.yml](file:///c:/Users/28529/OneDrive/%EB%B0%94%ED%83%95%20%ED%99%94%EB%A9%B4/%ED%95%B4%EC%95%84%EB%A6%BC%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/.github/workflows/auto_publish_column.yml)
- `workflow_dispatch`에 `test_qa_target` input 추가 (choice 형태 드롭다운):
  - `auto` (기본값)
  - `qa-01-tic (소아 틱장애 / media-exposure)`
  - `qa-02-panic (공황장애 / sudden-palpitation)`
  - `...` (18개 전체 선택지)
- 실행 단계에서 `env: TEST_QA_TARGET: ${{ github.event.inputs.test_qa_target || 'auto' }}` 환경변수 주입.

---

### [Component 3] 검증 테스트

#### [NEW] [test_qa_system.js](file:///c:/Users/28529/OneDrive/%EB%B0%94%ED%83%95%20%ED%99%94%EB%A9%B4/%ED%95%B4%EC%95%84%EB%A6%BC%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80/tests/test_qa_system.js)
- 18개 QA target이 올바르게 정의되어 있는지 스키마 검증.
- 모든 target의 `diseaseId`가 `disease_taxonomy.json` 및 `medical_knowledge/*.json`에 유효한지 검증.
- 모든 target의 `topicAngle`이 taxonomy에 실제 존재하는지 검증.
- 모든 target의 `recommendedGeo`가 `geo_hierarchy.json`에 실제 존재하는지 검증.
- `qa_manager.js`의 계획 합성 함수가 올바른 `plan` 객체를 반환하는지 테스트.
- QA 실행 시 프로덕션 `data/auto_column_history.json`이 오염되지 않는지 검증.

---

## 5. Verification Plan

### 자동 테스트
```bash
node tests/test_qa_system.js
```
- 18개 질환 매트릭스 무결성(ID, topicAngle, geo, category) 100% 검증
- QA 이력 파일 분리 및 쿨다운 격리 검증

### 수동 확인
- GitHub Actions 워크플로우 문법 및 inputs choice 렌더링 확인
- `AUTO_COLUMN_ENABLED=false` 유지 확인
- 프로덕션 발행 차단 상태 확인
