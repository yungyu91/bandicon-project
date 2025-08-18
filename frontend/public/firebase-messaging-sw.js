// [새 파일] frontend/public/firebase-messaging-sw.js

// Firebase App (the core Firebase SDK) is always required and must be listed first
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
// Firebase Cloud Messaging (NPM package)
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// TODO: 이 부분은 본인의 firebaseConfig 값으로 채워야 합니다.
// (src/firebase.js 에 있는 값과 동일)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드에서 메시지를 받았을 때 처리
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo192.png" // public 폴더의 기본 아이콘 사용
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});