// [전체 코드] src/features/clan/ClanDetail.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete, apiPostForm } from "../../api/api";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// 공지 폼
const AnnounceForm = ({ user, clanId, isOwner, onPosted }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  if (!isOwner) return null;

  const postAnnounce = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      fd.append("nickname", user.nickname);
      await apiPostForm(`/clans/${clanId}/announcements`, fd);
      setOpen(false);
      setTitle("");
      setContent("");
      onPosted?.();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "공지 등록 실패");
    }
  };

  return (
    <div style={{ margin: "16px 0" }}>
      {!open ? (
        <button onClick={() => setOpen(true)}>+ 공지 올리기 (클랜장)</button>
      ) : (
        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>제목</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>내용</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              style={{ width: "100%", resize: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={postAnnounce}>등록</button>
            <button onClick={() => setOpen(false)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
};

// 가입 요청
const JoinRequests = ({ user, isOwner, clan, onAction }) => {
  if (!isOwner) return null;
  const pending = (clan.join_requests || []).filter((r) => r.status === "pending");
  if (pending.length === 0) return null;

  const approve = async (reqId) => {
    try {
      await apiPost(`/clans/requests/${reqId}/approve?nickname=${encodeURIComponent(user.nickname)}`);
      onAction?.();
    } catch (e) {
      console.error(e);
      alert("승인 실패");
    }
  };
  const reject = async (reqId) => {
    try {
      await apiPost(`/clans/requests/${reqId}/reject?nickname=${encodeURIComponent(user.nickname)}`);
      onAction?.();
    } catch (e) {
      console.error(e);
      alert("거절 실패");
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>가입 신청</h3>
      <ul style={{ paddingLeft: 18 }}>
        {pending.map((r) => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            {r.user?.nickname}
            <button onClick={() => approve(r.id)} style={{ marginLeft: 8 }}>
              승인
            </button>
            <button onClick={() => reject(r.id)} style={{ marginLeft: 6 }}>
              거절
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// 멤버 목록
const Members = ({ user, clan, isOwner, onKicked }) => {
  const kick = async (targetNickname) => {
    if (!window.confirm(`${targetNickname} 님을 강퇴할까요?`)) return;
    try {
      await apiDelete(
        `/clans/${clan.id}/members/${encodeURIComponent(
          targetNickname
        )}?nickname=${encodeURIComponent(user.nickname)}`
      );
      onKicked?.();
    } catch (e) {
      console.error(e);
      alert("강퇴 실패");
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>멤버 ({clan.members.length}명)</h3>
      <ul style={{ paddingLeft: 18, listStyle: 'none' }}>
        {clan.members.map((m) => (
          <li key={m.nickname} style={{ marginBottom: 6 }}>
            {m.nickname}
            {m.nickname === clan.owner.nickname && (
              <span style={{ marginLeft: 6, fontSize: 12, color: "blue", fontWeight: 'bold' }}>(클랜장)</span>
            )}
            {isOwner && m.nickname !== clan.owner.nickname && (
              <button onClick={() => kick(m.nickname)} style={{ marginLeft: 8, fontSize: '0.8em', padding: '2px 4px' }}>
                강퇴
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

// 클랜 캘린더
const ClanCalendar = ({ user, clanId, isOwner, events, onAction }) => {
    const [date, setDate] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const handleCreateEvent = async () => {
        if (!title.trim()) return alert("일정 제목을 입력해주세요.");
        try {
            await apiPost(`/clans/${clanId}/events`, {
                title, description, date: date.toISOString(),
            }, { params: { nickname: user.nickname }});
            alert("일정이 추가되었습니다.");
            onAction();
            setShowForm(false);
            setTitle("");
            setDescription("");
        } catch (err) {
            alert(err.response?.data?.detail || "일정 추가 실패");
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("이 일정을 삭제하시겠습니까?")) return;
        try {
            await apiDelete(`/clans/events/${eventId}?nickname=${user.nickname}`);
            alert("일정이 삭제되었습니다.");
            onAction();
        } catch(err) {
            alert(err.response?.data?.detail || "일정 삭제 실패");
        }
    };

    const getEventsForDate = (d) => {
        return (events || []).filter(e => {
            const eventDate = new Date(e.date);
            return eventDate.getFullYear() === d.getFullYear() &&
                   eventDate.getMonth() === d.getMonth() &&
                   eventDate.getDate() === d.getDate();
        });
    }

    return (
        <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 10 }}>
            <h3>클랜 캘린더</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                    <Calendar
                        onChange={setDate}
                        value={date}
                        tileContent={({ date, view }) => {
                            if (view === 'month' && getEventsForDate(date).length > 0) {
                                return <div style={{ height: '8px', width: '8px', background: 'red', borderRadius: '50%', margin: 'auto', marginTop: '4px' }}></div>;
                            }
                        }}
                    />
                    {isOwner && <button onClick={() => setShowForm(!showForm)} style={{ marginTop: 10, width: '100%' }}>{showForm ? '취소' : '+ 새 일정 추가'}</button>}
                </div>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h4>{date.toLocaleDateString()} 일정</h4>
                    {getEventsForDate(date).length === 0 ? (
                        <p>선택한 날짜에 일정이 없습니다.</p>
                    ) : (
                        <ul>
                            {getEventsForDate(date).map(e => (
                                <li key={e.id}>
                                    <strong>{e.title}</strong>
                                    {e.description && <p style={{margin: '4px 0', color: '#666'}}>{e.description}</p>}
                                    {isOwner && <button onClick={() => handleDeleteEvent(e.id)}>삭제</button>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {isOwner && showForm && (
                <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 10 }}>
                    <h4>{date.toLocaleDateString()} 새 일정 추가</h4>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="일정 제목" style={{ width: '100%', marginBottom: 8, padding: 8 }} />
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="설명 (선택)" style={{ width: '100%', marginBottom: 8, padding: 8, height: 60 }}/>
                    <button onClick={handleCreateEvent}>추가하기</button>
                </div>
            )}
        </div>
    );
};


// 메인 컴포넌트
const ClanDetail = ({ user }) => {
  const { clanId } = useParams();
  const navigate = useNavigate();
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClan = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/clans/${clanId}`);
      setClan(data);
    } catch (e) {
      console.error(e);
      alert("클랜 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [clanId]);

  useEffect(() => {
    fetchClan();
  }, [fetchClan]);

  const isOwner = user && clan && clan.owner?.nickname === user.nickname;
  const isMember = user && clan && (clan.members || []).some((m) => m.nickname === user.nickname);

  const requestJoin = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    try {
      const res = await apiPost(`/clans/${clanId}/join?nickname=${encodeURIComponent(user.nickname)}`);
      alert(res?.message || "가입 신청을 보냈습니다.");
      fetchClan();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "가입 신청 실패");
    }
  };

  if (loading) return <div style={{ padding: 20 }}>로딩중…</div>;
  if (!clan) return <div style={{ padding: 20 }}>존재하지 않는 클랜입니다.</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => navigate(-1)}>← 뒤로</button>
        {!isMember && ( // [수정] isOwner 조건 제거, 멤버가 아닐 때만 가입신청 보이기
          <button onClick={requestJoin}>클랜 가입 신청</button>
        )}
      </div>

      <h2 style={{ margin: 0 }}>{clan.name}</h2>
      {clan.description && <div style={{ color: "#666", marginTop: 4 }}>{clan.description}</div>}

      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10}}>
        <div style={{flex: 1, minWidth: '200px'}}>
          <Members user={user} clan={clan} isOwner={isOwner} onKicked={fetchClan} />
        </div>
        <div style={{flex: 1, minWidth: '200px'}}>
          <JoinRequests user={user} isOwner={isOwner} clan={clan} onAction={fetchClan} />
        </div>
      </div>
      
      {/* [수정] isMember일 경우에만 공지사항과 캘린더를 보여줍니다. */}
      {isMember && (
        <>
          <div style={{borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10}}>
            <h3 style={{ marginTop: 20, marginBottom: 8 }}>공지</h3>
            {(clan.announcements || []).length === 0 ? (
              <div>아직 공지가 없습니다.</div>
            ) : (
              <ul style={{ paddingLeft: 18, listStyle: 'none' }}>
                {clan.announcements
                  .slice()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((a) => (
                    <li key={a.id} style={{ marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ whiteSpace: "pre-wrap", color: '#333' }}>{a.content}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            <AnnounceForm user={user} clanId={clan.id} isOwner={isOwner} onPosted={fetchClan} />
          </div>

          <ClanCalendar user={user} clanId={clan.id} isOwner={isOwner} events={clan.events || []} onAction={fetchClan} />
        </>
      )}
    </div>
  );
};

export default ClanDetail;