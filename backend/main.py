# [전체 코드] backend/main.py
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Header, Query
# ▲▲▲ 여기까지 교체 ▲▲▲
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os
import shutil
import uuid
import random
from datetime import datetime, timezone
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from collections import defaultdict # [추가]
from sdk.api.message import Message
from sdk.exceptions import CoolsmsException
from dotenv import load_dotenv # 1. 이 줄을 추가
# ▼▼▼ 기존의 load_dotenv() 부분을 아래의 새로운 코드로 교체해주세요. ▼▼▼

# 1. main.py 파일이 있는 폴더의 절대 경로를 찾습니다.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 2. .env 파일의 전체 경로를 만듭니다.
ENV_PATH = os.path.join(BASE_DIR, ".env")
# 3. 전체 경로를 사용해 .env 파일을 읽어들입니다.
load_dotenv(dotenv_path=ENV_PATH)

from backend import crud, models, schemas, security
from backend.database import engine, get_db, SessionLocal

# ---------------- 환경 변수 ----------------
ADMIN_USERNAME = os.getenv("BANDICON_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("BANDICON_ADMIN_PASSWORD", "changeme")
ADMIN_NICKNAME = os.getenv("BANDICON_ADMIN_NICKNAME", "admin")
ADMIN_API_TOKEN = os.getenv("BANDICON_ADMIN_API_TOKEN", "your_secret_admin_token")

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="밴디콘 API")
os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS
origins = [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:5173", "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 기존의 @app.on_event("startup") 함수를 아래 코드로 완전히 교체합니다.
@app.on_event("startup")
def bootstrap_admin():
    # Render에서 자동으로 설정해주는 환경 변수를 읽어옵니다.
    # 여러 워커 중 이 값이 '0'인 워커가 단 하나만 존재합니다.
    instance_id = os.getenv("INSTANCE", "0")

    # 오직 0번 워커만 아래의 admin 계정 생성 로직을 실행하도록 합니다.
    if instance_id == "0":
        print("[INFO] Instance 0 is bootstrapping the admin account...")
        db: Session = SessionLocal()
        try:
            user = crud.get_user_by_username(db, ADMIN_USERNAME)
            if not user:
                hashed = security.get_password_hash(ADMIN_PASSWORD)
                user = models.User(
                    username=ADMIN_USERNAME,
                    hashed_password=hashed,
                    nickname=ADMIN_NICKNAME,
                    phone="",
                    skills={},
                    role="운영자",
                    status="approved",
                )
                db.add(user)
                db.commit()
                print("[INFO] Admin account created successfully.")
            else:
                # 기존 admin 계정 정보 업데이트 로직 (이 부분은 동일)
                changed = False
                if user.role != "운영자":
                    user.role = "운영자"; changed = True
                if user.status != "approved":
                    user.status = "approved"; changed = True
                if user.nickname != ADMIN_NICKNAME:
                    user.nickname = ADMIN_NICKNAME; changed = True
                if changed:
                    db.commit()
                    print("[INFO] Admin account details updated.")
        finally:
            db.close()
    else:
        print(f"[INFO] Instance {instance_id} is not the bootstrap instance, skipping admin creation.")
def get_current_user(db: Session, nickname: str):
    user = crud.get_user_by_nickname(db, nickname)
    if user is None: raise HTTPException(status_code=404, detail="User not found")
    return user

async def handle_chat_image_upload(file: Optional[UploadFile]):
    image_url = None
    if file:
        ext = file.filename.split('.')[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = f"static/images/{filename}"
        with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        image_url = f"/{file_path}"
    return image_url

# ---------------- 알림 API ----------------
@app.get("/alerts/{user_nickname}", response_model=List[schemas.Alert], summary="읽지 않은 알림 조회")
def get_unread_alerts(user_nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, user_nickname)
    alerts = db.query(models.Alert).filter(
        models.Alert.user_nickname == user.nickname,
        models.Alert.is_read == False
    ).order_by(models.Alert.created_at.asc()).all()
    return alerts

@app.post("/alerts/{alert_id}/read", summary="알림을 읽음으로 표시")
def mark_alert_read(alert_id: int, nickname: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    crud.mark_alert_as_read(db, alert_id, user)
    return {"success": True}

@app.post("/alerts/read-by-url", summary="URL 기반으로 알림 모두 읽음 처리")
def read_alerts_by_url(nickname: str = Form(...), related_url: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    crud.mark_alerts_as_read_by_url(db, related_url, user)
    return {"success": True}

@app.get("/notifications/counts", summary="기능별 읽지 않은 알림 개수 조회")
def get_notification_counts(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    alerts = db.query(models.Alert).filter(
        models.Alert.user_nickname == user.nickname,
        models.Alert.is_read == False
    ).all()
    
    # [수정] 'board'를 'profile'로 변경하고 집계 로직을 수정
    counts = {"chat": 0, "profile": 0, "etc": 0}
    for alert in alerts:
        if alert.related_url and "/chats/" in alert.related_url:
            counts["chat"] += 1
        elif alert.related_url and "/post/" in alert.related_url:
            counts["profile"] += 1
        else:
            counts["etc"] += 1
            
    return counts

# ---------------- 인증/회원 ----------------
@app.post("/signup", status_code=201, summary="회원가입")
def signup(data: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_username(db, data.id): raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
    if crud.get_user_by_nickname(db, data.nickname): raise HTTPException(status_code=400, detail="이미 사용 중인 닉네임입니다.")
    if db.query(models.User).filter(models.User.phone == data.phone).first(): raise HTTPException(status_code=400, detail="이미 등록된 휴대폰 번호입니다.")
    if data.email and db.query(models.User).filter(models.User.email == data.email).first(): raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    crud.create_user(db=db, user=data)
    if data.role == '간부':
        crud.create_alert(db, 'admin', f"'{data.nickname}'님이 간부 가입을 신청했습니다.", "/admin/approvals")
    return {"success": True}

# ✅ SMS 인증번호 발송 API
@app.post("/auth/send-verification-sms", summary="회원가입용 인증번호 SMS 발송")
def send_verification_sms(phone: str = Form(...), db: Session = Depends(get_db)):
    sms_api_key = os.getenv("COOLSMS_API_KEY")
    sms_api_secret = os.getenv("COOLSMS_API_SECRET")
    sms_sender_phone = os.getenv("COOLSMS_SENDER_PHONE")

    if not all([sms_api_key, sms_api_secret, sms_sender_phone]):
        raise HTTPException(status_code=500, detail="SMS 서비스 환경 변수를 찾을 수 없습니다.")

    code = str(random.randint(100000, 999999))
    
    params = {
        'to': phone,
        'from': sms_sender_phone,
        'text': f"[밴디콘] 인증번호는 [{code}] 입니다.",
        'type': 'SMS'
    }

    try:
        cool = Message(sms_api_key, sms_api_secret)
        response = cool.send(params)
        
        if "error_list" in response or response.get("success_count", 0) != 1:
             error_message = response.get("error_list", "알 수 없는 오류가 발생했습니다.")
             print(f"쿨SMS 발송 실패 응답: {response}")
             raise HTTPException(status_code=400, detail=str(error_message))
        
        crud.create_verification_code(db, phone=phone, code=code)

    except CoolsmsException as e:
        raise HTTPException(status_code=500, detail=f"SMS 발송 실패: {e.msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMS 발송 중 서버 오류 발생: {e}")

    return {"success": True, "message": "인증번호가 발송되었습니다."}

# ✅ SMS 인증번호 확인 API
@app.post("/auth/verify-sms-code", summary="SMS 인증번호 확인")
def verify_sms_code(phone: str = Form(...), code: str = Form(...), db: Session = Depends(get_db)):
    is_verified = crud.verify_phone_code(db, phone=phone, code=code)
    if not is_verified:
        raise HTTPException(status_code=400, detail="인증번호가 올바르지 않거나 만료되었습니다.")
    return {"success": True, "message": "인증에 성공했습니다."}

@app.post("/login", summary="로그인")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, data.id)
    if not user:
        raise HTTPException(status_code=401, detail="없는 아이디입니다.")
    if not security.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="비밀번호가 잘못되었습니다.")
    if user.status == 'pending':
        raise HTTPException(status_code=403, detail="아직 가입이 승인되지 않았습니다.")
    
    # [추가] 사용자가 속한 클랜 정보를 리스트로 만듭니다.
    clans_info = [{"id": c.id, "name": c.name} for c in user.clan]
    
    # [수정] 반환값에 'clans' 리스트를 추가합니다.
    return {"id": user.username, "nickname": user.nickname, "role": user.role, "clans": clans_info}

@app.get("/profile/{nickname}", response_model=schemas.User, summary="프로필 조회")
def get_profile(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    user.manner_score = str(user.manner_score)
    return user

@app.post("/profile/{nickname}/upload-image", response_model=schemas.User, summary="프로필 이미지 업로드")
async def upload_profile_image(nickname: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    image_url = await handle_chat_image_upload(file)
    return crud.update_user_profile_image(db, user=user, image_path=image_url)

@app.post("/register-device", summary="푸시 알림용 디바이스 토큰 등록")
def register_device(token: str = Form(...), nickname: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    crud.create_or_update_device_token(db, user, token)
    return {"success": True}

# ---------------- 친구 ----------------
@app.get("/friends/{nickname}", response_model=schemas.FriendsList, summary="친구 목록 및 요청 조회")
def get_friends(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    friends = user.friends
    pending_requests = [req for req in user.received_friend_requests if req.status == 'pending']
    return {"friends": friends, "pending_requests": pending_requests}

@app.post("/friends/request", summary="친구 요청 보내기")
def send_friend_request(request: schemas.FriendRequestCreate, db: Session = Depends(get_db)):
    sender = get_current_user(db, request.sender)
    receiver = get_current_user(db, request.receiver)
    if sender.id == receiver.id: raise HTTPException(status_code=400, detail="자기 자신에게 친구 요청을 보낼 수 없습니다.")
    db_request, message = crud.create_friend_request(db, sender, receiver)
    if not db_request: raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@app.post("/friends/accept", summary="친구 요청 수락")
def accept_friend_request(request: schemas.FriendRequestAccept, db: Session = Depends(get_db)):
    db_request = crud.get_friend_request(db, request.request_id)
    if not db_request or db_request.status != 'pending': raise HTTPException(status_code=404, detail="존재하지 않거나 처리된 요청입니다.")
    crud.accept_friend_request(db, db_request)
    return {"success": True}

@app.post("/friends/reject", summary="친구 요청 거절")
def reject_friend_request(request: schemas.FriendRequestAccept, db: Session = Depends(get_db)):
    db_request = crud.get_friend_request(db, request.request_id)
    if not db_request or db_request.status != 'pending': raise HTTPException(status_code=404, detail="존재하지 않거나 처리된 요청입니다.")
    crud.reject_friend_request(db, db_request)
    return {"success": True}

# ---------------- 방/세션 ----------------
@app.post("/rooms", status_code=201, response_model=schemas.Room, summary="방 생성")
def create_room(room_data: schemas.RoomCreate, db: Session = Depends(get_db)):
    if not room_data.sessions: raise HTTPException(status_code=400, detail="세션을 하나 이상 선택해야 합니다.")
    user = get_current_user(db, room_data.manager_id)
    return crud.create_room(db=db, room=room_data, manager_nickname=user.nickname)

@app.get("/rooms", response_model=List[schemas.Room], summary="전체 방 리스트 조회")
def get_all_rooms(search: str = "", db: Session = Depends(get_db)):
    return crud.get_all_rooms(db, search=search)

@app.get("/rooms/my/{nickname}", response_model=List[schemas.Room], summary="참여한 방 리스트 조회")
def get_my_rooms(nickname: str, db: Session = Depends(get_db)):
    return crud.get_my_rooms(db, nickname=nickname)

@app.get("/rooms/{room_id}", response_model=schemas.Room, summary="방 상세 정보 조회")
def get_room_detail(room_id: int, db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room: raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")
    return room

@app.post("/rooms/join", summary="세션 참가")
def join_session_api(room_id: int = Form(...), session_name: str = Form(...), nickname: str = Form(...), password: str = Form(""), db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room: raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")
    if room.confirmed:
        raise HTTPException(status_code=400, detail="확정된 방에는 참여할 수 없습니다.")
    if room.is_private and room.password != password: 
        raise HTTPException(status_code=403, detail="비밀번호가 틀렸습니다.")
    if crud.join_session(db, room_id, session_name, nickname): 
        return {"success": True, "message": f"{session_name} 참가 완료"}
    raise HTTPException(status_code=400, detail="세션 참가에 실패했거나 이미 자리가 찼습니다.")

@app.post("/rooms/leave", summary="세션 참가 취소")
def leave_session_api(room_id: int = Form(...), session_name: str = Form(...), nickname: str = Form(...), db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")
    if room.confirmed:
        raise HTTPException(status_code=400, detail="확정된 방에서는 참여를 취소할 수 없습니다.")
    if crud.leave_session(db, room_id, session_name, nickname):
        return {"success": True, "message": "참여를 취소했습니다."}
    raise HTTPException(status_code=400, detail="참여 취소에 실패했습니다. (본인이 참여한 세션이 맞는지 확인해주세요.)")

@app.post("/rooms/session/reserve", summary="세션 예약")
def reserve_session(room_id: int = Form(...), session_name: str = Form(...), nickname: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    room = crud.get_room(db, room_id)
    if not room or room.confirmed or room.ended:
        raise HTTPException(status_code=400, detail="확정되었거나 종료된 방의 세션은 예약할 수 없습니다.")
    
    reservation, message = crud.create_session_reservation(db, room_id, session_name, user)
    if not reservation:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@app.post("/rooms/session/cancel-reservation", summary="세션 예약 취소")
def cancel_reservation(room_id: int = Form(...), session_name: str = Form(...), nickname: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    room = crud.get_room(db, room_id)
    if not room or room.confirmed or room.ended:
        raise HTTPException(status_code=400, detail="확정되었거나 종료된 방의 세션은 예약 취소가 불가능합니다.")
        
    success, message = crud.cancel_session_reservation(db, room_id, session_name, user)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@app.post("/rooms/{room_id}/confirm", summary="방 확정 (방장 전용)")
def confirm_room(room_id: int, manager_nickname: str, db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if room.manager_nickname != manager_nickname: raise HTTPException(status_code=403, detail="방장만 확정할 수 있습니다.")
    if any(s.participant_nickname is None for s in room.sessions): raise HTTPException(status_code=400, detail="모든 세션이 채워져야 확정할 수 있습니다.")
    room.confirmed = True
    db.commit()
    return {"success": True}

@app.post("/rooms/{room_id}/end", summary="합주 종료 (방장 전용)")
def end_room(room_id: int, manager_nickname: str, db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if room.manager_nickname != manager_nickname: raise HTTPException(status_code=403, detail="방장만 종료할 수 있습니다.")
    if not room.confirmed or room.ended: raise HTTPException(status_code=400, detail="확정된 이후에만 종료할 수 있습니다.")
    room.ended = True
    db.commit()
    crud.create_alerts_for_room_end(db, room_id)
    return {"success": True}

# ---------------- 방 스케줄 조율 API ----------------
@app.get("/rooms/{room_id}/availability", summary="방의 전체 가능 시간 조회")
def get_availability(room_id: int, db: Session = Depends(get_db)):
    availability_data = crud.get_room_availability(db, room_id)
    custom_encoder = {datetime: lambda dt: dt.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')}
    json_compatible_data = jsonable_encoder(availability_data, custom_encoder=custom_encoder)
    return JSONResponse(content=json_compatible_data)

@app.post("/rooms/{room_id}/availability", summary="내 가능 시간 업데이트")
def update_availability(room_id: int, request: schemas.UpdateAvailabilityRequest, nickname: str = Query(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    slot_datetimes_utc = [datetime.fromisoformat(slot.replace("Z", "+00:00")) for slot in request.slots]
    crud.update_user_availability(db, room_id, user.id, slot_datetimes_utc)
    return {"success": True, "message": "가능 시간이 업데이트되었습니다."}

# ---------------- 매너 평가 API ----------------
@app.post("/evaluations", summary="매너 평가 제출")
def submit_manner_evaluation(eval_data: schemas.MannerEval, db: Session = Depends(get_db)):
    if crud.check_evaluation_done(db, eval_data.room_id, eval_data.evaluator):
        raise HTTPException(status_code=400, detail="이미 이 합주에 대한 평가를 완료했습니다.")
    crud.create_evaluation_and_alerts(db, eval_data=eval_data)
    return {"success": True, "message": "평가가 제출되었습니다."}

# ---------------- 채팅 ----------------

# [추가] 채팅방별 안 읽은 메시지 요약 API
@app.get("/chats/summary", summary="안 읽은 메시지가 있는 채팅방 요약")
def get_chat_summary(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    alerts = db.query(models.Alert).filter(
        models.Alert.user_nickname == user.nickname,
        models.Alert.related_url.like("/chats/%"),
        models.Alert.is_read == False
    ).all()
    
    unread_counts = defaultdict(int)
    for alert in alerts:
        unread_counts[alert.related_url] += 1
        
    return unread_counts

# [추가] 채팅방 메시지 읽음 처리 API
@app.post("/chats/read", summary="특정 채팅방 메시지 모두 읽음 처리")
def read_chat(nickname: str = Form(...), chat_url: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    crud.mark_alerts_as_read_for_chat(db, chat_url, user)
    return {"success": True}

@app.post("/chat/group", response_model=schemas.GroupChatMessage, summary="단체 채팅 메시지 전송")
async def post_group_chat(sender: str = Form(...), room_id: int = Form(...), message: Optional[str] = Form(None), file: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
    room = crud.get_room(db, room_id)
    if not room: raise HTTPException(status_code=404, detail="채팅하려는 방을 찾을 수 없습니다.")
    if room.confirmed:
        participants = {s.participant_nickname for s in room.sessions if s.participant_nickname}
        participants.add(room.manager_nickname)
        if sender not in participants: raise HTTPException(status_code=403, detail="확정된 방의 참여자만 채팅할 수 있습니다.")
    image_url = await handle_chat_image_upload(file)
    if not message and not image_url: raise HTTPException(status_code=400, detail="메시지나 이미지를 전송해야 합니다.")
    return crud.create_group_chat(db, sender=sender, room_id=room_id, message=message, image_url=image_url)

@app.get("/chat/group/{room_id}", response_model=List[schemas.GroupChatMessage], summary="단체 채팅 내역 조회")
def get_group_chat_history(room_id: int, db: Session = Depends(get_db)):
    return crud.get_group_chat(db, room_id)

@app.post("/chat/direct", response_model=schemas.DirectChatMessage, summary="개인 채팅 메시지 전송")
async def post_direct_chat(sender: str = Form(...), receiver: str = Form(...), message: Optional[str] = Form(None), file: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
    image_url = await handle_chat_image_upload(file)
    if not message and not image_url: raise HTTPException(status_code=400, detail="메시지나 이미지를 전송해야 합니다.")
    return crud.create_direct_chat(db, sender=sender, receiver=receiver, message=message, image_url=image_url)

@app.get("/chat/direct/{user1_nickname}/{user2_nickname}", response_model=List[schemas.DirectChatMessage], summary="개인 채팅 내역 조회")
def get_direct_chat_history(user1_nickname: str, user2_nickname: str, db: Session = Depends(get_db)):
    return crud.get_direct_chat(db, user1_nickname, user2_nickname)

# ---------------- 게시판 ----------------
@app.post("/posts", response_model=schemas.Post, summary="게시글 생성")
async def create_post_api(
    title: str = Form(...), content: str = Form(...), board_type: str = Form(...),
    nickname: str = Form(...), is_anonymous: bool = Form(False),
    file: Optional[UploadFile] = File(None), db: Session = Depends(get_db)
):
    user = get_current_user(db, nickname)
    image_url = await handle_chat_image_upload(file)
    post_data = schemas.PostCreate(title=title, content=content, board_type=board_type, is_anonymous=is_anonymous)
    return crud.create_post(db, post=post_data, owner_id=user.id, image_url=image_url)

@app.get("/boards/{board_type}", response_model=List[schemas.PostList], summary="게시판 별 게시글 목록 조회")
def get_posts_api(board_type: str, skip: int = 0, limit: int = 20, search: str = Query(""), db: Session = Depends(get_db)):
    posts = crud.get_posts(db, board_type=board_type, skip=skip, limit=limit, search=search)
    results = []
    for post in posts:
        results.append(schemas.PostList(
            id=post.id, title=post.title, board_type=post.board_type,
            owner=None if post.is_anonymous else post.owner,
            created_at=post.created_at, likes_count=len(post.liked_by_users),
            comments_count=len(post.comments), is_anonymous=post.is_anonymous
        ))
    return results

@app.get("/profile/{nickname}/posts", response_model=List[schemas.PostList], summary="내가 쓴 게시글 목록 조회")
def get_my_posts_api(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    posts = crud.get_posts_by_owner(db, owner_id=user.id)
    results = []
    for post in posts:
        results.append(schemas.PostList(
            id=post.id, title=post.title, board_type=post.board_type,
            owner=None if post.is_anonymous else post.owner,
            created_at=post.created_at, likes_count=len(post.liked_by_users),
            comments_count=len(post.comments), is_anonymous=post.is_anonymous
        ))
    return results

@app.get("/profile/{nickname}/comments", response_model=List[schemas.Comment], summary="내가 쓴 댓글 목록 조회")
def get_my_comments_api(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    comments = crud.get_comments_by_owner(db, owner_id=user.id)
    return comments

@app.get("/post/{post_id}", response_model=schemas.Post, summary="게시글 상세 조회")
def get_post_detail_api(post_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    anonymous_map = {}
    anonymous_counter = 1

    def build_comment_schema(comment: models.Comment):
        nonlocal anonymous_counter
        
        replies_schema = [build_comment_schema(reply) for reply in comment.replies]
        
        pydantic_comment = schemas.Comment.from_orm(comment)
        pydantic_comment.replies = replies_schema
        
        if post.is_anonymous:
            if comment.owner_id == post.owner_id:
                pydantic_comment.anonymous_nickname = "글쓴이"
            elif comment.owner_id in anonymous_map:
                pydantic_comment.anonymous_nickname = anonymous_map[comment.owner_id]
            else:
                new_name = f"익명{anonymous_counter}"
                anonymous_map[comment.owner_id] = new_name
                pydantic_comment.anonymous_nickname = new_name
                anonymous_counter += 1
            pydantic_comment.owner = None

        return pydantic_comment

    final_comments = [build_comment_schema(c) for c in post.comments if c.parent_id is None]

    return schemas.Post(
        id=post.id,
        title=post.title,
        content=post.content,
        board_type=post.board_type,
        created_at=post.created_at,
        image_url=post.image_url,
        owner=None if post.is_anonymous else post.owner,
        comments=final_comments,
        likes_count=len(post.liked_by_users),
        is_liked=any(u.id == user.id for u in post.liked_by_users),
        is_scrapped=any(u.id == user.id for u in post.scrapped_by_users),
        is_anonymous=post.is_anonymous
    )

@app.post("/post/{post_id}/comments", response_model=schemas.Comment, summary="댓글/대댓글 작성")
def create_comment_api(post_id: int, comment_data: schemas.CommentCreate, nickname: str, parent_id: Optional[int] = None, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    return crud.create_comment(db, comment=comment_data, owner_id=user.id, post_id=post_id, parent_id=parent_id)

@app.post("/post/{post_id}/like", summary="게시글 좋아요/취소")
def toggle_like_api(post_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    post = crud.get_post(db, post_id)
    if not post: raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    message = crud.toggle_post_like(db, post, user)
    return {"success": True, "message": message, "likes_count": len(post.liked_by_users)}

@app.post("/post/{post_id}/scrap", summary="게시글 스크랩/취소")
def toggle_scrap_api(post_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    post = crud.get_post(db, post_id)
    if not post: raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    message = crud.toggle_post_scrap(db, post, user)
    return {"success": True, "message": message}

@app.get("/profile/{nickname}/scraps", response_model=List[schemas.PostList], summary="스크랩한 게시글 목록 조회")
def get_scrapped_posts_api(nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    posts = crud.get_scrapped_posts(db, user)
    return [schemas.PostList(id=post.id, title=post.title, board_type=post.board_type, owner=post.owner, created_at=post.created_at, likes_count=len(post.liked_by_users), comments_count=len(post.comments)) for post in posts]

# ---------------- 클랜 ----------------
@app.post("/clans", response_model=schemas.Clan, summary="클랜 생성")
def create_clan(clan_data: schemas.ClanCreate, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    if user.role != "간부":
        raise HTTPException(status_code=403, detail="간부만 클랜을 생성할 수 있습니다.")
    
    # [수정] user.clan_id 대신 user.owned_clan을 확인하여, 이미 소유한 클랜이 있는지 검사합니다.
    if user.owned_clan:
        raise HTTPException(status_code=400, detail="이미 클랜을 소유하고 있습니다.")
        
    return crud.create_clan(db, clan=clan_data, owner=user)


@app.get("/clans", response_model=List[schemas.Clan], summary="클랜 목록 조회")
def get_clans(db: Session = Depends(get_db)):
    return crud.get_clans(db)

@app.get("/clans/{clan_id}", response_model=schemas.Clan, summary="클랜 상세 정보 조회")
def get_clan_detail(clan_id: int, db: Session = Depends(get_db)):
    clan = crud.get_clan(db, clan_id)
    if not clan: raise HTTPException(status_code=404, detail="클랜을 찾을 수 없습니다.")
    return clan

@app.post("/clans/{clan_id}/join", summary="클랜 가입 신청")
def request_to_join_clan(clan_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    clan = crud.get_clan(db, clan_id)
    if not clan: raise HTTPException(status_code=404, detail="클랜을 찾을 수 없습니다.")
    request, message = crud.create_clan_join_request(db, clan, user)
    if not request: raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@app.post("/clans/requests/{request_id}/approve", summary="클랜 가입 승인 (클랜장 전용)")
def approve_clan_request(request_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    request = crud.get_clan_join_request(db, request_id)
    if not request or request.clan.owner_id != user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    
    # [수정] crud 함수의 결과에 따라 성공 또는 실패(HTTP 400)를 반환
    success, message = crud.approve_clan_join_request(db, request)
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    return {"success": True}

@app.post("/clans/requests/{request_id}/reject", summary="클랜 가입 거절 (클랜장 전용)")
def reject_clan_request(request_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    request = crud.get_clan_join_request(db, request_id)
    if not request or request.clan.owner_id != user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    crud.reject_clan_join_request(db, request)
    return {"success": True}

@app.delete("/clans/{clan_id}/members/{member_nickname}", summary="클랜 멤버 강퇴 (클랜장 전용)")
def kick_clan_member(clan_id: int, member_nickname: str, nickname: str, db: Session = Depends(get_db)):
    clan_owner = get_current_user(db, nickname)
    member_to_kick = get_current_user(db, member_nickname)
    clan = crud.get_clan(db, clan_id)
    if not clan or clan.owner_id != clan_owner.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    if crud.remove_clan_member(db, clan, member_to_kick):
        return {"success": True}
    raise HTTPException(status_code=404, detail="멤버를 찾을 수 없습니다.")

@app.post("/clans/{clan_id}/announcements", response_model=schemas.ClanAnnouncement, summary="클랜 공지 생성 (클랜장 전용)")
def create_clan_announcement(clan_id: int, title: str = Form(...), content: str = Form(...), nickname: str = Form(...), db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    clan = crud.get_clan(db, clan_id)
    if not clan or clan.owner_id != user.id:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    return crud.create_clan_announcement(db, clan=clan, title=title, content=content)

@app.post("/clans/{clan_id}/events", response_model=schemas.ClanEvent, summary="클랜 이벤트 생성 (클랜장 전용)")
def create_clan_event_api(clan_id: int, event_data: schemas.ClanEventCreate, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    clan = crud.get_clan(db, clan_id)
    if not clan or clan.owner_id != user.id:
        raise HTTPException(status_code=403, detail="클랜장만 이벤트를 생성할 수 있습니다.")
    return crud.create_clan_event(db, clan_id, event_data, owner=user)

@app.get("/clans/{clan_id}/events", response_model=List[schemas.ClanEvent], summary="클랜 이벤트 목록 조회")
def get_clan_events_api(clan_id: int, db: Session = Depends(get_db)):
    clan_events = crud.get_clan_events(db, clan_id)
    custom_encoder = {datetime: lambda dt: dt.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')}
    json_compatible_data = jsonable_encoder(clan_events, custom_encoder=custom_encoder)
    return JSONResponse(content=json_compatible_data)

@app.delete("/clans/events/{event_id}", summary="클랜 이벤트 삭제 (클랜장 전용)")
def delete_clan_event_api(event_id: int, nickname: str, db: Session = Depends(get_db)):
    user = get_current_user(db, nickname)
    event = db.query(models.ClanEvent).filter(models.ClanEvent.id == event_id).first()
    if not event: raise HTTPException(status_code=404, detail="이벤트를 찾을 수 없습니다.")
    if event.clan.owner_id != user.id: raise HTTPException(status_code=403, detail="클랜장만 이벤트를 삭제할 수 있습니다.")
    crud.delete_clan_event(db, event_id)
    return {"success": True}

# ---------------- 운영자/관리용 엔드포인트 ----------------
def ensure_admin_token(x_admin_token: str = Header(None)):
    if not ADMIN_API_TOKEN: raise HTTPException(status_code=403, detail="관리 토큰이 설정되지 않았습니다.")
    if x_admin_token != ADMIN_API_TOKEN: raise HTTPException(status_code=403, detail="관리 권한이 없습니다.")

@app.get("/admin/pending-users", summary="운영자: 승인 대기 사용자 목록")
def admin_list_pending(db: Session = Depends(get_db), _: None = Depends(ensure_admin_token)):
    return db.query(models.User).filter(models.User.status == "pending").all()

@app.post("/admin/approve-user", summary="운영자: 사용자 승인")
def admin_approve_user(nickname: str = Form(...), db: Session = Depends(get_db), _: None = Depends(ensure_admin_token)):
    user = crud.get_user_by_nickname(db, nickname)
    if not user: raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    user.status = "approved"
    db.commit()
    return {"success": True, "nickname": nickname}

@app.post("/admin/set-role", summary="운영자: 역할 변경(멤버/간부/운영자)")
def admin_set_role(nickname: str = Form(...), role: str = Form(...), db: Session = Depends(get_db), _: None = Depends(ensure_admin_token)):
    if role not in ("멤버", "간부", "운영자"):
        raise HTTPException(status_code=400, detail="role 은 멤버/간부/운영자만 가능합니다.")
    user = crud.get_user_by_nickname(db, nickname)
    if not user: raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    user.role = role
    db.commit()
    return {"success": True, "nickname": nickname, "role": role}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)