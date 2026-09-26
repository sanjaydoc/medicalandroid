import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/supabase';
import { BRAND } from '../brand';
import HealthDashboard from '../components/HealthDashboard';
import ImmunizationDashboard from '../components/ImmunizationDashboard';
import PregnancyDashboard from '../components/PregnancyDashboard';
import RecoveryDashboard from '../components/RecoveryDashboard';
import MedicinesDashboard from '../components/MedicinesDashboard';
import { listProfiles, activeProfileId, setActiveProfile, addProfile, removeProfile } from '../api/profiles';

const TABS = [
  { id: 'health', label: 'My Health' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'children', label: "Children's vaccines" },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'recovery', label: 'Recovery' },
] as const;
type TabId = (typeof TABS)[number]['id'];
// Tabs whose data is per-person (caregiver mode). "My Health" (vitals) stays the owner's.
const CAREGIVER_TABS = new Set<TabId>(['medicines', 'children', 'pregnancy', 'recovery']);

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
  const [profileId, setProfileId] = useState<string>(activeProfileId());
  const [, setPTick] = useState(0);
  const profiles = listProfiles();
  // Partner accounts (signed up via the Partners console) don't get the patient
  // health dashboards — they see a partner card that links to the console.
  const [role, setRole] = useState<string | undefined>(undefined);
  const [institution, setInstitution] = useState('');
  useEffect(() => {
    let ok = true;
    supabase?.auth.getUser().then(({ data }) => {
      if (!ok) return;
      const m = (data.user?.user_metadata || {}) as Record<string, string>;
      setRole(m.role); setInstitution(m.institution || '');
    });
    return () => { ok = false; };
  }, []);
  const isPartner = role === 'partner';
  const chooseProfile = (id: string) => { setActiveProfile(id); setProfileId(id); };
  const onAddProfile = () => {
    const name = window.prompt('Add a person to care for (e.g. Mom, Dad, child):');
    if (!name || !name.trim()) return;
    const id = addProfile(name.trim(), 'family');
    chooseProfile(id);
    setPTick((t) => t + 1);
  };

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

        {isPartner && (
          <div className="card mt-6 p-6 sm:p-8">
            <span className="chip">Provider account</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900">
              {institution || user.name}
            </h2>
            <p className="mt-2 max-w-prose text-sm text-ink-700/70">
              You're signed in as a MedDroid provider. Manage your workspace — transform into any of
              your hospital systems, input data, brand it and lock instances — in the Transformer console.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/providers" className="btn-primary px-5 py-2.5 text-sm">Open Providers console →</Link>
              <Link to="/assistant" className="btn-outline px-5 py-2.5 text-sm">AI Assistant</Link>
            </div>
          </div>
        )}

        {!isPartner && (<>
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

        {/* Caregiver profile switcher (applies to per-person tabs) */}
        {CAREGIVER_TABS.has(tab) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink-700/50">Profile:</span>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => chooseProfile(p.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  profileId === p.id ? 'bg-clay-500 text-white' : 'border border-cream-300 text-ink-700 hover:border-clay-400'
                }`}
              >
                {p.name}
              </button>
            ))}
            <button onClick={onAddProfile} className="rounded-full border border-dashed border-clay-300 px-3 py-1.5 text-xs font-bold text-clay-600 hover:bg-clay-50">
              + Add person
            </button>
            {profileId !== 'self' && (
              <button
                onClick={() => { if (confirm('Remove this profile? Their records stay stored but hidden.')) { removeProfile(profileId); setProfileId('self'); setPTick((t) => t + 1); } }}
                className="ml-auto text-xs font-semibold text-ink-700/45 hover:text-red-600"
              >
                Remove profile
              </button>
            )}
          </div>
        )}

        <div key={`${tab}:${profileId}`} className="mt-2">
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
        </>)}

        <p className="mt-6 text-center text-[11px] text-ink-700/45">
          Need help? Contact {BRAND.supportEmail}
        </p>
      </div>
    </div>
  );
}
