// [전체 코드] src/features/rooms/RoomDetail.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPostForm } from "../../api/api";
import RoomChat from '../../components/RoomChat';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const toLocalISOString = (date) => {
    const pad = (num) => (num < 10 ? '0' + num : num);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00:00`;
};

const RoomScheduler = ({ user, room }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availability, setAvailability] = useState([]);
    const [mySelection, setMySelection] = useState(new Set());
    const [participants, setParticipants] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const pSet = new Set(room.sessions.map(s => s.participant_nickname).filter(Boolean));
        pSet.add(room.manager_nickname);
        setParticipants(Array.from(pSet));
    }, [room]);
    
    const fetchAvailability = useCallback(async () => {
        try {
            const data = await apiGet(`/rooms/${room.id}/availability`);
            setAvailability(data || []);
            const initialSelection = new Set();
            (data || []).forEach(slot => {
                if (slot.voters.some(v => v.nickname === user.nickname)) {
                    initialSelection.add(toLocalISOString(new Date(slot.time)));
                }
            });
            setMySelection(initialSelection);
        } catch (err) {
            console.error("스케줄 로딩 실패", err);
        }
    }, [room.id, user.nickname]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    const handleSlotClick = (localISOString) => {
        const newSelection = new Set(mySelection);
        if (newSelection.has(localISOString)) {
            newSelection.delete(localISOString);
        } else {
            newSelection.add(localISOString);
        }
        setMySelection(newSelection);
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiPost(
                `/rooms/${room.id}/availability?nickname=${encodeURIComponent(user.nickname)}`, 
                { slots: Array.from(mySelection) }
            );
            alert("가능 시간을 저장했습니다.");
            await fetchAvailability();
        } catch(err) {
            alert(err.response?.data?.detail || "저장 실패");
        } finally {
            setIsSaving(false);
        }
    };

    const timeSlots = useMemo(() => {
        const slots = [];
        const date = new Date(selectedDate);
        for (let hour = 0; hour <= 23; hour++) {
            date.setHours(hour, 0, 0, 0);
            slots.push(new Date(date));
        }
        return slots;
    }, [selectedDate]);
    
    const perfectSlots = useMemo(() => {
        if (availability.length === 0 || participants.length < 2) return [];
        return availability
            .filter(slot => slot.voters.length === participants.length)
            .sort((a, b) => new Date(a.time) - new Date(b.time));
    }, [availability, participants.length]);

    const pendingMembers = useMemo(() => {
        const participatedMembers = new Set();
        availability.forEach(slot => {
            slot.voters.forEach(voter => {
                participatedMembers.add(voter.nickname);
            });
        });
        return participants.filter(p => !participatedMembers.has(p));
    }, [availability, participants]);


    return (
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
            <h3>합주 스케줄 조율</h3>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{minWidth: '280px'}}>
                    <Calendar onChange={setSelectedDate} value={selectedDate} />
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h4>{selectedDate.toLocaleDateString()} 가능 시간 선택</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto', padding: '5px' }}>
                        {timeSlots.map(time => {
                            const localISO = toLocalISOString(time);
                            const slotData = availability.find(s => toLocalISOString(new Date(s.time)) === localISO);
                            const voters = slotData ? slotData.voters : [];
                            const voterCount = voters.length;
                            const isSelectedByMe = mySelection.has(localISO);
                            const opacity = voterCount > 0 ? 0.3 + (voterCount / participants.length) * 0.7 : 0.3;
                            
                            return (
                                <div key={localISO}>
                                    <button
                                        onClick={() => handleSlotClick(localISO)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 5px',
                                            border: isSelectedByMe ? '2px solid blue' : '1px solid #ccc',
                                            background: `rgba(76, 175, 80, ${opacity})`,
                                            color: voterCount > (participants.length / 2) ? 'white' : 'black',
                                            fontWeight: isSelectedByMe ? 'bold' : 'normal',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            borderRadius: '5px'
                                        }}
                                    >
                                        <div>{time.getHours()}:00</div>
                                        <div style={{fontSize: '0.8em'}}>({voterCount}/{participants.length})</div>
                                    </button>
                                    {/* [수정] 참여자 닉네임을 보여주는 UI */}
                                    <div style={{fontSize: '11px', color: '#555', marginTop: '4px', textAlign: 'center'}}>
                                        {voters.slice(0, 3).map(voter => (
                                            <div key={voter.nickname} title={voter.nickname}>
                                                {voter.nickname}
                                            </div>
                                        ))}
                                        {voters.length > 3 && (
                                            <div>+{voters.length - 3}명</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={handleSave} disabled={isSaving} style={{width: '100%', marginTop: '10px', padding: '10px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
                        {isSaving ? '저장 중...' : '내 가능 시간 저장'}
                    </button>
                </div>
            </div>
             
            <div style={{marginTop: 15, padding: 10, borderRadius: 5, background: '#f0f8ff', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '250px'}}>
                    <h4>✅ 모두가 가능한 시간</h4>
                    {perfectSlots.length > 0 ? (
                        <ul style={{paddingLeft: 20, margin: 0}}>
                            {perfectSlots.map(slot => (
                                <li key={slot.time} style={{marginBottom: 5}}>
                                    {new Date(slot.time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: 'numeric' })}
                                </li>
                            ))}
                        </ul>
                    ) : <p style={{fontSize: '0.9em', color: '#666'}}>아직 모든 멤버가 가능한 시간이 없습니다.</p>}
                </div>
                <div style={{flex: 1, minWidth: '250px'}}>
                    <h4>👀 미참여 멤버</h4>
                    {pendingMembers.length > 0 ? (
                        <p style={{fontSize: '0.9em', color: '#666'}}>{pendingMembers.join(', ')}</p>
                    ) : <p style={{fontSize: '0.9em', color: 'green'}}>모든 멤버가 참여했습니다!</p>}
                </div>
            </div>
        </div>
    );
};


const RoomDetail = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await apiGet(`/rooms/${roomId}`);
      setRoom(data);
    } catch (err) {
      console.error("방 정보 불러오기 실패:", err);
      if(!room) {
        alert("방 정보를 찾을 수 없습니다.");
        navigate('/rooms');
      }
    }
  }, [roomId, navigate, room]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const handleConfirmRoom = async () => {
    if (!window.confirm("모든 멤버가 모였습니다. 방을 확정하시겠습니까?")) return;
    try {
      await apiPost(`/rooms/${room.id}/confirm`, null, {params: {manager_nickname: user.nickname}});
      alert("방이 확정되었습니다. 이제 합주를 시작할 수 있습니다.");
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.detail || "방 확정 실패");
    }
  };

  const handleEndRoom = async () => {
    if (!window.confirm("합주를 종료하고 평가를 시작하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      const res = await apiPost(`/rooms/${room.id}/end`, null, {params: {manager_nickname: user.nickname}});
      if (res.success) {
        alert("합주 종료! 각자 합주 평가를 진행하게 됩니다.");
        navigate("/");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "합주 종료 중 오류가 발생했습니다.");
    }
  };

  const handleLeaveSession = async (sessionName) => {
    if (!window.confirm(`'${sessionName}' 세션 참여를 취소하시겠습니까?`)) return;
    try {
        const formData = new FormData();
        formData.append('room_id', String(room.id));
        formData.append('session_name', sessionName);
        formData.append('nickname', user.nickname);
        const res = await apiPostForm("/rooms/leave", formData);
        alert(res.message);
        fetchRoom();
    } catch (err) {
        alert(err.response?.data?.detail || "참여 취소 실패");
    }
  };


  if (!room) return <div>로딩중...</div>;

  const isManager = room.manager_nickname === user.nickname;
  const isParticipant = isManager || room.sessions.some(s => s.participant_nickname === user.nickname);

  return (
    <div className="room-detail" style={{maxWidth: '800px', margin: 'auto', padding: '20px'}}>
      <button onClick={() => navigate(-1)} style={{marginBottom: '20px'}}>← 뒤로가기</button>
      
      <h2>{room.title} {room.is_private ? "🔒" : ""}</h2>
      <h3>{room.song} / {room.artist}</h3>
      <p>방장: {room.manager_nickname}</p>
      <div style={{background: '#f9f9f9', padding: '10px', borderRadius: '5px', marginBottom: '20px'}}>
        <strong>방 설명:</strong>
        <p style={{whiteSpace: 'pre-wrap', margin: '5px 0 0 0'}}>{room.description || "설명 없음"}</p>
      </div>
      {room.ended && <p style={{color: 'red', fontWeight: 'bold', fontSize: '1.2em', textAlign: 'center'}}>이 합주는 종료되었습니다.</p>}

      <h3>세션 참가 현황</h3>
      <ul style={{listStyle: 'none', padding: 0}}>
        {room.sessions.map((session) => (
          <li key={session.session_name} style={{marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px'}}>
            <strong>{session.session_name}</strong>: 
            {session.participant_nickname ? 
                <span>
                    <strong>{session.participant_nickname}</strong>
                    {session.participant_nickname === user.nickname && !room.confirmed && !room.ended && (
                        <button onClick={() => handleLeaveSession(session.session_name)} style={{marginLeft: '10px', background: '#ff4d4f', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer'}}>
                            참여 취소
                        </button>
                    )}
                </span> 
                : 
                "빈 자리"
            }
          </li>
        ))}
      </ul>

      {isManager && !room.confirmed && !room.ended && (
        <button onClick={handleConfirmRoom} style={{width: '100%', padding: '10px', background: 'green', color: 'white', cursor: 'pointer', border: 'none', borderRadius: 5, fontSize: '1.1em'}}>방 확정하기</button>
      )}
      {isManager && room.confirmed && !room.ended && (
        <button onClick={handleEndRoom} style={{width: '100%', padding: '10px', background: 'darkred', color: 'white', cursor: 'pointer', border: 'none', borderRadius: 5, fontSize: '1.1em'}}>합주 종료 및 평가 시작</button>
      )}

      {isParticipant && !room.ended && (
        room.confirmed ? (
          <RoomScheduler user={user} room={room} />
        ) : (
          <div style={{ border: '1px dashed #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'center', color: '#888' }}>
            방이 확정된 후에 일정을 조율할 수 있습니다.
          </div>
        )
      )}

      {(isParticipant) && !room.ended && (
        <RoomChat roomId={room.id} user={user} />
      )}
    </div>
  );
};

export default RoomDetail;