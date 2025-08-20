/* eslint-disable no-restricted-globals */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

clientsClaim();
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);

const firebaseConfig = {
  apiKey: "AIzaSyCLAbwv1uqbDNKlioHZE_7OLYPd6xY6Fuw",
  authDomain: "bandicon-firebase.firebaseapp.com",
  projectId: "bandicon-firebase",
  storageBucket: "bandicon-firebase.firebasestorage.app",
  messagingSenderId: "786387042685",
  appId: "1:786387042685:web:d37ca1fd984f6e412e0c14"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[service-worker.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});