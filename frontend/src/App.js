// [전체 코드] src/App.js

import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

import RoomList from "./features/rooms/RoomList";
import RoomDetail from "./features/rooms/RoomDetail";
import MyRooms from "./features/rooms/MyRooms";
import CreateRoomForm from "./features/rooms/CreateRoomForm";
import Profile from "./features/profile/Profile";
import ChatHub from "./features/chat/ChatHub";
import ChatList from "./features/chat/ChatList";
import LoginForm from "./features/auth/LoginForm";
import SignupForm from "./features/auth/SignupForm";
import Home from "./features/home/Home";
import MannerEval from "./features/evaluation/MannerEval";
import BoardList from "./features/board/BoardList";
import PostDetail from "./features/board/PostDetail";
import CreatePost from "./features/board/CreatePost";
import ScrappedPosts from "./features/board/ScrappedPosts";
import BoardHome from "./features/board/BoardHome";
import ClanHome from "./features/clan/ClanHome";
import ClanDetail from "./features/clan/ClanDetail";
import AdminPage from "./features/admin/AdminPage";

import { apiGet, apiPost } from "./api/api";
import { AlertProvider, useAlert } from "./context/AlertContext";
import "./App.css";
import { requestForToken, messaging } from "./firebase";
import { onMessage } from "firebase/messaging";
import MyPosts from "./features/profile/MyPosts";
import MyComments from "./features/profile/MyComments";
import TermsPage from "./features/legal/TermsPage";
import PrivacyPage from "./features/legal/PrivacyPage";

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("bandicon_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [notificationCounts, setNotificationCounts] = useState({ chat: 0, profile: 0, etc: 0 });

  const checkAlerts = useCallback(async (currentUser) => {
      if (!currentUser?.nickname) return;
      try {
        const res = await apiGet(`/alerts/${encodeURIComponent(currentUser.nickname)}`);
        
        // [수정] 중요 알림(매너평가)이 있는지 모든 미확인 알림을 확인하도록 변경
        const mannerEvalAlert = res.find(alert => 
            alert.related_url && 
            alert.related_url.includes('/manner-eval/') &&
            (location.pathname + location.search) !== alert.related_url
        );

        if (mannerEvalAlert) {
            showAlert(
              "새로운 알림",
              mannerEvalAlert.message,
              async () => {
                try {
                  // 알림을 '읽음'으로 처리
                  await apiPost(`/alerts/${mannerEvalAlert.id}/read?nickname=${encodeURIComponent(currentUser.nickname)}`);
                  // 평가 페이지로 이동
                  navigate(mannerEvalAlert.related_url);
                } catch (e) {
                  console.error("Failed to mark alert as read", e);
                  // API 실패 시에도 페이지는 이동
                  navigate(mannerEvalAlert.related_url);
                }
              },
              // [수정] 네 번째 인자를 alert.id 대신 false로 변경하여 '확인' 버튼만 보이게 함
              false 
            );
        }
      } catch (e) {
        console.debug("alert check error:", e?.message || e);
      }
  }, [navigate, location, showAlert]);
  
  const fetchNotificationCounts = useCallback(async (currentUser) => {
    if (!currentUser?.nickname) return;
    try {
      const counts = await apiGet(`/notifications/counts?nickname=${encodeURIComponent(currentUser.nickname)}`);
      setNotificationCounts(counts);
    } catch(e) {
      console.debug("count fetch error:", e);
    }
  }, []);

  const formatCount = (count) => {
    if (count <= 0) return '';
    return `(${Math.min(count, 9)})`;
  };

  const handleLogin = (loginRes) => {
    setUser(loginRes);
    localStorage.setItem("bandicon_user", JSON.stringify(loginRes));
    
    if (Notification.permission === 'default') {
        requestForToken(loginRes.nickname);
    }
    
    checkAlerts(loginRes);
    fetchNotificationCounts(loginRes);
    navigate("/");
  };
  
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("bandicon_user");
    navigate("/login");
  };

  useEffect(() => {
    if (user) {
      // 중요 알림(매너평가 등) 확인
      checkAlerts(user);
      // 페이지 이동 시마다 알림 개수 새로고침
      fetchNotificationCounts(user);

      // 15초마다 백그라운드에서 계속 새로고침
      const interval = setInterval(() => {
        fetchNotificationCounts(user);
      }, 15000);
      
      // 컴포넌트가 사라질 때 인터벌 정리
      return () => clearInterval(interval);
    }
  }, [user, location, checkAlerts, fetchNotificationCounts]);

  // 푸시 알림 수신 리스너 (이 부분은 그대로 유지)
  useEffect(() => {
    if(messaging) {
      onMessage(messaging, (payload) => {
        console.log('메시지 수신 (포그라운드): ', payload);
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: "/logo192.png"
        });
        if(user) fetchNotificationCounts(user);
      });
    }
  }, [user, fetchNotificationCounts]);


  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <Link to="/" className="brand">Bandicon</Link>
          <div className="app-header__right">
            {user ? (
              <span style={{fontWeight: '500'}}>{user.nickname}님</span>
            ) : (
              <div style={{display: 'flex', gap: '16px'}}>
                <Link to="/login">로그인</Link>
                <Link to="/signup">회원가입</Link>
              </div>
            )}
          </div>
        </div>
        {user && (
          <nav className="nav">
            <Link to="/rooms">방목록</Link>
            <Link to="/my-rooms">내 방</Link>
            <Link to="/boards">게시판</Link>
            <Link to="/clans">클랜</Link>
            <Link to="/chats">채팅 {formatCount(notificationCounts.chat)}</Link>
            <Link to="/profile">프로필 {formatCount(notificationCounts.profile)}</Link>
            {user.role === "운영자" && <Link to="/admin">운영자</Link>}
          </nav>
        )}
      </header>

      <main className="app-main">
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
              <Route path="/signup" element={<SignupForm onLogin={handleLogin} />} />
              <Route path="*" element={<LoginForm onLogin={handleLogin} />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
              <Route path="/profile/:nickname" element={<Profile user={user} onLogout={handleLogout} />} />
              <Route path="/rooms" element={<RoomList user={user} />} />
              <Route path="/rooms/:roomId" element={<RoomDetail user={user} />} />
              <Route path="/create-room" element={<CreateRoomForm user={user} />} />
              <Route path="/my-rooms" element={<MyRooms user={user} />} />
              <Route path="/manner-eval/:roomId" element={<MannerEval user={user} />} />
              <Route path="/boards" element={<BoardHome user={user} />} />
              <Route path="/boards/:boardType" element={<BoardList user={user} />} />
              <Route path="/post/:postId" element={<PostDetail user={user} />} />
              <Route path="/create-post/:boardType" element={<CreatePost user={user} />} />
              <Route path="/my-scraps" element={<ScrappedPosts user={user} />} />
              <Route path="/my-posts" element={<MyPosts user={user} />} />
              <Route path="/my-comments" element={<MyComments user={user} />} />
              <Route path="/chats" element={<ChatList user={user} />} />
              <Route path="/chats/:type/:id" element={<ChatHub user={user} />} />
              <Route path="/clans" element={<ClanHome user={user} />} />
              <Route path="/clans/:clanId" element={<ClanDetail user={user} />} />
              {/* ✅ 2. 여기에 약관 페이지 주소를 추가하세요. */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/admin" element={<AdminPage user={user} />} />
              <Route path="/login" element={<Home user={user} />} />
              <Route path="/signup" element={<Home user={user} />} />
              <Route path="*" element={<Home user={user} />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <AlertProvider>
    <AppContent />
  </AlertProvider>
);

export default App;