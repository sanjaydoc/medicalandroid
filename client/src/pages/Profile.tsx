import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../brand';
import HealthDashboard from '../components/HealthDashboard';

// A regular user's account page. Reachable from the "Account" button. The admin
// dashboard is a separate, gated route (/admin) — a normal user never lands there.
export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Not signed in → send to login.
  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  const isAdmin = user.email.toLowerCase() === BRAND.adminEmail.toLowerCase();
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="container-x py-8">
      <div className="mx-auto max-w-5xl">
        {/* Account header — full-width bar */}
        <div className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-clay-100 text-2xl font-bold text-clay-700">
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold text-ink-900">{user.name}</h1>
            <p className="truncate text-sm text-ink-700/60">{user.email}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link to="/assistant" className="btn-primary px-4 py-2 text-sm">Assistant</Link>
            {isAdmin && <Link to="/admin" className="btn-outline px-4 py-2 text-sm">Admin</Link>}
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Chronic-Condition Coach dashboard */}
        <HealthDashboard />

        <p className="mt-6 text-center text-[11px] text-ink-700/45">
          Need help? Contact {BRAND.supportEmail}
        </p>
      </div>
    </div>
  );
}
