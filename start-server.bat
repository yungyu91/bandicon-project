# start-server.bat 전체 코드

@echo off
setlocal

REM ===== Bandicon 백엔드 서버 실행 =====

REM --- 운영자 계정 환경변수 설정 ---
set BANDICON_ADMIN_USERNAME=1
set BANDICON_ADMIN_PASSWORD=1
set BANDICON_ADMIN_NICKNAME=윤동규
set BANDICON_ADMIN_API_TOKEN=abc123-VERY-LONG-RANDOM

REM --- 스크립트 기준 프로젝트 루트 계산 ---
set SCRIPT_DIR=%~dp0
set ROOT=%SCRIPT_DIR%
if not exist "%ROOT%\backend\main.py" (
    set ROOT=%SCRIPT_DIR%..
)

REM --- backend 패키지 보장 ---
if not exist "%ROOT%\backend\__init__.py" (
    type NUL > "%ROOT%\backend\__init__.py"
)

REM --- 작업 디렉터리를 루트로 변경 ---
cd /d "%ROOT%"
set PYTHONPATH=%ROOT%

REM --- 가상환경 확인, 없으면 생성 ---
if not exist "%ROOT%\backend\venv" (
    echo [INFO] Python venv 생성 중...
    python -m venv "%ROOT%\backend\venv"
)

REM --- 가상환경 활성화 ---
call "%ROOT%\backend\venv\Scripts\activate.bat"

REM --- [수정] requirements.txt 파일로 모든 라이브러리 설치 ---
echo [INFO] requirements.txt 로 라이브러리 설치 중...
pip install --upgrade pip >nul
pip install -r backend\requirements.txt

REM --- 서버 실행 ---
echo [INFO] Bandicon 서버 시작...
uvicorn backend.main:app --reload --port 8000

pause
endlocal
