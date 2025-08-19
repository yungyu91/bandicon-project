#!/bin/bash

# 앱을 시작하기 전 5초간 대기합니다.
# 데이터베이스 서비스가 완전히 뜰 시간을 줍니다.
echo "Waiting for database to be ready..."
sleep 5

# Gunicorn으로 FastAPI 서버 실행
echo "Starting Gunicorn server..."
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app