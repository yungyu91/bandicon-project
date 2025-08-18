// [최종 완성 코드] frontend/src/features/auth/SignupForm.js

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost, apiPostForm } from "../../api/api";

export default function SignupForm() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("멤버");
  const [skills, setSkills] = useState({ 보컬: 1, 기타: 1, 베이스: 1, 드럼: 1, 키보드: 1, });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const isSignupDisabled = !termsAgreed || !privacyAgreed;

  const handleSkillChange = (session, value) => {
    setSkills((prev) => ({ ...prev, [session]: Math.max(1, Math.min(5, Number(value))), }));
  };

  const handleSendCode = async () => {
    setError("");
    setServerMessage("");
    if (phone.length < 10 || !/^\d+$/.test(phone)) {
        setError("휴대폰 번호는 - 없이 10자리 또는 11자리 숫자여야 합니다.");
        return;
    }
    try {
        const formData = new FormData();
        formData.append('phone', phone);
        const res = await apiPostForm("/auth/send-verification-sms", formData);
        setServerMessage(res.message || "인증번호가 발송되었습니다.");
    } catch (err) {
        const detail = err.response?.data?.detail;
        setError(detail || "인증번호 발송 중 문제가 발생했습니다.");
    }
  };

  // ✅ 인증번호 확인 방식을 API 호출로 변경합니다.
  const handleVerifyAndNext = async () => {
    setError("");
    try {
        const formData = new FormData();
        formData.append('phone', phone);
        formData.append('code', verificationCode);
        await apiPostForm("/auth/verify-sms-code", formData);

        setIsVerified(true);
        setStep(2);
        setServerMessage("인증되었습니다! 추가 정보를 입력해주세요.");

    } catch (err) {
        const detail = err.response?.data?.detail;
        setError(detail || "인증 처리 중 문제가 발생했습니다.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!id || !password || !nickname) {
      setError("아이디, 비밀번호, 닉네임은 반드시 입력해야 합니다.");
      return;
    }
    try {
      const signupData = { id, password, nickname, phone, email, skills, role, marketing_consent: marketingAgreed };
      await apiPost("/signup", signupData);

      if (role === '간부') {
        alert("간부 가입 신청이 완료되었습니다. 운영자의 승인을 기다려주세요.");
      } else {
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
      }
      navigate("/login");
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "회원가입 중 문제가 발생했습니다.";
      setError(errorMessage);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: '500px', margin: 'auto' }}>
      <h2>회원가입</h2>
      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      {serverMessage && <p style={{ color: "green", textAlign: 'center' }}>{serverMessage}</p>}
      {step === 1 && (
        <div>
          <h3 style={{textAlign: 'center'}}>1단계: 휴대폰 인증</h3>
          <div style={{marginBottom: '10px'}}>
            <label>휴대폰 번호 ( - 없이 11자리):</label>
            <div style={{display: 'flex'}}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required style={{flex: 1, padding: '8px', boxSizing: 'border-box'}} />
                <button type="button" onClick={handleSendCode} style={{marginLeft: '10px'}}>인증번호 받기</button>
            </div>
          </div>
          <div style={{marginBottom: '10px'}}>
            <label>인증번호:</label>
            <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="6자리 숫자" required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
          </div>
          <button onClick={handleVerifyAndNext} style={{width: '100%', padding: '10px', marginTop: '10px'}}>인증하고 다음으로</button>
        </div>
      )}
      {step === 2 && isVerified && (
        <form onSubmit={handleSubmit}>
          <h3 style={{textAlign: 'center'}}>2단계: 정보 입력</h3>
          <p style={{textAlign: 'center', color: '#666'}}>인증된 번호: {phone}</p>
          <div style={{marginBottom: '10px'}}>
            <label>아이디:</label>
            <input value={id} onChange={(e) => setId(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
          </div>
          <div style={{marginBottom: '10px'}}>
            <label>비밀번호:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
          </div>
          <div style={{marginBottom: '10px'}}>
            <label>닉네임:</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
          </div>
          <div style={{marginBottom: '10px'}}>
            <label>이메일 (선택):</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
          </div>
          <div style={{marginBottom: '15px'}}>
              <label>가입 유형:</label>
              <label style={{marginLeft: '10px'}}><input type="radio" value="멤버" checked={role === '멤버'} onChange={(e) => setRole(e.target.value)} /> 일반 멤버</label>
              <label style={{marginLeft: '10px'}}><input type="radio" value="간부" checked={role === '간부'} onChange={(e) => setRole(e.target.value)} /> 밴드부 간부</label>
          </div>
          <div style={{border: '1px solid #ddd', padding: '15px', borderRadius: '5px'}}>
            <h4>세션별 실력 (1=초보 ~ 5=전문가):</h4>
            {Object.keys(skills).map((session) => (
              <div key={session} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
                <label>{session}: {skills[session]}</label>
                <input type="range" min="1" max="5" value={skills[session]} onChange={(e) => handleSkillChange(session, e.target.value)} style={{width: '70%'}} />
              </div>
            ))}
          </div>
          <div style={{marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '0.9em'}}>
              <div style={{marginBottom: '5px'}}>
                  <label>
                      <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
                      [필수] <Link to="/terms" target="_blank" rel="noopener noreferrer">이용약관</Link>에 동의합니다.
                  </label>
              </div>
              <div style={{marginBottom: '5px'}}>
                  <label>
                      <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} />
                      [필수] <Link to="/privacy" target="_blank" rel="noopener noreferrer">개인정보 처리방침</Link>에 동의합니다.
                  </label>
              </div>
              <div>
                  <label>
                      <input type="checkbox" checked={marketingAgreed} onChange={(e) => setMarketingAgreed(e.target.checked)} />
                      [선택] 마케팅 정보 수신(SMS, 푸시 알림)에 동의합니다.
                  </label>
              </div>
          </div>
          <button type="submit" disabled={isSignupDisabled} style={{width: '100%', padding: '10px', marginTop: '20px', background: isSignupDisabled ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
              가입 신청
          </button>
        </form>
      )}
    </div>
  );
}