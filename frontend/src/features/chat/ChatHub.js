// [전체 코드] src/features/chat/ChatHub.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPostForm } from "../../api/api"; // apiPostForm 추가
import RoomChat from '../../components/RoomChat';
import DirectChat from './DirectChat';

const ChatHub = ({ user }) => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [roomInfo, setRoomInfo] = useState(null);

    const fetchRoomInfo = useCallback(async () => {
        if (type === 'group' && id && id !== '0') {
            try {
                const data = await apiGet(`/rooms/${id}`);
                setRoomInfo(data);
            } catch (error) {
                console.error("방 정보 가져오기 실패:", error);
                navigate("/chats");
            }
        }
    }, [type, id, navigate]);

    useEffect(() => {
        fetchRoomInfo();
        
        // [추가] 채팅방에 들어오면 해당 채팅방의 메시지를 모두 '읽음'으로 처리
        const markAsRead = async () => {
            if (type && id && user?.nickname) {
                const chatUrl = `/chats/${type}/${id}`;
                const formData = new FormData();
                formData.append('nickname', user.nickname);
                formData.append('chat_url', chatUrl);
                try {
                    await apiPostForm("/chats/read", formData);
                } catch (e) {
                    console.error("메시지 읽음 처리 실패:", e);
                }
            }
        };
        markAsRead();

    }, [type, id, user, fetchRoomInfo]);

    const backButtonStyle = {
        position: 'absolute',
        top: '15px',
        left: '20px',
        background: 'rgba(0,0,0,0.1)',
        border: 'none',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        cursor: 'pointer',
        fontSize: '1.2em',
        lineHeight: '30px'
    }

    return (
        // [수정] 높이 스타일을 제거하고 className에 위임
        <div className="chat-page-container">
            <button style={backButtonStyle} onClick={() => navigate('/chats')}>←</button>
            
            {type === 'group' && id !== '0' && roomInfo && (
                <RoomChat key={`room-chat-${id}`} roomId={id} roomInfo={roomInfo} user={user} />
            )}
            {type === 'direct' && id !== '0' && (
                <DirectChat key={`direct-chat-${id}`} friendNickname={id} user={user} />
            )}
        </div>
    );
};

export default ChatHub;