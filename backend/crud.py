# [전체 코드] backend/crud.py

from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_, desc, and_
# ✅ 이 부분에 timedelta를 추가해주세요.
from datetime import datetime, timedelta 
from typing import List, Optional
from backend import models, schemas, security

# backend/crud.py 상단의 Firebase 초기화 부분을 아래 코드로 완전히 교체

import firebase_admin
from firebase_admin import credentials, messaging
import os

# Render의 Secret File 경로는 /etc/secrets/ 입니다.
# 이 경로에 우리가 업로드한 파일이 위치하게 됩니다.
CERT_PATH = "/etc/secrets/bandicon-firebase-adminsdk.json"

if os.path.exists(CERT_PATH) and not firebase_admin._apps:
    try:
        cred = credentials.Certificate(CERT_PATH)
        firebase_admin.initialize_app(cred)
        print("[INFO] Firebase initialized successfully from Secret File.")
    except Exception as e:
        print(f"[ERROR] Failed to initialize Firebase from Secret File: {e}")
# ------------------------------------------------------------------


def send_push_notification(db: Session, user_nickname: str, title: str, body: str):
    user = get_user_by_nickname(db, user_nickname)
    if not user or not user.device_tokens:
        return

    tokens = [dt.token for dt in user.device_tokens]
    if not tokens:
        return

    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            tokens=tokens,
        )
        messaging.send_multicast(message)
        print(f"Push sent to {user_nickname}")
    except Exception as e:
        print(f"Push notification failed for {user_nickname}: {e}")

def mark_alerts_as_read_by_url(db: Session, url: str, user: models.User):
    db.query(models.Alert).filter(
        models.Alert.user_nickname == user.nickname,
        models.Alert.related_url == url,
        models.Alert.is_read == False
    ).update({"is_read": True})
    db.commit()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).options(
        selectinload(models.User.clan)
    ).filter(models.User.username == username).first()

def get_user_by_nickname(db: Session, nickname: str):
    return db.query(models.User).options(
        selectinload(models.User.device_tokens),
        selectinload(models.User.clan)
    ).filter(models.User.nickname == nickname).first()
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        username=user.id, hashed_password=hashed_password, nickname=user.nickname,
        phone=user.phone, email=user.email, skills=user.skills, role=user.role,
        status="pending" if user.role == "간부" else "approved",
        phone_verified=False,
        email_verified=False, # ✅ 여기에 쉼표(,)가 빠졌었습니다!
        marketing_consent=user.marketing_consent
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- ✅ 바로 이 위치에 아래 함수 두 개를 추가하시면 됩니다. ---

def create_verification_code(db: Session, phone: str, code: str):
    expires_at = datetime.utcnow() + timedelta(minutes=3)
    db_code = db.query(models.VerificationCode).filter(models.VerificationCode.phone == phone).first()
    if db_code:
        db_code.code = code
        db_code.expires_at = expires_at
    else:
        db_code = models.VerificationCode(phone=phone, code=code, expires_at=expires_at)
        db.add(db_code)
    db.commit()
    db.refresh(db_code)
    return db_code

def verify_phone_code(db: Session, phone: str, code: str) -> bool:
    db_code = db.query(models.VerificationCode).filter(models.VerificationCode.phone == phone).first()
    if not db_code:
        return False
    if datetime.utcnow() > db_code.expires_at or db_code.code != code:
        return False
    db.delete(db_code)
    db.commit()
    return True


def update_user_profile_image(db: Session, user: models.User, image_path: str):
    user.profile_img = image_path
    db.commit()
    db.refresh(user)
    return user

def create_or_update_device_token(db: Session, user: models.User, token: str):
    db_token = db.query(models.DeviceToken).filter_by(token=token).first()
    if db_token:
        if db_token.user_id != user.id:
            db_token.user_id = user.id
    else:
        db_token = models.DeviceToken(user_id=user.id, token=token)
        db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def create_friend_request(db: Session, sender: models.User, receiver: models.User):
    existing_request = db.query(models.FriendRequest).filter(or_(
        (models.FriendRequest.sender_id == sender.id) & (models.FriendRequest.receiver_id == receiver.id),
        (models.FriendRequest.sender_id == receiver.id) & (models.FriendRequest.receiver_id == sender.id)
    )).first()
    if existing_request:
        if existing_request.status == 'pending': return None, "이미 친구 요청을 보냈거나 받았습니다."
        elif existing_request.status == 'accepted': return None, "이미 친구 관계입니다."
    db_request = models.FriendRequest(sender_id=sender.id, receiver_id=receiver.id)
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    send_push_notification(db, receiver.nickname, "새로운 친구 요청", f"{sender.nickname}님이 친구가 되고 싶어해요.")
    return db_request, "친구 요청을 보냈습니다."
def get_friend_request(db: Session, request_id: int):
    return db.query(models.FriendRequest).filter(models.FriendRequest.id == request_id).first()
def accept_friend_request(db: Session, request: models.FriendRequest):
    request.status = "accepted"
    user = request.sender
    friend = request.receiver
    if user and friend:
        user.friends.append(friend)
        friend.friends.append(user)
    db.commit()
    send_push_notification(db, user.nickname, "친구 요청 수락", f"{friend.nickname}님이 친구 요청을 수락했어요.")
    return True
def reject_friend_request(db: Session, request: models.FriendRequest):
    request.status = "rejected"
    db.commit()
    return True

def create_room(db: Session, room: schemas.RoomCreate, manager_nickname: str):
    db_room = models.Room(title=room.title, song=room.song, artist=room.artist, description=room.description,
                          is_private=room.is_private, password=room.password, manager_nickname=manager_nickname)
    db.add(db_room); db.commit(); db.refresh(db_room)
    for session_name in room.sessions:
        db_session = models.Session(room_id=db_room.id, session_name=session_name)
        db.add(db_session)
    db.commit(); db.refresh(db_room)
    return db_room
def get_all_rooms(db: Session, search: str = ""):
    query = db.query(models.Room).options(
        selectinload(models.Room.sessions).selectinload(models.Session.reservations).joinedload(models.SessionReservation.user)
    )
    if search:
        search_term = f"%{search.replace(' ', '').lower()}%"
        query = query.filter(or_(
            models.Room.title.ilike(search_term),
            models.Room.song.ilike(search_term),
            models.Room.artist.ilike(search_term)
        ))
    return query.order_by(models.Room.confirmed.asc(), models.Room.id.desc()).all()
def get_room(db: Session, room_id: int):
    return db.query(models.Room).filter(models.Room.id == room_id).first()
def get_my_rooms(db: Session, nickname: str):
    return db.query(models.Room).filter(or_(
        models.Room.manager_nickname == nickname,
        models.Room.sessions.any(participant_nickname=nickname)
    )).all()
def join_session(db: Session, room_id: int, session_name: str, nickname: str):
    session = db.query(models.Session).filter_by(room_id=room_id, session_name=session_name).first()
    if session and session.participant_nickname is None:
        session.participant_nickname = nickname
        db.commit()
        room_manager_nickname = session.room.manager_nickname
        if room_manager_nickname != nickname:
            create_alert(
                db, 
                user_nickname=room_manager_nickname,
                message=f"'{nickname}'님이 '{session.room.title}' 방의 '{session_name}' 세션에 참여했습니다.",
                related_url=f"/rooms/{room_id}"
            )
        return True
    return False

def leave_session(db: Session, room_id: int, session_name: str, nickname: str):
    session = db.query(models.Session).options(
        selectinload(models.Session.reservations).joinedload(models.SessionReservation.user)
    ).filter_by(
        room_id=room_id,
        session_name=session_name,
        participant_nickname=nickname
    ).first()
    
    if session:
        session.participant_nickname = None
        if session.reservations:
            sorted_reservations = sorted(session.reservations, key=lambda r: r.id)
            next_participant_reservation = sorted_reservations[0]
            
            session.participant_nickname = next_participant_reservation.user.nickname
            db.delete(next_participant_reservation)
            
        db.commit()
        return True
    return False

def create_session_reservation(db: Session, room_id: int, session_name: str, user: models.User):
    session = db.query(models.Session).filter_by(room_id=room_id, session_name=session_name).first()
    if not session or session.participant_nickname is None:
        return None, "비어있거나 존재하지 않는 세션은 예약할 수 없습니다."
    
    is_participant = any(s.participant_nickname == user.nickname for s in session.room.sessions)
    if is_participant:
        return None, "이미 해당 방의 다른 세션에 참여하고 있습니다."

    is_reserved = any(r.user_id == user.id for r in session.reservations)
    if is_reserved:
        return None, "이미 해당 세션에 예약을 했습니다."

    reservation = models.SessionReservation(session_id=session.id, user_id=user.id)
    db.add(reservation)
    db.commit()
    return reservation, "예약이 완료되었습니다."


def cancel_session_reservation(db: Session, room_id: int, session_name: str, user: models.User):
    session = db.query(models.Session).filter_by(room_id=room_id, session_name=session_name).first()
    if not session:
        return False, "세션을 찾을 수 없습니다."

    reservation = db.query(models.SessionReservation).filter_by(session_id=session.id, user_id=user.id).first()
    if reservation:
        db.delete(reservation)
        db.commit()
        return True, "예약을 취소했습니다."
    
    return False, "예약 기록을 찾을 수 없습니다."

def create_group_chat(db: Session, sender: str, room_id: int, message: Optional[str], image_url: Optional[str]):
    db_msg = models.GroupChat(sender=sender, room_id=room_id, message=message, image_url=image_url,
                              timestamp=datetime.utcnow().isoformat())
    db.add(db_msg); db.commit(); db.refresh(db_msg)
    room = get_room(db, room_id)
    participants = {s.participant_nickname for s in room.sessions if s.participant_nickname}
    participants.add(room.manager_nickname)
    for p_nickname in participants:
        if p_nickname != sender:
            send_push_notification(db, p_nickname, f"'{room.title}' 새 메시지", f"{sender}: {message or '사진'}")
            create_alert(
                db,
                user_nickname=p_nickname,
                message=f"'{room.title}' 방에 새 메시지가 도착했습니다.",
                related_url=f"/chats/group/{room_id}"
            )
    return db_msg
def get_group_chat(db: Session, room_id: int):
    return db.query(models.GroupChat).filter(models.GroupChat.room_id == room_id).all()

def create_direct_chat(db: Session, sender: str, receiver: str, message: Optional[str], image_url: Optional[str]):
    db_msg = models.DirectChat(sender=sender, receiver=receiver, message=message, image_url=image_url,
                               timestamp=datetime.utcnow().isoformat())
    db.add(db_msg); db.commit(); db.refresh(db_msg)
    send_push_notification(db, receiver, f"{sender}님의 새 메시지", message or "사진")
    create_alert(
        db,
        user_nickname=receiver,
        message=f"'{sender}'님에게 새 메시지가 도착했습니다.",
        related_url=f"/chats/direct/{sender}"
    )
    return db_msg
def get_direct_chat(db: Session, user1_nickname: str, user2_nickname: str):
    return db.query(models.DirectChat).filter(or_(
        (models.DirectChat.sender == user1_nickname) & (models.DirectChat.receiver == user2_nickname),
        (models.DirectChat.sender == user2_nickname) & (models.DirectChat.receiver == user1_nickname)
    )).order_by(models.DirectChat.timestamp.asc()).all()

def create_evaluation_and_alerts(db: Session, eval_data: schemas.MannerEval):
    room = get_room(db, eval_data.room_id)
    if not room: return
    alert = db.query(models.Alert).filter_by(user_nickname=eval_data.evaluator,
                                             related_url=f"/manner-eval/{eval_data.room_id}").first()
    if alert:
        alert.is_read = True
        db.commit()
    for nickname, score in eval_data.scores.items():
        user = get_user_by_nickname(db, nickname)
        if user:
            if user.manner_score == "루키": user.manner_score = str(score)
            else:
                current_score = int(user.manner_score)
                new_score = (current_score + score) // 2
                user.manner_score = str(new_score)
            db.add(models.Evaluation(room_id=eval_data.room_id, evaluator_nickname=eval_data.evaluator,
                                     evaluated_nickname=nickname))
    if eval_data.mood_maker:
        maker = get_user_by_nickname(db, eval_data.mood_maker)
        if maker: maker.badges += 1
    db.commit()
def check_evaluation_done(db: Session, room_id: int, evaluator_nickname: str):
    return db.query(models.Evaluation).filter_by(room_id=room_id, evaluator_nickname=evaluator_nickname).first()

def create_alerts_for_room_end(db: Session, room_id: int):
    room = get_room(db, room_id)
    participants = {s.participant_nickname for s in room.sessions if s.participant_nickname}
    if room.manager_nickname: participants.add(room.manager_nickname)
    if len(participants) >= 2:
        for nickname in participants:
            create_alert(db, user_nickname=nickname, message=f"'{room.title}' 합주 평가를 진행해주세요.",
                         related_url=f"/manner-eval/{room.id}")

def create_alert(db: Session, user_nickname: str, message: str, related_url: str):
    db_alert = models.Alert(user_nickname=user_nickname, message=message, related_url=related_url)
    db.add(db_alert); db.commit()

def mark_alert_as_read(db: Session, alert_id: int, user: models.User):
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_nickname == user.nickname
    ).first()
    if alert:
        alert.is_read = True
        db.commit()
    return alert

def mark_alerts_as_read_for_chat(db: Session, chat_url: str, user: models.User):
    db.query(models.Alert).filter(
        models.Alert.user_nickname == user.nickname,
        models.Alert.related_url == chat_url,
        models.Alert.is_read == False
    ).update({"is_read": True})
    db.commit()

def create_post(db: Session, post: schemas.PostCreate, owner_id: int, image_url: str = None):
    db_post = models.Post(**post.dict(), owner_id=owner_id, image_url=image_url)
    db.add(db_post); db.commit(); db.refresh(db_post)
    return db_post
def get_posts(db: Session, board_type: str, skip: int = 0, limit: int = 20, search: str = ""):
    query = db.query(models.Post).options(
        joinedload(models.Post.owner),
        selectinload(models.Post.comments)
    ).filter(models.Post.board_type == board_type)
    
    if search:
        search_term = f"%{search.replace(' ', '').lower()}%"
        query = query.filter(or_(
            models.Post.title.ilike(search_term),
            models.Post.content.ilike(search_term)
        ))
        
    return query.order_by(desc(models.Post.created_at)).offset(skip).limit(limit).all()

def get_posts_by_owner(db: Session, owner_id: int):
    return db.query(models.Post).filter(models.Post.owner_id == owner_id).order_by(desc(models.Post.created_at)).all()
def get_post(db: Session, post_id: int):
    return db.query(models.Post).options(
        joinedload(models.Post.owner),
        selectinload(models.Post.comments).options(
            joinedload(models.Comment.owner),
            selectinload(models.Comment.replies).options(
                joinedload(models.Comment.owner)
            )
        ),
        selectinload(models.Post.liked_by_users),
        selectinload(models.Post.scrapped_by_users)
    ).filter(models.Post.id == post_id).first()
def create_comment(db: Session, comment: schemas.CommentCreate, owner_id: int, post_id: int, parent_id: int = None):
    db_comment = models.Comment(content=comment.content, owner_id=owner_id, post_id=post_id, parent_id=parent_id)
    db.add(db_comment); db.commit(); db.refresh(db_comment)
    post_owner = db_comment.post.owner
    comment_owner = db_comment.owner
    if post_owner.id != owner_id:
        send_push_notification(db, post_owner.nickname, "내 글에 새 댓글", f"{comment_owner.nickname}: {db_comment.content}")
        create_alert(
            db,
            user_nickname=post_owner.nickname,
            message=f"내 게시글 '{db_comment.post.title}'에 새 댓글이 달렸습니다.",
            related_url=f"/post/{post_id}"
        )
    return db_comment
def toggle_post_like(db: Session, post: models.Post, user: models.User):
    message = ""
    if user in post.liked_by_users:
        post.liked_by_users.remove(user)
        message = "좋아요 취소"
    else:
        post.liked_by_users.append(user)
        message = "좋아요"
        if post.owner_id != user.id:
            create_alert(
                db,
                user_nickname=post.owner.nickname,
                message=f"'{user.nickname}'님이 내 게시글 '{post.title}'을 좋아합니다.",
                related_url=f"/post/{post.id}"
            )
            send_push_notification(db, post.owner.nickname, "내 글에 새로운 좋아요", f"'{user.nickname}'님이 '{post.title}' 글을 좋아합니다.")

    db.commit()
    return message
def toggle_post_scrap(db: Session, post: models.Post, user: models.User):
    if user in post.scrapped_by_users:
        post.scrapped_by_users.remove(user); message = "스크랩 취소"
    else:
        post.scrapped_by_users.append(user); message = "스크랩"
    db.commit(); return message
def get_scrapped_posts(db: Session, user: models.User):
    return user.scrapped_posts

def get_comments_by_owner(db: Session, owner_id: int):
    return db.query(models.Comment).filter(models.Comment.owner_id == owner_id).order_by(desc(models.Comment.created_at)).all()

# =================================================================
# ======================== 클랜 관련 함수들 ========================
# =================================================================

def create_clan(db: Session, clan: schemas.ClanCreate, owner: models.User):
    db_clan = models.Clan(**clan.dict(), owner_id=owner.id)
    db.add(db_clan)
    db.commit()
    db.refresh(db_clan)
    
    owner.clan.append(db_clan)
    db.commit()
    return db_clan

def get_clan(db: Session, clan_id: int):
    return db.query(models.Clan).options(
        selectinload(models.Clan.members),
        selectinload(models.Clan.announcements),
        selectinload(models.Clan.join_requests).joinedload(models.ClanJoinRequest.user),
        selectinload(models.Clan.events)
    ).filter(models.Clan.id == clan_id).first()

def get_clans(db: Session):
    return db.query(models.Clan).all()

def create_clan_join_request(db: Session, clan: models.Clan, user: models.User):
    if user in clan.members: return None, "이미 클랜 멤버입니다."
    existing_request = db.query(models.ClanJoinRequest).filter_by(clan_id=clan.id, user_id=user.id, status="pending").first()
    if existing_request: return None, "이미 가입을 신청했습니다."
    db_request = models.ClanJoinRequest(clan_id=clan.id, user_id=user.id)
    db.add(db_request); db.commit()

    clan_owner = clan.owner
    if clan_owner:
        send_push_notification(
            db, 
            clan_owner.nickname, 
            "클랜 가입 신청", 
            f"'{user.nickname}'님이 '{clan.name}' 클랜에 가입을 신청했습니다."
        )
        create_alert(
            db,
            user_nickname=clan_owner.nickname,
            message=f"'{user.nickname}'님이 클랜 가입을 신청했습니다.",
            related_url=f"/clans/{clan.id}"
        )

    return db_request, "가입 신청을 보냈습니다."

def get_clan_join_request(db: Session, request_id: int):
    # 승인에 필요한 모든 연관 데이터를 한 번에 불러옵니다.
    return db.query(models.ClanJoinRequest).options(
        joinedload(models.ClanJoinRequest.user),
        joinedload(models.ClanJoinRequest.clan).selectinload(models.Clan.members)
    ).filter(models.ClanJoinRequest.id == request_id).first()

# ✅ 2. 이 함수를 찾아서 아래 내용으로 교체
def approve_clan_join_request(db: Session, request: models.ClanJoinRequest):
    # 만약의 경우를 대비해, ID를 기반으로 DB에서 데이터를 다시 불러와
    # 가장 확실하고 깨끗한 객체 상태에서 작업을 시작합니다.
    clan_to_join = db.query(models.Clan).options(selectinload(models.Clan.members)).filter(models.Clan.id == request.clan_id).first()
    user_to_add = db.query(models.User).filter(models.User.id == request.user_id).first()

    if not user_to_add or not clan_to_join:
        return False, "사용자 또는 클랜 정보를 찾을 수 없습니다."

    # 멤버 추가 로직
    if user_to_add not in clan_to_join.members:
        clan_to_join.members.append(user_to_add)
    
    request.status = "approved"
    
    try:
        db.commit()
    except Exception as e:
        db.rollback() # 오류 발생 시 DB 변경사항을 되돌립니다.
        print(f"클랜 승인 중 DB 오류 발생: {e}")
        return False, "데이터베이스 저장 중 오류가 발생했습니다."

    return True, "가입이 승인되었습니다."

def reject_clan_join_request(db: Session, request: models.ClanJoinRequest):
    request.status = "rejected"; db.commit()

def remove_clan_member(db: Session, clan: models.Clan, member: models.User):
    if member in clan.members:
        clan.members.remove(member)
        db.commit()
        return True
    return False
    
def create_clan_announcement(db: Session, clan: models.Clan, title: str, content: str):
    announcement = models.ClanAnnouncement(clan_id=clan.id, title=title, content=content)
    db.add(announcement); db.commit(); db.refresh(announcement)
    for member in clan.members:
        if member.id != clan.owner_id:
            send_push_notification(db, member.nickname, f"클랜 '{clan.name}' 공지", title)
    return announcement

def create_clan_event(db: Session, clan_id: int, event: schemas.ClanEventCreate, owner: models.User):
    db_event = models.ClanEvent(clan_id=clan_id, title=event.title, description=event.description, date=event.date)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    clan = get_clan(db, clan_id)
    for member in clan.members:
        if member.id != owner.id:
            send_push_notification(db, member.nickname, f"클랜 '{clan.name}' 새 일정", event.title)
    return db_event

def get_clan_events(db: Session, clan_id: int):
    return db.query(models.ClanEvent).filter(models.ClanEvent.clan_id == clan_id).order_by(models.ClanEvent.date.asc()).all()

def delete_clan_event(db: Session, event_id: int):
    db_event = db.query(models.ClanEvent).filter(models.ClanEvent.id == event_id).first()
    if db_event:
        db.delete(db_event)
        db.commit()
        return True
    return False

def get_room_availability(db: Session, room_id: int):
    availabilities = db.query(models.RoomAvailability).options(
        joinedload(models.RoomAvailability.user)
    ).filter(models.RoomAvailability.room_id == room_id).all()
    
    slots_map = {}
    for availability in availabilities:
        slot_time = availability.available_slot
        if slot_time not in slots_map:
            slots_map[slot_time] = []
        slots_map[slot_time].append(availability.user)
    
    result = [
        schemas.AvailabilitySlot(time=time, voters=voters)
        for time, voters in slots_map.items()
    ]
    return sorted(result, key=lambda x: x.time)


def update_user_availability(db: Session, room_id: int, user_id: int, slots: List[datetime]):
    db.query(models.RoomAvailability).filter(
        models.RoomAvailability.room_id == room_id,
        models.RoomAvailability.user_id == user_id
    ).delete()

    for slot in slots:
        db_availability = models.RoomAvailability(
            room_id=room_id,
            user_id=user_id,
            available_slot=slot
        )
        db.add(db_availability)
    
    db.commit()