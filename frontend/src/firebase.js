// [전체 코드] frontend/src/firebase.js

import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { apiPostForm } from "./api/api";

// TODO: 1. 이 아랫부분을 Firebase 홈페이지에서 복사한 본인의 firebaseConfig 코드로 완전히 교체해주세요.
const firebaseConfig = {
  apiKey: "AIzaSyAdTtitDjQaIFA0U78xHLMbZemMp5Nwi3Q",
  authDomain: "bandicon-final.firebaseapp.com",
  projectId: "bandicon-final",
  storageBucket: "bandicon-final.firebasestorage.app",
  messagingSenderId: "769635544149",
  appId: "1:769635544149:web:4828129c7e2b7f586438dc"
}

export const app = initializeApp(firebaseConfig);
// [수정] export를 추가해서 다른 파일에서 messaging을 사용할 수 있게 합니다.
export const messaging = getMessaging(app);

export const requestForToken = async (nickname) => {
    // 1. 알림 권한을 먼저 직접 요청합니다.
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('알림 권한이 허용되었습니다.');

            // 2. public 폴더의 서비스 워커를 등록하고 토큰을 가져옵니다.
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const currentToken = await getToken(messaging, { 
                vapidKey: 'BOWGrbXEHh5BwBlGLRls0yBrz03KG2-piLj2phBUknGkRXDnfizoTkPy7nawz8CecfjOZeK0cW_9VNqCB0mteNk',
                serviceWorkerRegistration: registration
            });

            if (currentToken) {
                console.log('FCM 토큰:', currentToken);
                const formData = new FormData();
                formData.append('token', currentToken);
                formData.append('nickname', nickname);
                await apiPostForm("/register-device", formData);
            } else {
                console.log('토큰을 발급받지 못했습니다.');
            }
        } else {
            console.log('알림 권한이 거부되었습니다.');
        }
    } catch (err) {
        console.error('FCM 토큰 발급 중 오류 발생:', err);
    }
};