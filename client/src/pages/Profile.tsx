import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../brand';
import HealthDashboard from '../components/HealthDashboard';
import ImmunizationDashboard from '../components/ImmunizationDashboard';
import PregnancyDashboard from '../components/PregnancyDashboard';
import RecoveryDashboard from '../components/RecoveryDashboard';
import MedicinesDashboard from '../components/MedicinesDashboard';

const TABS = [
  { id: 'health', label: 'My Health' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'children', label: "Children's vaccines" },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'recovery', label: 'Recovery' },
] as const;
type TabId = (typeof TABS)[number]['id'];

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
  const [tab, setTab] = useState<TabId>('health');

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

        {/* Health-hub tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                tab === t.id ? 'bg-clay-500 text-white' : 'border border-cream-300 text-ink-700 hover:border-clay-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {tab === 'health' && <HealthDashboard />}
          {tab === 'medicines' && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="font-display text-2xl font-extrabold text-ink-900">My <span className="text-clay-600">Medicines</span></h2>
                <p className="text-sm text-ink-700/60">Generic &amp; price finder + automatic safety check — synced across your devices</p>
              </div>
              <MedicinesDashboard />
            </div>
          )}
          {tab === 'children' && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="font-display text-2xl font-extrabold text-ink-900">Children's <span className="text-clay-600">Vaccines</span></h2>
                <p className="text-sm text-ink-700/60">Immunization schedule &amp; reminders — synced across your devices</p>
              </div>
              <ImmunizationDashboard />
            </div>
          )}
          {tab === 'pregnancy' && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="font-display text-2xl font-extrabold text-ink-900">Pregnancy <span className="text-clay-600">Companion</span></h2>
                <p className="text-sm text-ink-700/60">Week-by-week guidance, antenatal schedule &amp; danger signs — synced across your devices</p>
              </div>
              <PregnancyDashboard />
            </div>
          )}
          {tab === 'recovery' && (
            <div className="mt-6">
              <div className="mb-4">
                <h2 className="font-display text-2xl font-extrabold text-ink-900">Recovery <span className="text-clay-600">Guide</span></h2>
                <p className="text-sm text-ink-700/60">Day-by-day recovery checklist, wound care, warning signs &amp; follow-ups — synced across your devices</p>
              </div>
              <RecoveryDashboard />
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-ink-700/45">
          Need help? Contact {BRAND.supportEmail}
        </p>
      </div>
    </div>
  );
}
