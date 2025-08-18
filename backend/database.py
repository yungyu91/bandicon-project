# [진짜 최종 완성 코드] backend/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

# ✅ 이 if문을 추가하여, DB 주소에 sslmode=require 옵션을 직접 추가합니다.
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = f"{DATABASE_URL}?sslmode=require"

# ✅ engine 생성 부분에서 connect_args를 삭제합니다.
engine = create_engine(
    DATABASE_URL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()