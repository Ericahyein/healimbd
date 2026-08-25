@echo off
chcp 65001 >nul
title 해아림한의원 분당점 - GitHub 업로드
echo ========================================================
echo   해아림한의원 분당점 - GitHub 업로드 (healimbd)
echo ========================================================
echo.
cd /d "c:\Users\28529\OneDrive\바탕 화면\해아림홈페이지"

set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"

if not exist "%GIT_EXE%" (
    echo [오류] Git 실행 파일을 찾을 수 없습니다.
    pause
    exit /b
)

echo [1] 최신 커밋 상태 확인
"%GIT_EXE%" status
echo.
echo [2] GitHub (main 브랜치)로 업로드 시작...
echo.
echo ※ 브라우저 로그인 창이 뜨면 로그인을 완료해 주세요.
echo.
"%GIT_EXE%" push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo   [성공] GitHub 업로드가 완료되었습니다!
    echo   GitHub Actions를 통해 무료 웹 배포가 진행됩니다.
) else (
    echo   [알림] 인증이 필요하거나 오류가 발생했습니다.
)
echo ========================================================
echo.
pause
