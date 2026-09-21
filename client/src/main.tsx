import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SavedProvider } from './context/SavedContext';
import { PwaProvider } from './context/PwaContext';
import './index.css';

// The static Pages build uses HashRouter so client-side routes work without
// any server rewrites (and survive a hard refresh on a subpage).
const Router = import.meta.env.VITE_STATIC === 'true' ? HashRouter : BrowserRouter;

// Native Android app (Capacitor injects window.Capacitor). Two app-only tweaks:
//  1) mark <html> so CSS can reserve the status-bar safe area (see index.css);
//  2) cold-start on the Assistant page — the app's primary surface — instead of
//     the marketing home page. Only when landing on the root hash, so in-app
//     navigation and refreshes are respected.
try {
  const isNative = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();
  if (isNative) {
    document.documentElement.classList.add('cap-native');
    // Native app opens on the home chat surface (the ChatGPT-style entry).
  }
} catch { /* ignore */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <SavedProvider>
          <PwaProvider>
            <App />
          </PwaProvider>
        </SavedProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

// Register the service worker so the site is installable as a PWA and works
// offline. Only in production builds (skips the Vite dev server).
//
// Instant updates: `updateViaCache: 'none'` makes the browser always re-fetch
// sw.js (so a new deploy is detected immediately, never served from HTTP cache).
// The new worker calls skipWaiting()+clients.claim() and takes control, which
// fires `controllerchange`; we reload ONCE so the freshly-deployed bundle shows
// without a manual hard-refresh. Guarded so the first-ever visit never reloads.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        // proactively poll for a new deploy when the tab regains focus
        const check = () => { reg.update().catch(() => { /* ignore */ }); };
        document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      })
      .catch(() => { /* ignore */ });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing || !hadController) return; // don't reload on first install
      refreshing = true;
      window.location.reload();
    });
  });
}
