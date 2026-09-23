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
    <div className="container-x flex min-h-[70vh] flex-col items-center py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-clay-100 text-2xl font-bold text-clay-700">
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold text-ink-900">{user.name}</h1>
            <p className="truncate text-sm text-ink-700/60">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-cream-100 px-4 py-3">
            <dt className="text-ink-700/60">Name</dt>
            <dd className="font-semibold text-ink-900">{user.name}</dd>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-cream-100 px-4 py-3">
            <dt className="text-ink-700/60">Email</dt>
            <dd className="max-w-[60%] truncate font-semibold text-ink-900">{user.email}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2">
          <Link to="/assistant" className="btn-primary w-full py-3 text-center">Go to the assistant</Link>
          {isAdmin && (
            <Link to="/admin" className="btn-outline w-full py-3 text-center">Admin dashboard</Link>
          )}
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="btn-ghost w-full py-3"
          >
            Log out
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] text-ink-700/45">
          Need help? Contact {BRAND.supportEmail}
        </p>
      </div>

      {/* Chronic-Condition Coach dashboard */}
      <div className="w-full max-w-md">
        <HealthDashboard />
      </div>
    </div>
  );
}
