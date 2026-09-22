import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render/runtime errors anywhere in the React tree and shows a calm
 * recovery card instead of a blank white screen. The "Reload" action clears the
 * service-worker caches and unregisters workers before reloading, so a corrupt
 * cached shell heals itself. (A white screen that happens BEFORE React mounts —
 * e.g. the JS bundle failing to load — is handled by the inline watchdog in
 * index.html, which this cannot reach.)
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a breadcrumb in the console for debugging; no PII is logged.
    console.error('App error boundary caught:', error, info.componentStack);
  }

  private hardReload = () => {
    const done = () => window.location.reload();
    const jobs: Promise<unknown>[] = [];
    try {
      if ('caches' in window) {
        jobs.push(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
      }
    } catch { /* ignore */ }
    try {
      if ('serviceWorker' in navigator) {
        jobs.push(
          navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))),
        );
      }
    } catch { /* ignore */ }
    Promise.all(jobs).then(done, done);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f6f8fc',
          color: '#1a2233',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            background: '#fff',
            border: '1px solid #e3e9f4',
            borderRadius: '18px',
            padding: '32px 24px',
            boxShadow: '0 10px 30px rgba(37,99,235,0.08)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🩺</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Something needs a refresh</h1>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#55617a', margin: '0 0 20px' }}>
            The app hit a snag while loading. This usually clears up with a quick refresh — your data is safe.
          </p>
          <button
            onClick={this.hardReload}
            style={{
              appearance: 'none',
              border: 'none',
              cursor: 'pointer',
              background: '#2F6FE0',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: '12px',
            }}
          >
            Reload MedDroid
          </button>
        </div>
      </div>
    );
  }
}
