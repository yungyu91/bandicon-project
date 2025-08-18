// [전체 코드] src/features/rooms/RoomList.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPostForm } from '../../api/api';
import { useAlert } from '../../context/AlertContext';

const RoomList = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const fetchRooms = useCallback(async (currentSearch) => {
        try {
            const data = await apiGet(`/rooms?search=${encodeURIComponent(currentSearch)}`);
            setRooms(data || []);
        } catch (error) {
            console.error("방 목록 불러오기 실패:", error);
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchRooms(searchTerm);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchRooms]);

    const handleJoinSession = async (room, sessionName) => {
        let password = "";
        if (room.is_private) {
            password = prompt("비밀번호를 입력하세요:");
            if (password === null) return;
        }
        try {
            const formData = new FormData();
            formData.append('room_id', String(room.id));
            formData.append('session_name', sessionName);
            formData.append('nickname', user.nickname);
            formData.append('password', password);
            const res = await apiPostForm("/rooms/join", formData);
            alert(res.message);
            fetchRooms(searchTerm);
        } catch (err) {
            alert(err.response?.data?.detail || "참가에 실패했습니다.");
        }
    };
    
    const handleLeaveSession = async (room, sessionName) => {
        showAlert(
            "참여 취소",
            `'${room.title}' 방의 '${sessionName}' 세션 참여를 취소하시겠습니까?`,
            async () => {
                try {
                    const formData = new FormData();
                    formData.append('room_id', String(room.id));
                    formData.append('session_name', sessionName);
                    formData.append('nickname', user.nickname);
                    const res = await apiPostForm("/rooms/leave", formData);
                    alert(res.message);
                    fetchRooms(searchTerm);
                } catch (err) {
                    alert(err.response?.data?.detail || "참여 취소 실패");
                }
            }
        );
    };

    const handleReserveSession = async (room, sessionName) => {
        showAlert(
            "세션 예약",
            `'${sessionName}' 세션에 예약하시겠습니까? 자리가 나면 자동으로 참여됩니다.`,
            async () => {
                try {
                    const formData = new FormData();
                    formData.append('room_id', String(room.id));
                    formData.append('session_name', sessionName);
                    formData.append('nickname', user.nickname);
                    const res = await apiPostForm("/rooms/session/reserve", formData);
                    alert(res.message);
                    fetchRooms(searchTerm);
                } catch (err) {
                    alert(err.response?.data?.detail || "예약 실패");
                }
            }
        );
    };

    const handleCancelReservation = async (room, sessionName) => {
        showAlert(
            "예약 취소",
            `'${sessionName}' 세션 예약을 취소하시겠습니까?`,
            async () => {
                try {
                    const formData = new FormData();
                    formData.append('room_id', String(room.id));
                    formData.append('session_name', sessionName);
                    formData.append('nickname', user.nickname);
                    const res = await apiPostForm("/rooms/session/cancel-reservation", formData);
                    alert(res.message);
                    fetchRooms(searchTerm);
                } catch (err) {
                    alert(err.response?.data?.detail || "예약 취소 실패");
                }
            }
        );
    };

    const showReservations = (session) => {
        const title = `'${session.session_name}' 예약 대기 목록 (선착순)`;
        const message = session.reservations.length > 0
            ? session.reservations.map((r, index) => `${index + 1}. ${r.user.nickname}`).join('\n')
            : "예약자가 없습니다.";
        
        showAlert(title, message, () => {}, false);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>전체 방 리스트</h2>
                <button className="btn btn-primary" onClick={() => navigate('/create-room')}>+ 방 생성</button>
            </div>
            <input
                type="text"
                placeholder="제목, 곡명, 아티스트로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {rooms.map(room => (
                    <div key={room.id} className="card" style={{display: 'flex', flexDirection: 'column'}}>
                        <Link to={`/rooms/${room.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>{room.title} {room.is_private ? '🔒' : ''}</h3>
                            <p style={{ margin: '0 0 5px 0' }}>{room.song} - {room.artist}</p>
                            <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>방장: {room.manager_nickname}</p>
                        </Link>
                        
                        <div style={{ flexGrow: 1, borderTop: '1px solid var(--light-gray)', marginTop: '15px', paddingTop: '10px' }}>
                            <ul style={{ 
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '10px 15px',
                                listStyle: 'none', 
                                padding: 0, 
                                margin: 0,
                            }}>
                                {room.sessions.map(session => {
                                    const isReservedByMe = session.reservations.some(r => r.user.nickname === user.nickname);
                                    return (
                                    <li key={session.session_name} style={{ fontSize: '0.9em', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            {session.session_name}:<br/><strong>{session.participant_nickname || '공석'}</strong>
                                            {session.reservations.length > 0 && 
                                                <span onClick={() => showReservations(session)} style={{fontSize: '0.8em', color: 'orange', marginLeft: '4px', cursor: 'pointer', textDecoration: 'underline'}}>
                                                    (예약 {session.reservations.length}명)
                                                </span>
                                            }
                                        </div>
                                        
                                        <div style={{marginTop: '4px'}}>
                                            {!session.participant_nickname && !room.confirmed && (
                                                <button onClick={() => handleJoinSession(room, session.session_name)} className="btn btn-secondary" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px'}}>
                                                    참여
                                                </button>
                                            )}
                                            {session.participant_nickname === user.nickname && !room.confirmed && (
                                                <button onClick={() => handleLeaveSession(room, session.session_name)} className="btn btn-danger" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px'}}>
                                                    취소
                                                </button>
                                            )}
                                            {session.participant_nickname && session.participant_nickname !== user.nickname && !isReservedByMe && !room.confirmed &&(
                                                <button onClick={() => handleReserveSession(room, session.session_name)} className="btn btn-secondary" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px', background: 'orange', color: 'white'}}>
                                                    예약
                                                </button>
                                            )}
                                            {isReservedByMe && !room.confirmed &&(
                                                <button onClick={() => handleCancelReservation(room, session.session_name)} className="btn btn-danger" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px'}}>
                                                    예약취소
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                )})}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RoomList;