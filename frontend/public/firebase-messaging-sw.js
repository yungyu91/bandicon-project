// frontend/public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAdTtitDjQaIFA0U78xHLMbZemMp5Nwi3Q",
  authDomain: "bandicon-final.firebaseapp.com",
  projectId: "bandicon-final",
  storageBucket: "bandicon-final.firebasestorage.app",
  messagingSenderId: "769635544149",
  appId: "1:769635544149:web:4828129c7e2b7f586438dc"
}

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});