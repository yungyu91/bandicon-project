# [전체 코드] backend/models.py
from sqlalchemy import (Column, Integer, String, Boolean, JSON, ForeignKey,
                        Table, DateTime, Float)
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from .database import Base

# --- 연결 테이블들 ---
friendship_table = Table('friendships', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('friend_id', Integer, ForeignKey('users.id'), primary_key=True)
)
post_likes = Table('post_likes', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True)
)
post_scraps = Table('post_scraps', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True)
)
clan_members_table = Table('clan_members', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('clan_id', Integer, ForeignKey('clans.id'), primary_key=True)
)
event_attendees_table = Table('event_attendees', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('event_id', Integer, ForeignKey('clan_events.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    nickname = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String)
    email = Column(String, unique=True, nullable=True)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    skills = Column(JSON)
    manner_score = Column(String, default="루키", nullable=False)
    badges = Column(Integer, default=0)
    profile_img = Column(String, nullable=True)
    role = Column(String, default="멤버")
    status = Column(String, default="pending")
    marketing_consent = Column(Boolean, default=False) # ✅ 이 줄을 추가하세요.

    # clan_id = Column(Integer, ForeignKey("clans.id"), nullable=True)

    friends = relationship("User", secondary=friendship_table,
                           primaryjoin=id==friendship_table.c.user_id,
                           secondaryjoin=id==friendship_table.c.friend_id)
    sent_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.sender_id", back_populates="sender")
    received_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.receiver_id", back_populates="receiver")
    posts = relationship("Post", back_populates="owner")
    comments = relationship("Comment", back_populates="owner")
    liked_posts = relationship("Post", secondary=post_likes, back_populates="liked_by_users")
    scrapped_posts = relationship("Post", secondary=post_scraps, back_populates="scrapped_by_users")
    clan = relationship("Clan", secondary=clan_members_table, back_populates="members")
    owned_clan = relationship("Clan", back_populates="owner", uselist=False, foreign_keys="Clan.owner_id")
    join_requests = relationship("ClanJoinRequest", back_populates="user")
    attended_events = relationship("ClanEvent", secondary=event_attendees_table, back_populates="attendees")
    device_tokens = relationship("DeviceToken", back_populates="user")
    availabilities = relationship("RoomAvailability", back_populates="user")
    session_reservations = relationship("SessionReservation", back_populates="user")


class DeviceToken(Base):
    __tablename__ = "device_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String, unique=True, nullable=False)
    user = relationship("User", back_populates="device_tokens")

class FriendRequest(Base):
    __tablename__ = "friend_requests"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_friend_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_friend_requests")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    song = Column(String, nullable=False)
    artist = Column(String, nullable=False)
    description = Column(String)
    is_private = Column(Boolean, default=False)
    password = Column(String, nullable=True)
    manager_nickname = Column(String, nullable=False)
    confirmed = Column(Boolean, default=False)
    ended = Column(Boolean, default=False)
    sessions = relationship("Session", back_populates="room", cascade="all, delete-orphan")
    chats = relationship("GroupChat", back_populates="room", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    session_name = Column(String, nullable=False)
    participant_nickname = Column(String, nullable=True)
    room = relationship("Room", back_populates="sessions")
    reservations = relationship("SessionReservation", back_populates="session", cascade="all, delete-orphan")

class SessionReservation(Base):
    __tablename__ = "session_reservations"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    session = relationship("Session", back_populates="reservations")
    user = relationship("User", back_populates="session_reservations")

class Evaluation(Base):
    __tablename__ = "evaluations"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer)
    evaluator_nickname = Column(String)
    evaluated_nickname = Column(String)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_nickname = Column(String, index=True)
    message = Column(String)
    related_url = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class GroupChat(Base):
    __tablename__ = 'group_chats'
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey('rooms.id'))
    sender = Column(String)
    message = Column(String, nullable=True)
    timestamp = Column(String)
    image_url = Column(String, nullable=True)
    room = relationship("Room", back_populates="chats")

class DirectChat(Base):
    __tablename__ = 'direct_chats'
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String)
    receiver = Column(String)
    message = Column(String, nullable=True)
    timestamp = Column(String)
    image_url = Column(String, nullable=True)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    board_type = Column(String)
    is_anonymous = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    liked_by_users = relationship("User", secondary=post_likes, back_populates="liked_posts")
    scrapped_by_users = relationship("User", secondary=post_scraps, back_populates="scrapped_posts")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    owner = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    replies = relationship("Comment", backref=backref('parent', remote_side=[id]), cascade="all, delete-orphan")

class Clan(Base):
    __tablename__ = "clans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_clan")
    members = relationship("User", secondary=clan_members_table, back_populates="clan")
    announcements = relationship("ClanAnnouncement", back_populates="clan", cascade="all, delete-orphan")
    join_requests = relationship("ClanJoinRequest", back_populates="clan", cascade="all, delete-orphan")
    ledger = relationship("ClanLedger", back_populates="clan", cascade="all, delete-orphan")
    events = relationship("ClanEvent", back_populates="clan", cascade="all, delete-orphan")

class ClanJoinRequest(Base):
    __tablename__ = "clan_join_requests"
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending")
    clan = relationship("Clan", back_populates="join_requests")
    user = relationship("User", back_populates="join_requests")

class ClanAnnouncement(Base):
    __tablename__ = "clan_announcements"
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    title = Column(String)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    clan = relationship("Clan", back_populates="announcements")

class ClanLedger(Base):
    __tablename__ = "clan_ledger"
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(String)
    amount = Column(Float)
    clan = relationship("Clan", back_populates="ledger")

class ClanEvent(Base):
    __tablename__ = "clan_events"
    id = Column(Integer, primary_key=True, index=True)
    clan_id = Column(Integer, ForeignKey("clans.id"))
    title = Column(String)
    date = Column(DateTime)
    description = Column(String)
    clan = relationship("Clan", back_populates="events")
    attendees = relationship("User", secondary=event_attendees_table, back_populates="attended_events")

class RoomAvailability(Base):
    __tablename__ = "room_availabilities"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    available_slot = Column(DateTime, nullable=False)

    room = relationship("Room")
    user = relationship("User", back_populates="availabilities")

# ✅ 파일 맨 아래에 이 클래스를 추가해주세요.
class VerificationCode(Base):
    __tablename__ = "verification_codes"
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)