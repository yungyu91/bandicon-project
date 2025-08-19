// [전체 코드] src/api/api.js
import axios from "axios";

export const API_BASE = "https://bandicon-project.onrender.com";
export const ADMIN_TOKEN = "abc123-VERY-LONG-RANDOM";

// ---------- 공용 요청 ----------
export const apiGet = async (url) => {
  try {
    const res = await axios.get(`${API_BASE}${url}`);
    return res.data;
  } catch (err) {
    console.error(`GET ${url} 에러:`, err);
    throw err;
  }
};

export const apiPost = async (url, body, config) => {
  try {
    // [수정] body가 FormData인 경우 Content-Type을 자동으로 설정하도록 합니다.
    const headers = body instanceof FormData ? {} : { "Content-Type": "application/json" };
    const res = await axios.post(`${API_BASE}${url}`, body, { headers, ...config });
    return res.data;
  } catch (err) {
    console.error(`POST ${url} 에러:`, err);
    throw err;
  }
};

export const apiPostForm = async (url, formData) => {
  try {
    const headers = { "Content-Type": "multipart/form-data" };
    const res = await axios.post(`${API_BASE}${url}`, formData, { headers });
    return res.data;
  } catch (err) {
    console.error(`POST FORM ${url} 에러:`, err);
    throw err;
  }
};

export const apiDelete = async (url) => {
  try {
    const res = await axios.delete(`${API_BASE}${url}`);
    return res.data;
  } catch (err) {
    console.error(`DELETE ${url} 에러:`, err);
    throw err;
  }
};

// ---------- 운영자 전용 요청 (관리자 토큰 자동 첨부) ----------
export const adminGet = async (url) => {
  try {
    const res = await axios.get(`${API_BASE}${url}`, {
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN GET ${url} 에러:`, err);
    throw err;
  }
};

export const adminPost = async (url, body) => {
  try {
    const res = await axios.post(`${API_BASE}${url}`, body ?? {}, {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN,
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN POST ${url} 에러:`, err);
    throw err;
  }
};

export const adminPostForm = async (url, formData) => {
  try {
    const res = await axios.post(`${API_BASE}${url}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Admin-Token": ADMIN_TOKEN,
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN POST FORM ${url} 에러:`, err);
    throw err;
  }
};

export const adminDelete = async (url) => {
  try {
    const res = await axios.delete(`${API_BASE}${url}`, {
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN DELETE ${url} 에러:`, err);
    throw err;
  }
};