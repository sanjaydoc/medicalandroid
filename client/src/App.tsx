import { Routes, Route, useLocation } from 'react-router-dom';
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
  // The ChatGPT-style home is a full-screen surface with its own chrome; every
  // other page gets the shared top navbar.
  const bareHome = pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Analytics />
      <InstallPrompt />
      {!bareHome && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/about" element={<About />} />
          <Route path="/research" element={<Research />} />
          <Route path="/workflows" element={<AgenticWorkflows />} />
          <Route path="/account" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!bareHome && <Footer />}
    </div>
  );
}
