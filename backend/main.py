# [임시 디버깅용 코드] backend/main.py

from fastapi import FastAPI
import os

app = FastAPI(title="밴디콘 API 디버깅")

@app.get("/")
def read_root():
    return {"Hello": "World"}

# ----------------------------------------------------
# 아래의 모든 기존 코드를 임시로 주석 처리합니다.
# ----------------------------------------------------

# from dotenv import load_dotenv
# from fastapi.staticfiles import StaticFiles
# ... (다른 모든 import 문들)

# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# ENV_PATH = os.path.join(BASE_DIR, ".env")
# load_dotenv(dotenv_path=ENV_PATH)

# from backend import crud, models, schemas, security
# from backend.database import engine, get_db, SessionLocal

# ADMIN_USERNAME = os.getenv("BANDICON_ADMIN_USERNAME", "admin")
# ADMIN_PASSWORD = os.getenv("BANDICON_ADMIN_PASSWORD", "changeme")
# ADMIN_NICKNAME = os.getenv("BANDICON_ADMIN_NICKNAME", "admin")
# ADMIN_API_TOKEN = os.getenv("BANDICON_ADMIN_API_TOKEN", "your_secret_admin_token")

# # models.Base.metadata.create_all(bind=engine) # 임시 주석 처리
# os.makedirs("static/images", exist_ok=True)
# app.mount("/static", StaticFiles(directory="static"), name="static")

# origins = [
#     "http://localhost:3000",
#     "https://bandicon-project.vercel.app",
#     "https://www.bandicon.com",
# ]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # @app.on_event("startup") # 임시 주석 처리
# # def bootstrap_admin():
# #     ... (함수 내용 전체)

# ... (이하 모든 API 엔드포인트 코드)