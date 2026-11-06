module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,html,ttf,ico,json,png,jpg}'],
  globIgnores: ['metadata.json'],
  swDest: 'dist/sw.js',
  // Сайт собирается как SPA: любой адрес открывает один и тот же index.html, в том числе без сети.
  navigateFallback: '/index.html',
  maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
  // Новая версия применяется при следующем запуске, без ручной очистки кэша.
  skipWaiting: true,
  clientsClaim: true,
};
