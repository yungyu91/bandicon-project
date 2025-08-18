// [전체 코드] src/features/board/CreatePost.js
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiPostForm } from '../../api/api';

const CreatePost = ({ user }) => {
    const { boardType } = useParams();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setError('제목과 내용은 필수입니다.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('board_type', boardType);
        formData.append('nickname', user.nickname);
        formData.append('is_anonymous', isAnonymous);
        if (imageFile) {
            formData.append('file', imageFile);
        }

        try {
            const newPost = await apiPostForm('/posts', formData);
            navigate(`/post/${newPost.id}`);
        } catch (err) {
            console.error('게시글 작성 실패:', err);
            setError(err.response?.data?.detail || '게시글 작성에 실패했습니다.');
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h2 className="page-title">{boardType === 'general' ? '자유게시판' : '초보자게시판'} 글쓰기</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input-field"
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows="10"
                        className="input-field"
                        style={{resize: 'vertical'}}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>이미지 첨부</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                        익명으로 작성하기
                    </label>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" className="btn btn-primary" style={{width: '100%'}}>작성 완료</button>
            </form>
        </div>
    );
};

export default CreatePost;