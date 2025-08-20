// frontend/public/firebase-messaging-sw.js

// Firebase 라이브러리를 가져옵니다.
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// firebase.js 파일에 있던 본인의 firebaseConfig 코드를 여기에 한번 더 넣어주세요.
const firebaseConfig = {
  apiKey: "AIzaSyCLAbwv1uqbDNKlioHZE_7OLYPd6xY6Fuw",
  authDomain: "bandicon-firebase.firebaseapp.com",
  projectId: "bandicon-firebase",
  storageBucket: "bandicon-firebase.firebasestorage.app",
  messagingSenderId: "786387042685",
  appId: "1:786387042685:web:d37ca1fd984f6e412e0c14"
};

// 서비스 워커 내에서 Firebase 앱을 초기화합니다.
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 백그라운드에서 메시지를 수신했을 때 실행될 이벤트 리스너입니다.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // 알림 아이콘
  };

  // 사용자에게 푸시 알림을 실제로 보여주는 코드입니다.
  self.registration.showNotification(notificationTitle, notificationOptions);
});