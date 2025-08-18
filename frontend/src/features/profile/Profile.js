// [전체 코드] src/features/profile/Profile.js

import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet, apiPostForm, API_BASE } from "../../api/api";

const Profile = ({ user, onLogout }) => {
  // --- 모든 state와 hook 선언은 여기, 컴포넌트 최상단에 있어야 합니다. ---
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  
  const { nickname } = useParams();
  const targetNickname = nickname || user.nickname;
  const isMyProfile = !nickname || nickname === user.nickname;
  // --------------------------------------------------------------------

  const fetchProfile = useCallback(async () => {
    if (!targetNickname) return;
    try {
      const data = await apiGet(`/profile/${encodeURIComponent(targetNickname)}`);
      setProfile(data);
    } catch (e) {
      console.error(e);
      if(isMyProfile) {
        alert("세션이 만료되었거나 사용자를 찾을 수 없습니다. 다시 로그인해주세요.");
        onLogout();
      } else {
        alert("프로필을 불러오지 못했습니다.");
      }
    }
  }, [targetNickname, isMyProfile, onLogout]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadImage = async () => {
    if (!file || !isMyProfile) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const updated = await apiPostForm(`/profile/${encodeURIComponent(user.nickname)}/upload-image`, fd);
      setProfile(updated);
      setFile(null);
    } catch (e) {
      console.error(e);
      alert("이미지 업로드 실패");
    }
  };

  if (!profile) return <div style={{ padding: 20 }}>로딩중…</div>;

  return (
    <div style={{ padding: 20, maxWidth: '700px', margin: 'auto' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>{isMyProfile ? "내 프로필" : `${targetNickname}님의 프로필`}</h2>
        {isMyProfile && (
            <button className="btn btn-danger" onClick={onLogout}>로그아웃</button>
        )}
      </div>
      
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, marginTop: 20 }}>
        <img
          src={
            profile.profile_img
              ? `${API_BASE}${profile.profile_img}`
              : "https://via.placeholder.com/80x80?text=NO+IMG"
          }
          alt="profile"
          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{profile.nickname}</div>
          <div style={{ fontSize: 13, color: "#666" }}>ID: {profile.username}</div>
          <div style={{ fontSize: 13, color: "#666" }}>역할: {profile.role}</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            소속: {profile.clan && profile.clan.length > 0 ? (
                profile.clan.map(c => (
                    <Link key={c.id} to={`/clans/${c.id}`} style={{ marginRight: '8px' }}>{c.name}</Link>
                ))
            ) : "없음"}
          </div>
          <div style={{ fontSize: 13, color: "#666" }}>매너 점수: {profile.manner_score}</div>
          <div style={{ fontSize: 13, color: "#666" }}>뱃지: {profile.badges}</div>
        </div>
      </div>

      {isMyProfile && (
        <>
          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>프로필 이미지 변경</h3>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={uploadImage} className="btn btn-secondary" style={{ marginLeft: 8 }}>
              업로드
            </button>
          </div>

          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>스크랩한 글</h3>
              <Link to="/my-scraps">
                  <button className="btn btn-secondary">내 스크랩 바로가기</button>
              </Link>
          </div>
          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>내가 쓴 글</h3>
              <Link to="/my-posts">
                  <button className="btn btn-secondary">내가 쓴 글 바로가기</button>
              </Link>
          </div>
          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>내가 쓴 댓글</h3>
              <Link to="/my-comments">
                  <button className="btn btn-secondary">내가 쓴 댓글 바로가기</button>
              </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;