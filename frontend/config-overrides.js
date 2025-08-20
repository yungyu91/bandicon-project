// frontend/config-overrides.js
const path = require('path');

module.exports = function override(config, env) {
  // 기존의 Workbox 플러그인을 찾습니다.
  const workboxPlugin = config.plugins.find(
    (plugin) => plugin.constructor.name === 'InjectManifest'
  );

  if (workboxPlugin) {
    // Workbox가 처리할 서비스 워커 목록에 우리 Firebase 서비스 워커를 추가합니다.
    workboxPlugin.config.swSrc = path.join(__dirname, 'src', 'service-worker.js');
    workboxPlugin.config.swDest = 'service-worker.js';
    workboxPlugin.config.maximumFileSizeToCacheInBytes = 5 * 1024 * 1024;
  }

  return config;
};