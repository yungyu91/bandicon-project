// [전체 코드] src/features/auth/LoginForm.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../../api/api";

const LoginForm = ({ onLogin, installPrompt }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiPost("/login", { id, password });
      if (res.id) {
        onLogin(res);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "로그인 중 오류가 발생했습니다.";
      setError(errorMessage);
    }
  };

  return (
    <div className="form-container">
      <h2 className="page-title">로그인</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>아이디</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            className="input-field"
          />
        </div>
        <div>
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />
        </div>
        {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
                {/* ===== 여기부터 추가 ===== */}
        {installPrompt && (
          <button 
            type="button" 
            onClick={() => installPrompt.prompt()}
            className="btn btn-secondary"
            style={{width: '100%', marginTop: '10px', background: '#4caf50', color: 'white'}}
          >
            📱 앱 설치하고 편하게 사용하기
          </button>
        )}
        {/* ===== 여기까지 추가 ===== */}
        <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '10px'}}>
          로그인
        </button>
      </form>
      <p style={{textAlign: 'center', marginTop: '20px'}}>
        계정이 없으신가요? <Link to="/signup" style={{color: 'var(--primary-color)'}}>회원가입</Link>
      </p>
    </div>
  );
};

export default LoginForm;