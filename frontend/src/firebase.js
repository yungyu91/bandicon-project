// [전체 코드] frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { apiPostForm } from "./api/api";

// TODO: 1. 이 아랫부분을 Firebase 홈페이지에서 복사한 본인의 firebaseConfig 코드로 완전히 교체해주세요.
const firebaseConfig = {
  apiKey: "AIzaSyCLAbwv1uqbDNKlioHZE_7OLYPd6xY6Fuw",
  authDomain: "bandicon-firebase.firebaseapp.com",
  projectId: "bandicon-firebase",
  storageBucket: "bandicon-firebase.firebasestorage.app",
  messagingSenderId: "786387042685",
  appId: "1:786387042685:web:d37ca1fd984f6e412e0c14"
};

export const app = initializeApp(firebaseConfig);
// [수정] export를 추가해서 다른 파일에서 messaging을 사용할 수 있게 합니다.
export const messaging = getMessaging(app);

export const requestForToken = async (nickname) => {
    try {
        // TODO: 2. 아래 'YOUR_VAPID_KEY' 부분에 본인의 키를 붙여넣어 주세요.
        const currentToken = await getToken(messaging, { vapidKey: 'BKz00IesXM4JeEzKs-Xvxehbe9DNMwU40Y8kTSkpkm5RdGSN3QuDziDns13WQACPSNai_je6qwzzCDGh8JcvABc' });
        
        if (currentToken) {
            console.log('FCM 토큰:', currentToken);
            const formData = new FormData();
            formData.append('token', currentToken);
            formData.append('nickname', nickname);
            await apiPostForm("/register-device", formData);
            // alert("알림 설정이 완료되었습니다!"); // 성공 시 굳이 alert를 띄울 필요는 없으므로 주석 처리
        } else {
            console.log('푸시 알림 권한이 거부되었습니다.');
        }
    } catch (err) {
        console.error('FCM 토큰 발급 중 오류 발생:', err);
    }
};