import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Capacitor } from '@capacitor/core';
import { initStatusBar } from './native/statusBar';
import watchHorizontalOverflow from './utils/overflowDebug';

initStatusBar();
watchHorizontalOverflow();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registered unconditionally (not gated behind notification permission,
// unlike the Firebase-specific registration in src/firebase/messaging.js)
// because browsers require an active service worker with a fetch handler
// before they'll consider the app installable as a PWA. sw.js is the same
// file messaging.js registers for push — see scripts/generate-firebase-sw.js
// for why both jobs live in one worker.
// The native (Capacitor) app already ships its files inside the APK, so the
// service worker only adds a cache that grows with every update. It is
// registered for the website/PWA only, and any worker or cache a previous
// build left on this phone is removed.
const isNativeApp = (() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
})();

if ('serviceWorker' in navigator) {
  if (isNativeApp) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
    if (window.caches) {
      caches
        .keys()
        .then((keys) => keys.filter((key) => key.startsWith('study2gate-shell-')).forEach((key) => caches.delete(key)))
        .catch(() => {});
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
}
