/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'bandicon-cache-v1';
// 캐시할 핵심 파일 목록입니다. 앱의 기본 로딩에 필요한 것들입니다.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/favicon.ico'
];

// 1. 설치 이벤트: 앱이 처음 설치될 때 핵심 파일들을 캐시에 저장합니다.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 요청 가로채기 이벤트: 앱이 파일을 요청할 때마다,
//    네트워크보다 캐시를 먼저 확인해서 오프라인에서도 작동하게 합니다.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 파일이 있으면 그걸 주고, 없으면 네트워크로 요청합니다.
        return response || fetch(event.request);
      })
  );
});

// 3. 활성화 이벤트: 새 버전의 서비스 워커가 설치되면,
//    이전 버전의 낡은 캐시를 청소합니다.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});