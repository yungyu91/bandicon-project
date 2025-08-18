import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../api/api";

export default function CreateRoomForm({ user }) {
  const [title, setTitle] = useState("");
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const availableSessions = ["보컬", "리드기타", "리듬기타", "베이스", "드럼", "키보드"];

  const toggleSession = (session) => {
    setSessions((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !song || !artist) {
      setError("방제, 곡 제목, 아티스트는 반드시 입력해야 합니다.");
      return;
    }
    if (sessions.length === 0) {
      setError("세션을 하나 이상 선택해야 합니다.");
      return;
    }

    try {
      const data = {
        title,
        song,
        artist,
        description,
        is_private: isPrivate,
        password: isPrivate ? password : null,
        sessions,
        manager_id: user.nickname,
      };

      const res = await apiPost("/rooms", data);
      alert("방이 성공적으로 생성되었습니다.");
      navigate(`/rooms/${res.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "방 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: '600px', margin: 'auto' }}>
      <h2>방 생성</h2>
      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom: '10px'}}>
          <label>방제:</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>곡 제목: <span style={{fontSize: '0.8em', color: '#666'}}>철자를 틀리지 않게 유의해주세요.</span></label>
          <input value={song} onChange={(e) => setSong(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>아티스트: <span style={{fontSize: '0.8em', color: '#666'}}>철자를 틀리지 않게 유의해주세요.</span></label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>방 설명:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{width: '100%', padding: '8px', boxSizing: 'border-box', height: '80px'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => {
                setIsPrivate(e.target.checked);
                if (!e.target.checked) {
                    setPassword(""); // 체크 해제 시 비밀번호 초기화
                }
              }}
            />
            비밀방
          </label>
          {isPrivate && (
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{marginLeft: '10px'}}
            />
          )}
        </div>
        <div style={{border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginBottom: '20px'}}>
          <p>필요한 세션을 선택해주세요 (중복 가능):</p>
          {availableSessions.map((session) => (
            <label key={session} style={{ marginRight: '15px', display: 'inline-block' }}>
              <input
                type="checkbox"
                checked={sessions.includes(session)}
                onChange={() => toggleSession(session)}
              />
              {session}
            </label>
          ))}
        </div>
        <button type="submit" style={{width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>방 생성하기</button>
      </form>
    </div>
  );
}