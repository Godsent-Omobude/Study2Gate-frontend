import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initStatusBar } from './native/statusBar';

initStatusBar();

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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
