// [전체 코드] src/features/admin/AdminPage.js
import React, { useEffect, useState, useCallback } from "react";
// [수정] adminPost 대신 adminPostForm을 가져옵니다.
import { adminGet, adminPostForm } from "../../api/api";

const roles = ["멤버", "간부", "운영자"];

export default function AdminPage({ user }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === "운영자";

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await adminGet("/admin/pending-users");
      setPending(data || []);
    } catch (e) {
      alert(e.response?.data?.detail || "대기 사용자 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (nickname) => {
    try {
      // [수정] FormData를 사용하여 닉네임을 서류 양식에 담아 보냅니다.
      const formData = new FormData();
      formData.append('nickname', nickname);
      await adminPostForm(`/admin/approve-user`, formData);
      alert(`승인 완료: ${nickname}`);
      load();
    } catch (e) {
      // [수정] 복잡한 에러 객체 대신 간단한 메시지를 표시합니다.
      alert(e.response?.data?.detail || "승인에 실패했습니다.");
    }
  };

  const setRole = async (nickname, role) => {
    try {
      // [수정] FormData를 사용하여 닉네임과 역할을 서류 양식에 담아 보냅니다.
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('role', role);
      await adminPostForm(`/admin/set-role`, formData);
      alert(`역할 변경 완료: ${nickname} → ${role}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "역할 변경에 실패했습니다.");
    }
  };

  if (!isAdmin) {
    return <div style={{ maxWidth: 800, margin: "40px auto" }}>운영자만 접근 가능합니다.</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "30px auto" }}>
      <h1>운영자 페이지</h1>

      <section style={{ marginTop: 24 }}>
        <h2>승인 대기 사용자</h2>
        {loading ? (
          <p>불러오는 중...</p>
        ) : pending.length === 0 ? (
          <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>대기 중인 사용자가 없습니다.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: 8 }}>닉네임</th>
                <th style={{ textAlign: "left", padding: 8 }}>아이디</th>
                <th style={{ textAlign: "left", padding: 8 }}>요청 역할</th>
                <th style={{ textAlign: "left", padding: 8 }}>상태</th>
                <th style={{ padding: 8 }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{u.nickname}</td>
                  <td style={{ padding: 8 }}>{u.username}</td>
                  <td style={{ padding: 8 }}>{u.role}</td>
                  <td style={{ padding: 8 }}>{u.status}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => approve(u.nickname)} style={{ marginRight: 8 }}>승인</button>
                    <select
                      defaultValue={u.role}
                      onChange={(e) => setRole(u.nickname, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>빠른 역할 변경</h2>
        <QuickRoleSetter onSet={setRole} />
      </section>
    </div>
  );
}

function QuickRoleSetter({ onSet }) {
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("멤버");

  const submit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    await onSet(nickname.trim(), role);
    setNickname("");
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
      <input
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ flex: 1, padding: 8 }}
      />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button type="submit">변경</button>
    </form>
  );
}