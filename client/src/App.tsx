import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Analytics from './components/Analytics';
import InstallPrompt from './components/InstallPrompt';
import Home from './pages/Home';
import Assistant from './pages/Assistant';
import About from './pages/About';
import Research from './pages/Research';
import AgenticWorkflows from './pages/AgenticWorkflows';
import Partners from './pages/Partners';
import Legal from './pages/Legal';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // After an OAuth round-trip that requested it (?next=partners), land the user
  // back on the Partners page instead of the home screen. We leave the query in
  // place so Supabase can still read its ?code, then drop only our own param.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('next') === 'providers' || sp.get('next') === 'partners') {
      navigate('/providers', { replace: true });
      const t = window.setTimeout(() => {
        try {
          const s = new URLSearchParams(window.location.search);
          s.delete('next');
          const q = s.toString();
          window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash);
        } catch { /* ignore */ }
      }, 1500);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The ChatGPT-style home is a full-screen surface with its own chrome; every
  // other page gets the shared top navbar.
  const bareHome = pathname === '/';
  // The Assistant page is a full-screen app on desktop with its own left sidebar,
  // so the top navbar is hidden there on desktop (kept on mobile) and no footer.
  const isAssistant = pathname === '/assistant';

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Analytics />
      <InstallPrompt />
      {!bareHome && (
        <div className={isAssistant ? 'md:hidden' : undefined}>
          <Navbar />
        </div>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/about" element={<About />} />
          <Route path="/research" element={<Research />} />
          <Route path="/workflows" element={<AgenticWorkflows />} />
          <Route path="/providers" element={<Partners />} />
          <Route path="/partners" element={<Navigate to="/providers" replace />} />
          <Route path="/privacy" element={<Legal doc="privacy" />} />
          <Route path="/terms" element={<Legal doc="terms" />} />
          <Route path="/account" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAssistant && <Footer />}
    </div>
  );
}
