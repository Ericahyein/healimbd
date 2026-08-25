# [매뉴얼] 해아림한의원 분당점 웹사이트 제작 및 운영 가이드

해아림한의원 분당점의 공식 웹사이트 구축 배경, 기술 스택, 디렉터리 아키텍처, 컴포넌트 구조, 로컬 개발 및 유지보수, GitHub Pages 자동 배포 가이드라인을 정리한 종합 운영 매뉴얼입니다.

---

## 📑 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 & 아키텍처](#2-기술-스택--아키텍처)
3. [디자인 시스템 & 브랜드 가이드](#3-디자인-시스템--브랜드-가이드)
4. [디렉터리 구조](#4-디렉터리-구조)
5. [주요 컴포넌트 및 기능 설명](#5-주요-컴포넌트-및-기능-설명)
6. [로컬 개발 및 콘텐츠 수정 방법](#6-로컬-개발-및-콘텐츠-수정-방법)
7. [GitHub 업로드 및 자동 배포 가이드](#7-github-업로드-및-자동-배포-가이드)

---

## 1. 프로젝트 개요

* **웹사이트명**: 해아림한의원 분당점 공식 웹사이트
* **주요 진료분야**:
  * **성인 마음·신경 클리닉**: 공황장애, 자율신경실조증, 불면증, 불안장애, 우울증, 강박증
  * **소아청소년 두뇌·정서 클리닉**: 틱장애, ADHD, 소아불안, 분리불안, 학습집중력
* **핵심 타겟**: 분당/성남/판교 지역 환자 및 부모님
* **목표**: 높은 신뢰도 형성, 직관적인 자가체크 제공, 원클릭 예약·상담(네이버/카카오/전화) 전환율 극대화

---

## 2. 기술 스택 & 아키텍처

| 구분 | 적용 기술 | 버전 및 비고 |
| :--- | :--- | :--- |
| **Static Site Generator** | Hugo Extended | `v0.165.0` (SASS/SCSS 및 JSX 빌드 지원) |
| **Theme / Framework** | Hugo Blox Kit | `github.com/HugoBlox/kit/modules/blox@v0.12.0` |
| **CSS Framework** | Tailwind CSS v4 & Custom CSS | 디자인 토큰, 글래스모피즘, 모던 카드 섀도우 |
| **JavaScript** | Vanilla ES6+ & Preact | 자가진단 카운팅, FAQ 아코디언, 팝업 모달, 부드러운 스크롤 |
| **CI / CD Deployment** | GitHub Actions | `deploy.yml` 워크플로우를 통한 GitHub Pages 자동 배포 |

---

## 3. 디자인 시스템 & 브랜드 가이드

### 3.1 브랜드 컬러 팔레트
```css
:root {
  --primary: #1B8FD1;       /* 메인 신뢰감 블루 (헤더 액센트, 주요 버튼) */
  --secondary: #24B598;     /* 힐링 틸 그린 (소아 클리닉, 안정감 뱃지) */
  --accent: #F3AA29;        /* 웜 앰버 골드 (CTA 포인트, 자가진단 버튼) */
  --text-brand: #515658;    /* 로고 전용 슬레이트 차콜 그레이 (상단 타이틀 텍스트) */
  --text-dark: #1E293B;     /* 헤딩 텍스트 (#1E293B) */
  --text-body: #334155;     /* 본문 기본 텍스트 (#334155) */
  --text-muted: #64748B;    /* 부가 설명 텍스트 */
  --naver-color: #03C75A;   /* 네이버 브랜드 그린 */
  --kakao-color: #FEE500;   /* 카카오 브랜드 옐로우 */
}
```

### 3.2 타이포그래피
* **기본 서체**: `Pretendard`, sans-serif (가독성 높은 모던 고딕)
* **영문/숫자 액센트**: `Outfit`, sans-serif
* **상단 헤더 타이틀**: `1.55rem`, Bold (800), `#515658`
* **GNB 네비게이션**: `1.12rem`, Bold (700), `#1E293B`

---

## 4. 디렉터리 구조

```
c:/Users/28529/OneDrive/바탕 화면/해아림홈페이지/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages 자동 빌드 & 배포 워크플로우
├── assets/
│   ├── css/
│   │   └── style.css           # 전역 스타일시트 (디자인 토큰, 반응형 미디어쿼리)
│   ├── js/
│   │   └── main.js             # 인터랙션 스크립트 (모달, 자가진단, FAQ, 스크롤)
│   └── images/
│       └── logo.png            # 해아림 공식 로고 이미지
├── config/_default/
│   ├── hugo.yaml               # 사이트 메타데이터, 언어(ko), 보안 정책 설정
│   ├── menus.yaml              # GNB 5대 메뉴 설정
│   ├── module.yaml             # Hugo Blox 모듈 마운트 설정
│   └── params.yaml             # 병원 정보, 전화번호, 진료시간 파라미터
├── content/
│   └── _index.md               # 메인 랜딩 페이지 메타 콘텐츠
├── docs/
│   ├── manual.md               # [본 파일] 제작 및 운영 매뉴얼
│   └── issue_report.md         # 문제 해결 및 이슈 보고서
├── layouts/
│   ├── _default/
│   │   └── baseof.html         # HTML5 셸, 폰트 로드, OpenGraph, JSON-LD
│   ├── index.html              # 홈페이지 전체 섹션 마크업
│   └── partials/
│       ├── header.html         # 로고, GNB, 문의하기 모달 마크업
│       ├── footer.html         # 푸터, 사업자정보, 비급여 안내 고지
│       └── floating_bar.html   # 우하단 플로팅 퀵바 (네이버/카톡/전화/상단이동)
├── static/
│   └── images/
│       └── logo.png            # 정적 서빙용 로고 에셋
├── github_push.bat             # 1-클릭 GitHub 업로드 스크립트
├── plan.md                     # 초기 웹사이트 기획서 및 콘텐츠 명세
├── README.md                   # 프로젝트 루트 안내 문서
├── go.mod                      # Hugo 모듈 의존성 정의
└── package.json                # Tailwind v4 및 Preact 의존성
```

---

## 5. 주요 컴포넌트 및 기능 설명

### 5.1 상단 헤더 & GNB (`layouts/partials/header.html`)
* **로고 & 텍스트**: 첨부된 공식 로고 이미지(`logo.png`)와 브랜드 지정 색상(`color: #515658`) 적용
* **5대 핵심 메뉴**:
  1. `치료후기` (`#reviews`): 성인/소아 회복 사례 및 공식 블로그 연동
  2. `진료철학` (`#about`): 손지웅 대표원장 인사말 및 3대 치료 원칙
  3. `진료과목` (`#clinics`): 성인 마음·신경 & 소아청소년 두뇌·정서 클리닉
  4. `원장 칼럼` (`#blog`): 대표 질환별 칼럼 미리보기
  5. `상담예약` (`#location`): 오시는 길, 진료시간표 및 예약 연동
* **단일 [문의하기] 버튼**: 헤더 우측 통합 버튼 클릭 시 선택 모달 팝업 실행

### 5.2 상담 및 예약 팝업 모달 (`inquiry-modal`)
* 사용자가 [문의하기] 클릭 시 활성화되는 선택 모달:
  * **네이버 진료 예약**: `https://naver.me/xbARooIc` 연결
  * **카카오톡 1:1 상담**: `http://pf.kakao.com/_NEUHT` 연결
  * **전화 상담 연결**: `tel:031-716-8575` 바로 연결

### 5.3 인터랙티브 자가진단 체크리스트 (`#adult-self-check`, `#child-self-check`)
* 체크박스 선택 개수(1~3개)에 따라 실시간 피드백 텍스트와 맞춤 예약 버튼이 동적으로 표출되는 JS 로직 적용 (`assets/js/main.js`).

### 5.4 FAQ 아코디언 (`#faq`)
* 질문 클릭 시 다른 열린 항목을 닫고 선택한 답변을 부드럽게 펼치는 아코디언 UI (`.faq-item.active`).

### 5.5 오시는 길 & 진료시간 (`#location`)
* **월/수 야간진료(저녁 8시)** 및 **공휴일 단축진료(09:00~15:00 / 점심시간 없음)** 강조 표기
* 네이버 지도 및 카카오맵 길찾기 바로가기 버튼 탑재

---

## 6. 로컬 개발 및 콘텐츠 수정 방법

### 6.1 로컬 개발 서버 실행
```powershell
# 프로젝트 폴더로 이동 후 실행
hugo server -p 1313 --bind 127.0.0.1
```
* 웹 브라우저에서 `http://localhost:1313/` 접속 시 실시간 반영(Live-Reload) 확인 가능.

### 6.2 정적 사이트 빌드 (배포용)
```powershell
hugo --minify -d public
```

### 6.3 주요 정보 수정 위치
* **진료시간 / 전화번호 / 주소 변경**: `config/_default/params.yaml` 및 `layouts/index.html` (오시는 길 섹션)
* **메뉴 링크 변경**: `config/_default/menus.yaml` 및 `layouts/partials/header.html`
* **칼럼 및 후기 내용 추가**: `layouts/index.html` 내 `#reviews` 또는 `#blog` 섹션

---

## 7. GitHub 업로드 및 자동 배포 가이드

### 7.1 원클릭 업로드 (추천)
* 바탕화면의 **`해아림_깃허브업로드.bat`** 또는 프로젝트 폴더의 `github_push.bat`을 더블 클릭하여 실행합니다.

### 7.2 수동 명령어 업로드
```powershell
& "C:\Program Files\Git\cmd\git.exe" push -u origin main
```

### 7.3 GitHub Pages 배포 확인
* 코드가 `main` 브랜치에 푸시되면 GitHub Actions (`.github/workflows/deploy.yml`)가 자동으로 실행되어 수 분 내에 웹사이트가 업데이트됩니다.
