# [문제보고서] 해아림한의원 분당점 웹사이트 구축 이슈 & 트러블슈팅 리포트

본 문서는 해아림한의원 분당점 홈페이지 구축 과정에서 발생한 환경 설정, 프레임워크 호환성, UI/UX 변경 및 Git 배포 관련 이슈와 해결 내역을 기록한 보고서입니다. 작업이 진행됨에 따라 새로운 이슈와 변경 사항이 지속적으로 업데이트됩니다.

---

## 📊 이슈 요약 및 처리 현황

| 이슈 번호 | 분류 | 이슈 요약 | 상태 | 해결 일자 |
| :--- | :--- | :--- | :---: | :---: |
| **ISSUE-01** | 환경 설정 | Hugo, Git, Node.js, Go 초기 미설치 및 PATH 미인식 | **해결 완료** | 2026-08-24 |
| **ISSUE-02** | 프레임워크 | Hugo Blox Kit 모듈 최소 버전 요구(Min v0.158.0) 빌드 에러 | **해결 완료** | 2026-08-24 |
| **ISSUE-03** | 보안 정책 | Tailwind CSS 실행 시 `security.exec.allow` 정책 거부 | **해결 완료** | 2026-08-24 |
| **ISSUE-04** | 브라우저 검증 | Playwright 서브에이전트 드라이버 다운로드 404 에러 | **해결 완료** | 2026-08-24 |
| **ISSUE-05** | Git 배포 | 터미널 내 Git 미인식 및 자격 증명 창 미노출 현상 | **해결 완료** | 2026-08-25 |
| **ISSUE-06** | 브랜딩/디자인 | 상단 브랜드 텍스트 색상 CI 미일치 (로고 텍스트 색상 요청) | **해결 완료** | 2026-08-24 |
| **ISSUE-07** | CI/CD 배포 | GitHub Actions 내 Hugo 버전(v0.145.0) 불일치 빌드 에러 (`__html not defined`) | **해결 완료** | 2026-08-25 |
| **ISSUE-08** | GitHub Pages 경로 | GitHub Pages 서브디렉터리(`/healimbd/`) 배포 시 로고 이미지 경로 404 깨짐 | **해결 완료** | 2026-08-25 |
| **ISSUE-09** | 템플릿 렌더링 | Hugo Blox 템플릿 우선순위로 인한 홈페이지 본문 누락 및 사진 노출 수정 | **해결 완료** | 2026-08-25 |
| **ISSUE-10** | 템플릿 아키텍처 | Hugo 메인 레이아웃을 완전 독립형(Self-Contained) 템플릿으로 전환하여 본문 누락 영구 해결 | **해결 완료** | 2026-08-25 |

---

## 🔍 이슈별 상세 원인 및 해결 내역

### 📌 ISSUE-01: 초기 개발 도구 미설치 및 환경 변수(PATH) 미등록
* **현상**:
  - `hugo`, `git`, `node`, `go` 명령어 실행 시 `'명령을 찾을 수 없음'` 에러 발생.
* **원인**:
  - Windows 기본 시스템 환경에 Hugo Extended, Git, Node.js, Go 개발 툴이 미설치된 상태.
* **해결 조치**:
  1. `winget` 패키지 관리자를 통해 Git(`Git.Git`), Node.js LTS(`OpenJS.NodeJS.LTS`), Go(`GoLang.Go`) 무인 설치 완료.
  2. 최신 Hugo Extended 바이너리를 다운로드하여 로컬 실행 경로에 배치.
  3. Windows 사용자 환경 변수(`User PATH`)에 영구 등록 완료.

---

### 📌 ISSUE-02: Hugo Blox Kit 모듈 최소 버전 요구 (Min v0.158.0) 빌드 실패
* **현상**:
  - Hugo Blox v0.12.0 모듈 빌드 시 `WARN Module is not compatible with this Hugo version: Min 0.158.0 extended` 및 `function "__html" not defined` 에러 발생.
* **원인**:
  - 초기에 설치된 Hugo 버전(v0.145.0)이 최신 Hugo Blox의 JSX/Tailwind v4 템플릿 함수를 지원하지 못함.
* **해결 조치**:
  - GitHub Releases에서 **Hugo Extended v0.165.0** 최신 바이너리를 수동으로 다운로드 및 교체하여 정상 컴파일 완료.

---

### 📌 ISSUE-03: Hugo 보안 실행 정책 (`security.exec.allow`) 거부
* **현상**:
  - Hugo 빌드 중 `access denied: "tailwindcss" is not whitelisted in policy "security.exec.allow"` 에러 발생.
* **원인**:
  - Hugo의 보안 정책상 외부 실행 바이너리(`tailwindcss`, `npm`, `pnpm`, `go` 등)의 실행이 기본 차단되어 있음.
* **해결 조치**:
  - `config/_default/hugo.yaml` 파일 내 `security.exec.allow` 목록에 `tailwindcss`, `node`, `npm`, `pnpm`, `go`를 명시적으로 허용하여 빌드 에러 해결.

---

### 📌 ISSUE-04: 자동 브라우저 검증(Playwright) 드라이버 다운로드 404
* **현상**:
  - 자동 브라우저 서브에이전트 실행 시 `playwright-1.57.0-win32_x64.zip` 다운로드 404 에러로 창 생성 실패.
* **원인**:
  - 원격 Playwright 드라이버 CDN 서버의 일시적 404 응답으로 인한 서브에이전트 초기화 실패.
* **해결 조치**:
  - 로컬 HTTP 서버 응답 및 정적 HTML 구조화 렌더링 검증(`Invoke-WebRequest`, Status 200 OK)과 실제 데스크톱 기본 브라우저(`Start-Process`) 구동 방식으로 전환하여 사용자 검증 완료.

---

### 📌 ISSUE-05: Git 푸시 실행 시 터미널 미인식 및 자격 증명 창 미노출
* **현상**:
  - 사용자 터미널에서 `git` 실행 시 인식 불가 또는 백그라운드 프로세스에서 자격 증명 팝업이 대기 상태로 머무름.
* **원인**:
  - 기존에 열려 있던 터미널 창에 갱신된 PATH가 반영되지 않았고, 백그라운드 세션에서는 대화형 GUI 자격 증명 창이 차단됨.
* **해결 조치**:
  1. 사용자 환경 변수(`User PATH`)에 `C:\Program Files\Git\cmd`를 영구 등록.
  2. Git의 절대 경로(`"C:\Program Files\Git\cmd\git.exe"`)를 직접 호출하는 **1-클릭 실행 파일(`github_push.bat` 및 바탕화면 바로가기)** 제작 및 배치.

---

### 📌 ISSUE-06: 상단 브랜드 텍스트 색상 CI 미일치
* **현상**:
  - 상단 "해아림한의원 분당점" 글씨가 파란색(Primary `#1B8FD1`)으로 표기되어 로고 텍스트 고유의 색상과 불일치.
* **원인**:
  - 공식 브랜드 로고 이미지(`media_1787561241392.png`) 내의 "해아림한의원" 폰트 색상은 고유의 슬레이트 차콜 그레이 색상임.
* **해결 조치**:
  - 로고 원본 이미지에서 픽셀 컬러를 정밀 추출하여 고유 브랜드 색상 **`#515658`**를 도출하고, `.brand-logo-title` 및 `.drawer-title`의 색상을 `#515658`로 일괄 업데이트 완료.

---

### 📌 ISSUE-07: GitHub Actions 내 Hugo 버전 불일치로 인한 배포 빌드 에러
* **현상**:
  - GitHub Actions 자동 배포 실행 시 `Build with Hugo` 단계에서 `Module "github.com/HugoBlox/kit/modules/blox" is not compatible with this Hugo version: Min 0.158.0 extended` 및 `function "__html" not defined` 에러로 배포 실패.
* **원인**:
  - `.github/workflows/deploy.yml` 파일 내에 선언된 `HUGO_VERSION`이 `0.145.0`으로 고정되어 있어, 최신 Hugo Blox Kit(Min v0.158.0 필요)의 JSX 템플릿 컴파일을 지원하지 못함.
* **해결 조치**:
  - `.github/workflows/deploy.yml`의 `HUGO_VERSION`을 최신 호환 버전인 **`0.165.0`**으로 수정 및 푸시하여 GitHub Actions 빌드 통과.

---

### 📌 ISSUE-08: GitHub Pages 서브디렉터리(`/healimbd/`) 배포 시 로고 이미지 경로 404 깨짐
* **현상**:
  - GitHub Pages(`https://ericahyein.github.io/healimbd/`) 접속 시 상단 헤더, 모바일 드로어, 팝업 모달 내의 로고 이미지가 깨져서 표시됨.
* **원인**:
  - 템플릿 마크업(`layouts/partials/header.html`)에서 이미지 경로가 절대 루트(`/images/logo.png`)로 하드코딩되어 있어, 서브디렉터리 저장소(`/healimbd/`)의 에셋 경로(`/healimbd/images/logo.png`)를 찾지 못함.
* **해결 조치**:
  - Hugo의 `relURL` 템플릿 함수(`{{ "images/logo.png" | relURL }}`)를 적용하여, 로컬 환경(`/`)과 GitHub Pages 서브경로(`/healimbd/`) 모두에서 이미지 경로가 동적으로 올바르게 매핑되도록 전면 수정 완료.

---

### 📌 ISSUE-09: Hugo Blox 템플릿 우선순위로 인한 메인 화면 본문 누락 및 사진 노출 수정
* **현상**:
  - 사이트 접속 시 헤더와 푸터만 나타나고 메인 화면(사진 배경 및 본문)이 공백으로 렌더링됨.
* **원인**:
  - `content/_index.md`에 설정되어 있던 `type: "landing"`으로 인해 Hugo Blox 모듈의 기본 템플릿이 호출되었으나, 커스텀 섹션이 연결되지 않아 빈 `<main>` 태그로 출력됨.
* **해결 조치**:
  1. `content/_index.md`의 `type: "landing"` 제거 및 `layouts/_default/home.html` 명시적 템플릿 파일 추가.
  2. 원장 진료실 배경 사진이 선명하게 보이도록 다크 오버레이 투명도(0.45~0.82)를 최적화하여 텍스트 가독성과 인물 시인성 동시 확보.
  3. 전체 빌드 검증 및 GitHub 재푸시 완료.

---

### 📌 ISSUE-10: Hugo 메인 레이아웃을 완전 독립형(Self-Contained) 템플릿으로 전환하여 본문 누락 영구 해결
* **현상**:
  - 템플릿 블록 상속(`{{ define "main" }}`) 구조에서 Hugo Blox 모듈과의 블록 상속 충돌로 인해 메인 본문 섹션 전체가 빌드 결과물에서 누락되는 현상 발생.
* **원인**:
  - 외부 Hugo 모듈의 `baseof.html`이 로컬 `baseof.html`보다 먼저 참조되면서 로컬 `index.html`의 `{{ define "main" }}` 블록이 주입되지 못함.
* **해결 조치**:
  - `layouts/index.html`을 `baseof.html`의 블록 상속에 의존하지 않는 **완전 독립형(Self-Contained) 단일 템플릿**으로 재구성.
  - 헤더, 톤다운 진료실 사진 히어로, 네이비 정보 바, 자가진단, 클리닉, 프로세스, 칼럼, FAQ, 오시는 길, 푸터까지 모든 섹션이 100% 무결하게 HTML로 직접 컴파일되도록 조치 완료.

---

## 🛠️ 향후 업데이트 및 유지보수 가이드

1. **새로운 이슈 발생 시**:
   - 본 `docs/issue_report.md` 파일에 새로운 번호(`ISSUE-07`, `ISSUE-08`...)를 부여하고 현상, 원인, 조치 내용을 추가합니다.
2. **배포 에러 발생 시 확인 체크리스트**:
   - `config/_default/hugo.yaml` 보안 정책이 유지되고 있는지 확인.
   - `public/` 폴더가 `.gitignore`에 포함되어 불필요한 빌드 부산물이 충돌을 일으키지 않는지 점검.
   - GitHub Actions 워크플로우(`deploy.yml`) 로그에서 Hugo 버전(`0.145.0` 이상) 호환 여부 확인.
