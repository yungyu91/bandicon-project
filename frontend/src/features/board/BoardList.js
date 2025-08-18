// [전체 코드] src/features/board/BoardList.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../../api/api';

const BoardList = ({ user }) => {
    const { boardType } = useParams();
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState(''); // [수정] 빠뜨렸던 코드 추가

    const boardTitle = boardType === 'general' ? '자유게시판' : '초보자게시판';

    const fetchPosts = useCallback(async (currentSearch) => {
        try {
            const data = await apiGet(`/boards/${boardType}?search=${encodeURIComponent(currentSearch)}`);
            setPosts(data);
        } catch (error) {
            console.error(`${boardTitle} 게시글 목록 불러오기 실패:`, error);
        }
    }, [boardType, boardTitle]);

    // [수정] 검색어가 변경될 때마다 0.3초 후 자동으로 fetchPosts를 호출하는 로직 추가
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPosts(searchTerm);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchPosts]);

    const formatDate = (dateString) => {
        if (!dateString) return '알 수 없음';
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>{boardTitle}</h2>
                <button className="btn btn-primary" onClick={() => navigate(`/create-post/${boardType}`)}>글쓰기</button>
            </div>
            {/* 검색창 Input은 이미 존재하므로 수정할 필요가 없습니다. */}
            <input
                type="text"
                placeholder="제목 또는 내용으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
            />
            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--light-gray)' }}>
                            {/* [수정] 제목 칸의 너비를 늘리고, 다른 칸의 너비를 비율로 조정합니다. */}
                            <th style={{ padding: '10px', textAlign: 'left', width: '55%' }}>제목</th>
                            <th style={{ padding: '10px', width: '15%' }}>작성자</th>
                            <th style={{ padding: '10px', width: '10%' }}>좋아요</th>
                            <th style={{ padding: '10px', width: '20%' }}>작성일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts && posts.length > 0 ? (
                            posts.map(post => (
                                <tr key={post.id} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                                    <td className="post-title-cell" style={{ padding: '10px', textAlign: 'left' }}>
                                        <Link to={`/post/${post.id}`}>{post.title}</Link> [{post.comments_count || 0}]
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>{post.is_anonymous ? '익명' : post.owner?.nickname}</td>
                                    <td style={{ padding: '10px', textAlign: 'center' }}>{post.likes_count || 0}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDate(post.created_at)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>
                                    아직 게시글이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BoardList;