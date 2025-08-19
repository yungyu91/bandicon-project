/* eslint-disable no-restricted-globals */

// 1. 필요한 부품들을 가져옵니다. (Workbox와 Firebase)
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// 2. 서비스 워커를 즉시 활성화시키는 코드입니다.
clientsClaim();
self.skipWaiting();

// 3. PWA 설치를 위해 필요한 파일 목록을 Workbox가 자동으로 채워주는 부분입니다. (이미 해결된 부분)
precacheAndRoute(self.__WB_MANIFEST);


// 4. ===== 여기가 바로 백그라운드 푸시 알림을 위한 새로운 핵심 코드입니다. =====

// firebase.js 파일에 있던 본인의 firebaseConfig 코드를 그대로 복사해서 붙여넣어주세요.
const firebaseConfig = {
  apiKey: "AIzaSyCLAbwv1uqbDNKlioHZE_7OLYPd6xY6Fuw",
  authDomain: "bandicon-firebase.firebaseapp.com",
  projectId: "bandicon-firebase",
  storageBucket: "bandicon-firebase.firebasestorage.app",
  messagingSenderId: "786387042685",
  appId: "1:786387042685:web:d37ca1fd984f6e412e0c14"
};

// 서비스 워커 내에서 Firebase 앱을 초기화합니다.
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// 백그라운드에서 메시지를 수신했을 때 실행될 이벤트 리스너입니다.
onBackgroundMessage(messaging, (payload) => {
  console.log('[service-worker.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // 알림 아이콘
  };

  // 사용자에게 푸시 알림을 실제로 보여주는 코드입니다.
  self.registration.showNotification(notificationTitle, notificationOptions);
});