#!/bin/bash

# Gunicorn으로 FastAPI 서버 실행
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app