# [전체 코드] backend/schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

# [추가] User 스키마 내부에 중첩해서 사용할 간단한 클랜 정보 스키마
class ClanInfo(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    nickname: str
    profile_img: Optional[str] = None
    class Config: from_attributes = True

class User(UserBase):
    id: int
    username: str
    phone: str
    email: Optional[str] = None
    phone_verified: bool
    email_verified: bool
    skills: Dict[str, int]
    manner_score: str
    badges: int
    role: str
    status: str
    clan: List[ClanInfo] = [] # [수정] clan_id를 제거한 자리에 이 코드를 추가
    class Config: from_attributes = True

class UserCreate(BaseModel):
    id: str
    password: str
    nickname: str
    phone: str
    email: Optional[str] = None
    skills: Dict[str, int]
    role: str
    marketing_consent: bool = False # ✅ 이 줄을 추가하세요.

class UserLogin(BaseModel):
    id: str
    password: str

class FriendRequestCreate(BaseModel):
    sender: str
    receiver: str

class FriendRequestAccept(BaseModel):
    request_id: int

class FriendRequest(BaseModel):
    id: int
    sender: User
    status: str
    class Config: from_attributes = True

class FriendsList(BaseModel):
    friends: List[User]
    pending_requests: List[FriendRequest]
    class Config: from_attributes = True

class SessionReservation(BaseModel):
    id: int
    user: UserBase
    class Config: from_attributes = True

class SessionBase(BaseModel):
    session_name: str
    participant_nickname: Optional[str] = None
    reservations: List[SessionReservation] = []
    class Config: from_attributes = True

class RoomCreate(BaseModel):
    title: str
    song: str
    artist: str
    description: Optional[str] = ""
    is_private: bool
    password: Optional[str] = None
    sessions: List[str]
    manager_id: str

class Room(BaseModel):
    id: int
    title: str
    song: str
    artist: str
    description: Optional[str]
    is_private: bool
    manager_nickname: str
    confirmed: bool
    ended: bool
    sessions: List[SessionBase] = []
    class Config: from_attributes = True

class ChatMessage(BaseModel):
    sender: str
    message: Optional[str] = None
    timestamp: str
    image_url: Optional[str] = None
    class Config: from_attributes = True

class GroupChatMessage(ChatMessage):
    id: int
    room_id: int

class DirectChatMessage(ChatMessage):
    id: int
    receiver: str

class MannerEval(BaseModel):
    room_id: int
    evaluator: str
    scores: Dict[str, int]
    mood_maker: Optional[str] = None

class Alert(BaseModel):
    id: int
    message: str
    related_url: Optional[str] = None
    is_read: bool
    created_at: datetime
    class Config: from_attributes = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    post_id: int  # [추가] 이 줄을 추가하여 API 응답에 post_id가 포함되도록 합니다.
    parent_id: Optional[int] = None
    created_at: datetime
    owner: Optional[User]
    replies: List['Comment'] = []
    anonymous_nickname: Optional[str] = None
    class Config: from_attributes = True
Comment.update_forward_refs()

class PostBase(BaseModel):
    title: str
    content: str
    board_type: str

class PostCreate(PostBase):
    is_anonymous: bool = False

class Post(BaseModel):
    id: int
    title: str
    content: str
    board_type: str
    created_at: datetime
    image_url: Optional[str] = None
    owner: Optional[User]
    comments: List[Comment] = []
    likes_count: int = 0
    is_liked: bool = False
    is_scrapped: bool = False
    is_anonymous: bool = False
    class Config: from_attributes = True

class PostList(BaseModel):
    id: int
    title: str
    board_type: str
    owner: Optional[User]
    created_at: datetime
    likes_count: int
    comments_count: int
    is_anonymous: bool = False
    class Config: from_attributes = True

# --- 클랜 ---
class ClanBase(BaseModel):
    name: str
    description: Optional[str] = None

class ClanCreate(ClanBase):
    pass

class ClanAnnouncement(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    class Config: from_attributes = True

class ClanJoinRequest(BaseModel):
    id: int
    user: UserBase
    status: str
    class Config: from_attributes = True

class ClanEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: datetime

class ClanEventCreate(ClanEventBase):
    pass

class ClanEvent(ClanEventBase):
    id: int
    class Config: from_attributes = True

class Clan(ClanBase):
    id: int
    owner: UserBase
    members: List[UserBase]
    announcements: List[ClanAnnouncement] = []
    join_requests: List[ClanJoinRequest] = []
    events: List[ClanEvent] = []
    class Config: from_attributes = True

# --- 푸시 토큰 ---
class DeviceTokenIn(BaseModel):
    token: str

# --- 방 스케줄 ---
class AvailabilitySlot(BaseModel):
    time: datetime
    voters: List[UserBase]
    class Config: from_attributes = True

class UpdateAvailabilityRequest(BaseModel):
    slots: List[str]