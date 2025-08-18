// [전체 코드] src/components/RoomChat.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { apiGet, apiPostForm, API_BASE } from "../api/api";
import { useAlert } from "../context/AlertContext";

const RoomChat = ({ roomId, roomInfo, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messageListRef = useRef(null);
  const isInitialLoad = useRef(true);
  const { showAlert } = useAlert();

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiGet(`/chat/group/${roomId}`);
      setMessages(data || []);
    } catch (err) {
      if (err.response?.status !== 404) console.error("단체 채팅 불러오기 실패:", err);
    }
  }, [roomId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    // [수정] 컴포넌트가 처음 로드될 때만 스크롤을 맨 아래로 이동
    if (messages.length > 0 && isInitialLoad.current && messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        isInitialLoad.current = false;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const formData = new FormData();
    formData.append('sender', user.nickname);
    formData.append('room_id', roomId);
    formData.append('message', input.trim());

    try {
      await apiPostForm(`/chat/group`, formData);
      setInput("");
      await fetchMessages(); // 메시지 전송 후 즉시 새로고침
      // 새 메시지 전송 후에는 항상 맨 아래로 스크롤
      setTimeout(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      alert(err.response?.data?.detail || "메시지 전송 실패");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleImageUploadClick = () => {
      showAlert("알림", "아직 열리지 않은 기능입니다.", () => {}, false);
  };

  return (
    <>
      <div className="chat-header">
        {roomInfo ? (
            <>
                {roomInfo.title}
                <small>{roomInfo.song} - {roomInfo.artist}</small>
            </>
        ) : `단체 채팅 #${roomId}`}
      </div>
      <div ref={messageListRef} className="message-list">
        {messages.map(msg => (
            <div key={msg.id} className={`message-container ${msg.sender === user.nickname ? 'my-message' : 'their-message'}`}>
              {msg.sender !== user.nickname && <div className="message-sender">{msg.sender}</div>}
              <div className="message-bubble">
                {msg.message}
                {msg.image_url && <img src={`${API_BASE}${msg.image_url}`} alt="첨부 이미지" style={{maxWidth: '100%', borderRadius: '10px', marginTop: '5px'}} />}
              </div>
            </div>
        ))}
      </div>
      
      <form onSubmit={handleFormSubmit} className="message-input-form">
        <button type="button" onClick={handleImageUploadClick} style={{border: 'none', background: 'transparent', fontSize: '1.5em', cursor: 'pointer'}}>📎</button>
        <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요" 
            rows="1"
        />
        <button type="submit" className="btn btn-primary">전송</button>
      </form>
    </>
  );
};

export default RoomChat;