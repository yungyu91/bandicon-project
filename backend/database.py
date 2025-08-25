import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# 현재 파일(database.py)이 있는 폴더의 경로를 찾습니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(current_dir, '.env')

# .env 파일이 존재하면, 그 안의 내용을 환경 변수로 불러옵니다.
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)

# 환경 변수에서 DATABASE_URL을 가져옵니다.
DATABASE_URL = os.getenv("DATABASE_URL")

# 만약 DATABASE_URL이 없다면 (로컬인데 .env 파일에 내용이 없는 경우 등)
# 안전장치로 SQLite 경로를 직접 설정해줍니다.
if not DATABASE_URL:
    print("[WARN] DATABASE_URL not found, falling back to local SQLite.")
    local_db_path = os.path.join(current_dir, "bandicondb.sqlite")
    DATABASE_URL = f"sqlite:///{local_db_path}"

# Render의 PostgreSQL 주소일 경우, 주소 형식을 맞춰줍니다.
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()