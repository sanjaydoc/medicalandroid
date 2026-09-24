import { useEffect, useState } from 'react';
import ChatWidget from '../components/ChatWidget';
import AssistantSidebar from '../components/AssistantSidebar';
import { isNativeApp } from '../api/chat';
import {
  offlineModelPresent, downloadOfflineModel, getDeviceInfo, recommendModel,
  warmOfflineModel, listOfflineModels, useOfflineModel,
  OFFLINE_MODELS, DEFAULT_OFFLINE_MODEL,
} from '../api/ondevice';
import type { OfflineModel, DeviceInfo } from '../api/ondevice';
import { BRAND } from '../brand';

/* Full-page view of the De Novo AI assistant — neumorphic dashboard chrome to
   match the Simulator / Protocols / Research pages, with a doctor-speciality
   selector that orients the assistant's answers. */

type Spec = { key: string; label: string };
const SPECIALTIES: Spec[] = [
  { key: 'general', label: 'General Physician' },
  { key: 'cardio', label: 'Cardiology' },
  { key: 'neuro', label: 'Neurology' },
  { key: 'ortho', label: 'Orthopedics' },
  { key: 'derma', label: 'Dermatology' },
  { key: 'paeds', label: 'Paediatrics' },
  { key: 'obgyn', label: 'Gynaecology & Obstetrics' },
  { key: 'gastro', label: 'Gastroenterology' },
  { key: 'endo', label: 'Endocrinology (Diabetes & Thyroid)' },
  { key: 'pulmo', label: 'Pulmonology' },
  { key: 'nephro', label: 'Nephrology' },
  { key: 'uro', label: 'Urology' },
  { key: 'onco', label: 'Oncology & Haematology' },
  { key: 'regen', label: 'Regenerative Medicine' },
  { key: 'ent', label: 'ENT (Ear, Nose & Throat)' },
  { key: 'ophthal', label: 'Ophthalmology' },
  { key: 'dental', label: 'Dentistry' },
  { key: 'psych', label: 'Psychiatry & Mental Health' },
  { key: 'psychology', label: 'Psychology & Counselling' },
  { key: 'rheum', label: 'Rheumatology' },
  { key: 'physio', label: 'Physiotherapy & Rehab' },
  { key: 'nutrition', label: 'Nutrition & Dietetics' },
  { key: 'surgery', label: 'General Surgery' },
  { key: 'infect', label: 'Infectious Diseases' },
  { key: 'allergy', label: 'Allergy & Immunology' },
  { key: 'sexual', label: 'Sexual Health' },
  { key: 'emergency', label: 'Emergency Medicine' },
  { key: 'geriatrics', label: 'Geriatrics (Elderly Care)' },
  { key: 'hepatology', label: 'Hepatology (Liver)' },
  { key: 'andrology', label: "Andrology & Men's Health" },
  { key: 'pain', label: 'Pain Management' },
  { key: 'radiology', label: 'Radiology & Imaging' },
  { key: 'neurosurgery', label: 'Neurosurgery' },
  { key: 'cardiacsurgery', label: 'Cardiac & Thoracic Surgery' },
  { key: 'plastic', label: 'Plastic & Cosmetic Surgery' },
  { key: 'vascular', label: 'Vascular Surgery' },
  { key: 'paedsurgery', label: 'Paediatric Surgery' },
  { key: 'bariatric', label: 'Bariatric (Weight-loss) Surgery' },
];

// Clean 2D blue line icons (currentColor = theme blue), matching the site.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICONS: Record<string, JSX.Element> = {
  general: (<svg viewBox="0 0 24 24" {...S}><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 12v2.2a4.2 4.2 0 0 0 8.4 0v-.7" /><circle cx="18.4" cy="11.4" r="1.9" /></svg>),
  regen: (<svg viewBox="0 0 24 24" {...S}><path d="M9 3c0 3 6 3 6 6s-6 3-6 6" /><path d="M15 3c0 3-6 3-6 6s6 3 6 6" /><path d="M9.6 5.5h4.8M8.4 9h7.2M9.6 12.5h4.8" /></svg>),
  cardio: (<svg viewBox="0 0 24 24" {...S}><path d="M12 20s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 5c-2.3 4.6-9.3 9-9.3 9z" /></svg>),
  neuro: (<svg viewBox="0 0 24 24" {...S}><path d="M12 6a3 3 0 0 0-5.6 1.3A3 3 0 0 0 5 12.5a3 3 0 0 0 2.3 4.3A2.6 2.6 0 0 0 12 18z" /><path d="M12 6a3 3 0 0 1 5.6 1.3A3 3 0 0 1 19 12.5a3 3 0 0 1-2.3 4.3A2.6 2.6 0 0 1 12 18z" /><path d="M12 6v12" /></svg>),
  ortho: (<svg viewBox="0 0 24 24" {...S}><path d="M9.5 9.5 14.5 14.5" /><circle cx="7.9" cy="8.4" r="1.9" /><circle cx="8.4" cy="10.9" r="1.9" /><circle cx="16.1" cy="15.6" r="1.9" /><circle cx="15.6" cy="13.1" r="1.9" /></svg>),
  onco: (<svg viewBox="0 0 24 24" {...S}><path d="M12 3.5s5.8 6.3 5.8 10.2A5.8 5.8 0 0 1 6.2 13.7C6.2 9.8 12 3.5 12 3.5z" /></svg>),
  endo: (<svg viewBox="0 0 24 24" {...S}><path d="M9 3h6M10 3v5.5L6.2 16a2 2 0 0 0 1.8 2.9h8a2 2 0 0 0 1.8-2.9L14 8.5V3" /><path d="M8.3 14h7.4" /></svg>),
  pulmo: (<svg viewBox="0 0 24 24" {...S}><path d="M12 4v5.5" /><path d="M9.8 9.2C7.4 9.4 6 11.8 6 15c0 2.2.9 4.2 3 4.2 1.4 0 2.4-1 2.4-2.8V10.4c0-.7-.6-1.3-1.6-1.2z" /><path d="M14.2 9.2c2.4.2 3.8 2.6 3.8 5.8 0 2.2-.9 4.2-3 4.2-1.4 0-2.4-1-2.4-2.8V10.4c0-.7.6-1.3 1.6-1.2z" /></svg>),
  nephro: (<svg viewBox="0 0 24 24" {...S}><path d="M14 4c-4.2 0-7.2 3.6-7.2 8s3 8 7.2 8c2.2 0 3.3-1.4 2.6-2.7-.6-1.2-2.2-1-2.2-3.3s1.6-2.1 2.2-3.3C17.3 5.4 16.2 4 14 4z" /></svg>),
  derma: (<svg viewBox="0 0 24 24" {...S}><path d="M12 4 3.5 8 12 12l8.5-4z" /><path d="M4.3 11.2 12 14.8l7.7-3.6M4.3 14.7 12 18.3l7.7-3.6" /></svg>),
  ophthal: (<svg viewBox="0 0 24 24" {...S}><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.6" /></svg>),
  dental: (<svg viewBox="0 0 24 24" {...S}><path d="M8 3.2c-2.1 0-3.6 1.6-3.6 4.1 0 1.9.8 2.9 1.2 6 .3 2.4.5 5.2 1.9 5.2s1.2-3.1 2.5-3.1 1.2 3.1 2.5 3.1 1.6-2.8 1.9-5.2c.4-3.1 1.2-4.1 1.2-6 0-2.5-1.5-4.1-3.6-4.1-1.3 0-1.9.7-3 .7s-1.7-.7-3-.7z" /></svg>),
  paeds: (<svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="5.5" r="2.5" /><path d="M8.5 21v-5.5a3.5 3.5 0 0 1 7 0V21" /><path d="M9 13.5h6" /></svg>),
  obgyn: (<svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="8" r="5" /><path d="M12 13v8M8.5 18h7" /></svg>),
  gastro: (<svg viewBox="0 0 24 24" {...S}><path d="M10 4v4.5a4.5 4.5 0 0 0 4.5 4.5h.5a3 3 0 0 0 0-6h-1" /><path d="M10 8.5c-2.5.5-4 2.8-4 6 0 2.6 1.6 4.5 4 4.5" /></svg>),
  uro: (<svg viewBox="0 0 24 24" {...S}><path d="M7 9a5 5 0 0 0 5 5 5 5 0 0 0 5-5c0-1.6-1-2.9-2.4-2.9-1.3 0-1.6 1-2.6 1s-1.3-1-2.6-1C8 6.1 7 7.4 7 9z" /><path d="M12 14v6" /></svg>),
  ent: (<svg viewBox="0 0 24 24" {...S}><path d="M8.5 9.5a3.5 3.5 0 1 1 6.5 1.8c-1 1.6-2.5 1.9-2.5 3.7a2.2 2.2 0 0 1-4.3.6" /></svg>),
  psych: (<svg viewBox="0 0 24 24" {...S}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3z" /></svg>),
  psychology: (<svg viewBox="0 0 24 24" {...S}><path d="M20 12a8 8 0 1 0-3 6.2V21l2.4-1.6A7.9 7.9 0 0 0 20 12z" /><path d="M12 15c2 0 3-1.3 3-3s-1.3-2.5-3-2.5S9 10.3 9 12" /></svg>),
  rheum: (<svg viewBox="0 0 24 24" {...S}><path d="M7 13V7a1.4 1.4 0 0 1 2.8 0v4M9.8 11V5.5a1.4 1.4 0 0 1 2.8 0V11M12.6 11.5V7a1.4 1.4 0 0 1 2.8 0v7a5 5 0 0 1-5 5H10a4 4 0 0 1-3.3-1.7L5 16" /></svg>),
  physio: (<svg viewBox="0 0 24 24" {...S}><circle cx="13.5" cy="4.5" r="1.9" /><path d="M8 21l3-6 3 1.6 1.6-3.6" /><path d="M11 15l-2.2-3.2 4.2-1.1 3 2" /></svg>),
  nutrition: (<svg viewBox="0 0 24 24" {...S}><path d="M12 8a5 5 0 0 0-4 8c1.2 1.7 2.5 4 4 4s2.8-2.3 4-4a5 5 0 0 0-4-8z" /><path d="M12 8c0-2 1.5-3.5 3.5-3.5C15.5 6.5 14 8 12 8z" /></svg>),
  surgery: (<svg viewBox="0 0 24 24" {...S}><path d="M14 4l6 6-9 9-3-3z" /><path d="M4 20l3.5-1.2" /></svg>),
  infect: (<svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>),
  allergy: (<svg viewBox="0 0 24 24" {...S}><path d="M12 4l8 14H4z" /><path d="M12 10v4M12 16.5v.6" /></svg>),
  sexual: (<svg viewBox="0 0 24 24" {...S}><path d="M12 3l7 3v5c0 4.2-3 7.2-7 8.5-4-1.3-7-4.3-7-8.5V6z" /><path d="M12 9c-.8-1-2.5-.7-2.5.8 0 1.3 2.5 2.9 2.5 2.9s2.5-1.6 2.5-2.9c0-1.5-1.7-1.8-2.5-.8z" /></svg>),
};

// Fallback icon for any speciality without a bespoke glyph (stethoscope).
const FALLBACK_ICON = (
  <svg viewBox="0 0 24 24" {...S}><path d="M6 3v5a4 4 0 0 0 8 0V3" /><path d="M10 12v2.2a4.2 4.2 0 0 0 8.4 0v-.7" /><circle cx="18.4" cy="11.4" r="1.9" /></svg>
);
const specIcon = (k: string): JSX.Element => ICONS[k] || FALLBACK_ICON;

// Professional blue 2D Android robot (matches the theme; not the green brand mark).
const ANDROID = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M7.6 4.8 6.2 2.9M16.4 4.8 17.8 2.9" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    <path d="M5.4 10.6a6.6 6.6 0 0 1 13.2 0z" fill="currentColor" />
    <rect x="5.6" y="11.4" width="12.8" height="7" rx="1.6" fill="currentColor" />
    <rect x="2.4" y="11.7" width="2.1" height="5.8" rx="1.05" fill="currentColor" />
    <rect x="19.5" y="11.7" width="2.1" height="5.8" rx="1.05" fill="currentColor" />
    <rect x="8.1" y="17.6" width="2.1" height="4" rx="1.05" fill="currentColor" />
    <rect x="13.8" y="17.6" width="2.1" height="4" rx="1.05" fill="currentColor" />
    <circle cx="9.6" cy="8" r="0.85" fill="#fff" />
    <circle cx="14.4" cy="8" r="0.85" fill="#fff" />
  </svg>
);

const APK_URL = 'https://raw.githubusercontent.com/sanjaydoc/medicalandroid/apk/meddroid.apk';
const SPEC_KEY = 'stemcells_assistant_specialty_v1';
// Shared with ChatWidget so the mode persists across the app.
const OFFLINE_KEY = 'stemcells_chat_offline_v1';
const NATIVE = isNativeApp();

export default function Assistant() {
  const [spec, setSpec] = useState<string>(() => {
    try { return localStorage.getItem(SPEC_KEY) || ''; } catch { return ''; }
  });
  useEffect(() => {
    try {
      if (spec) localStorage.setItem(SPEC_KEY, spec);
      else localStorage.removeItem(SPEC_KEY);
    } catch { /* ignore */ }
  }, [spec]);

  const active = SPECIALTIES.find((s) => s.label === spec) || null;
  // Collapse the speciality grid once one is picked (locked), to free chat space.
  // Tapping the locked chip re-opens the grid to switch.
  const [specOpen, setSpecOpen] = useState<boolean>(!spec);
  const pickSpec = (label: string) => {
    if (spec === label) { setSpec(''); setSpecOpen(true); }
    else { setSpec(label); setSpecOpen(false); }
  };

  // Handoff from the home page: a question (+ optional speciality) stashed in
  // sessionStorage. Apply the speciality and auto-send the question once.
  const [initialQ, setInitialQ] = useState('');
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('meddroid_pending');
      if (!raw) return;
      sessionStorage.removeItem('meddroid_pending');
      const pending = JSON.parse(raw) as { q?: string; spec?: string };
      if (pending.spec && SPECIALTIES.some((s) => s.label === pending.spec)) {
        setSpec(pending.spec);
        setSpecOpen(false);
      }
      if (pending.q && pending.q.trim()) setInitialQ(pending.q.trim());
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Online (cloud assistant) vs Offline (on-device LSM + local model). Only the
  // packaged Android app shows this switch. v1 ships ONLINE-FIRST: the on-device
  // engine isn't built yet, so default to Online (respect a saved preference).
  const [offline, setOffline] = useState<boolean>(() => {
    if (!NATIVE) return false;
    try {
      return localStorage.getItem(OFFLINE_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!NATIVE) return;
    try { localStorage.setItem(OFFLINE_KEY, offline ? '1' : '0'); } catch { /* ignore */ }
  }, [offline]);

  const chooseMode = (v: boolean) => setOffline(v);

  // Full-screen chat (mobile web + app): hide the bottom nav + page chrome.
  // Always available in both Online and Offline mode.
  // On phones, open the chat full-screen by default (clean, ChatGPT-style —
  // hides the page chrome and fills the screen). Desktop stays windowed.
  const [fullscreen, setFullscreen] = useState(() => {
    try { return typeof window !== 'undefined' && window.innerWidth < 640; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('chat-fullscreen', fullscreen);
    return () => { document.documentElement.classList.remove('chat-fullscreen'); };
  }, [fullscreen]);
  const canFullscreen = true;

  // Offline model download state. null = unknown/checking, false = needs download,
  // true = present on device. Only relevant in the native app + Offline mode.
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pct, setPct] = useState(0);
  const [dlError, setDlError] = useState('');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [recommended, setRecommended] = useState<OfflineModel | null>(null);
  const [selected, setSelected] = useState<OfflineModel>(DEFAULT_OFFLINE_MODEL);
  useEffect(() => {
    if (!NATIVE || !offline) return;
    let cancelled = false;
    offlineModelPresent().then((present) => { if (!cancelled) setModelReady(present); });
    return () => { cancelled = true; };
  }, [offline]);

  const detect = async () => {
    setDetecting(true);
    try {
      const info = await getDeviceInfo();
      setDevice(info);
      if (info) {
        const rec = recommendModel(info.totalRamMb);
        setRecommended(rec);
        setSelected(rec);
      }
    } finally {
      setDetecting(false);
    }
  };

  const startDownload = async (m: OfflineModel = selected) => {
    setSelected(m);
    setDownloading(true); setDlError(''); setPct(0); setManageOpen(false);
    try {
      await downloadOfflineModel(m, (p) => setPct(p));
      setModelReady(true);
      setModelLoaded(false); // force a warm of the newly-active model
      refreshModels();
    } catch (e) {
      setDlError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };
  const fitsRam = (m: OfflineModel) => !device || device.totalRamMb >= m.minRamMb;
  const fitsStorage = (m: OfflineModel) => !device || device.freeStorageMb >= m.sizeMb + 400;

  // Manage already-downloaded models: detect which are on the device + which is active.
  const [manageOpen, setManageOpen] = useState(false);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const refreshModels = () => listOfflineModels().then((r) => { setPresent(r.present); setActiveFile(r.active); });
  useEffect(() => {
    if (!NATIVE || !offline || modelReady !== true) return;
    refreshModels();
  }, [offline, modelReady]);
  const switchTo = async (m: OfflineModel) => {
    setModelLoading(true);
    const ok = await useOfflineModel(m);
    setModelLoaded(ok);
    setActiveFile(m.filename);
    setModelLoading(false);
    setManageOpen(false);
  };
  const activeModel = OFFLINE_MODELS.find((m) => m.filename === activeFile) || null;

  const needsModel = NATIVE && offline && modelReady === false;

  // Preload the model once it's present so the first answer isn't preceded by a
  // silent 30–90s load; show a "loading" note until it's ready.
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  useEffect(() => {
    if (!NATIVE || !offline || modelReady !== true || modelLoaded) return;
    let cancelled = false;
    setModelLoading(true);
    warmOfflineModel().then((ok) => { if (!cancelled) { setModelLoaded(ok); } })
      .finally(() => { if (!cancelled) setModelLoading(false); });
    return () => { cancelled = true; };
  }, [offline, modelReady, modelLoaded]);

  return (
    <div className="asd-shell">
      <style>{ASD_CSS}</style>
      <AssistantSidebar spec={spec} onSpec={setSpec} specialties={SPECIALTIES} appUrl={APK_URL} />
      <div className="asd-main">
      <div className={"asd" + (fullscreen ? " fs" : "")}>
      <div className="asd-wrap container-x">
        {/* top bar */}
        <div className="asd-top">
          <span className="asd-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3z" />
            </svg>
          </span>
          <div className="asd-ttl">
            <h1>AI <span>Assistant</span></h1>
            <span className="asd-badge">{BRAND.name} AI · general info only</span>
          </div>
        </div>

        {/* Android app download */}
        <a className="asd-appbar asd-neu" href="https://raw.githubusercontent.com/sanjaydoc/medicalandroid/apk/meddroid.apk" target="_blank" rel="noopener">
          <span className="ic" aria-hidden>{ANDROID}</span>
          <span className="tx">
            <b>Get the Android app</b>
            <span>Ask MedDroid on your phone — free</span>
          </span>
          <span className="go">Download<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" /></svg></span>
        </a>

        {/* speciality selector */}
        {active && !specOpen ? (
          /* Collapsed: locked to the chosen speciality — tap to change (frees chat space) */
          <button type="button" className="asd-lock asd-neu" onClick={() => setSpecOpen(true)} aria-expanded={false}>
            <span className="pi"><span className="em" aria-hidden>{specIcon(active.key)}</span></span>
            <span className="lk">
              <b>{active.label}</b>
              <span>Speciality locked · tap to change</span>
            </span>
            <span className="lockic" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
          </button>
        ) : (
          <section className="asd-panel asd-neu">
            <div className="asd-ph">
              <span className="pi">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 3h4l1 4-2 1a11 11 0 005 5l1-2 4 1v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 011.8-2z" /></svg>
              </span>
              <div><h2>Choose a speciality</h2></div>
              {active && (
                <button type="button" className="asd-clear" onClick={() => { setSpec(''); setSpecOpen(true); }}>Clear</button>
              )}
            </div>
            <p className="asd-sub">
              Pick the area your question is about and the assistant will orient its answer to that speciality.
              {active
                ? <> Currently answering as <b>{active.label}</b>.</>
                : <> Leave unset for general guidance.</>}
            </p>
            <div className="asd-specs">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={'asd-spec' + (spec === s.label ? ' on' : '')}
                  onClick={() => pickSpec(s.label)}
                  aria-pressed={spec === s.label}
                >
                  <span className="em" aria-hidden>{specIcon(s.key)}</span>
                  <span className="lb">{s.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Online / Offline mode — segmented toggle (Android app only) */}
        {NATIVE && (
          <section className="asd-mode" role="radiogroup" aria-label="Assistant mode">
            <span className="asd-mode-lbl">Assistant mode</span>
            <div className="asd-mode-seg asd-neu">
              <button
                type="button"
                role="radio"
                className={'asd-mode-opt' + (!offline ? ' on' : '')}
                onClick={() => chooseMode(false)}
                aria-checked={!offline}
              >
                <span className="mi">
                  <svg viewBox="0 0 24 24" {...S}><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /><path d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z" /></svg>
                </span>
                <span className="mt"><b>Online</b><span>Cloud assistant · needs internet</span></span>
                <span className="mck" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                className={'asd-mode-opt' + (offline ? ' on' : '')}
                onClick={() => chooseMode(true)}
                aria-checked={offline}
              >
                <span className="mi">
                  <svg viewBox="0 0 24 24" {...S}><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4" /><path d="M10 5.6h4" /><circle cx="12" cy="17.6" r="0.6" fill="currentColor" stroke="none" /><path d="M9.4 11.2 12 8.8l2.6 2.4M12 8.8v5" /></svg>
                </span>
                <span className="mt"><b>Offline</b><span>On-device AI · no signal needed</span></span>
                <span className="mck" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.2 4.2L19 7" /></svg>
                </span>
              </button>
            </div>
          </section>
        )}

        {/* WHO reference note (offline) */}
        {NATIVE && offline && (
          <div className="asd-whonote">
            <span className="ic" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" /></svg>
            </span>
            <span>Offline answers use <b>MedGemma</b>, with drug doses grounded in the <b>WHO Essential Medicines</b> standard dosing reference — all on your device.</span>
          </div>
        )}

        {/* Offline model download gate (Android app, Offline mode, model absent) */}
        {needsModel && (
          <section className="asd-panel asd-neu asd-dl">
            <div className="asd-ph">
              <span className="pi">
                <svg viewBox="0 0 24 24" {...S}><path d="M12 3v11m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
              </span>
              <div><h2>Download the offline model</h2></div>
            </div>
            <p className="asd-sub">
              Offline mode runs an AI model fully on your phone — no internet, no data leaves the device.
              Pick one that fits your phone: <b>MedGemma</b> tiers are medical but need 5&nbsp;GB+ RAM; <b>Fast (Gemma-1B)</b>
              runs well on <b>4&nbsp;GB</b> but is general, not medical-tuned. One-time download (use <b>Wi-Fi</b>, keep the app open).
            </p>

            {!downloading && (
              <>
                <div className="asd-detect">
                  <button type="button" className="asd-detect-btn" onClick={detect} disabled={detecting}>
                    {detecting ? 'Detecting…' : 'Detect RAM & storage'}
                  </button>
                  {device && (
                    <span className="asd-detect-out mono">
                      RAM {(device.totalRamMb / 1024).toFixed(1)} GB · free {(device.freeStorageMb / 1024).toFixed(1)} GB
                    </span>
                  )}
                </div>

                <div className="asd-models">
                  {OFFLINE_MODELS.map((m) => {
                    const ok = fitsRam(m) && fitsStorage(m);
                    const isRec = recommended?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={'asd-model' + (selected.id === m.id ? ' on' : '') + (device && !ok ? ' warn' : '')}
                        onClick={() => setSelected(m)}
                        aria-pressed={selected.id === m.id}
                      >
                        <span className="rc" aria-hidden />
                        <span className="mmeta">
                          <b>{m.tier} · {(m.sizeMb / 1024).toFixed(1)} GB {isRec && <span className="rec">Recommended</span>}</b>
                          <span>{m.note}{device && !fitsRam(m) ? ' · may crash on your RAM' : ''}{device && !fitsStorage(m) ? ' · not enough free storage' : ''}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!dlError && (
                  <button type="button" className="asd-dl-btn" onClick={() => startDownload()}>
                    Download {selected.tier} ({(selected.sizeMb / 1024).toFixed(1)} GB)
                  </button>
                )}
              </>
            )}

            {downloading && (
              <div className="asd-dl-prog">
                <div className="dlname">Downloading <b>{selected.tier}</b> ({(selected.sizeMb / 1024).toFixed(1)} GB)…</div>
                <div className="bar"><span style={{ width: pct + '%' }} /></div>
                <div className="pcttx"><span className="mono">{pct}%</span> · keep the app open</div>
              </div>
            )}
            {dlError && !downloading && (
              <div className="asd-dl-err">
                <b>Download failed.</b> {dlError}
                <button type="button" className="asd-dl-btn" onClick={() => startDownload()}>Retry</button>
              </div>
            )}
            <p className="asd-dl-alt">Or switch to <b>Online</b> above to use the cloud assistant now.</p>
          </section>
        )}

        {/* Offline model manager — detect downloaded models + switch without re-download */}
        {NATIVE && offline && !needsModel && (
          <div className="asd-mm">
            <button type="button" className="asd-mm-chip asd-neu" onClick={() => setManageOpen((o) => !o)} aria-expanded={manageOpen}>
              <span className="pi">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="6" rx="1.6" /><rect x="4" y="14" width="16" height="6" rx="1.6" /><path d="M8 7h.01M8 17h.01" /></svg>
              </span>
              <span className="lk">
                <b>Offline model: {activeModel ? activeModel.tier : '…'}</b>
                <span>{manageOpen ? 'Tap to close' : 'Tap to switch / manage downloaded models'}</span>
              </span>
              <span className={'chev' + (manageOpen ? ' up' : '')} aria-hidden>▾</span>
            </button>
            {manageOpen && (
              <div className="asd-models asd-mm-list">
                {OFFLINE_MODELS.map((m) => {
                  const onDev = !!present[m.filename];
                  const isActive = activeFile === m.filename;
                  return (
                    <div key={m.id} className={'asd-model' + (isActive ? ' on' : '')}>
                      <span className="rc" aria-hidden />
                      <span className="mmeta">
                        <b>{m.tier} · {(m.sizeMb / 1024).toFixed(1)} GB
                          {isActive && <span className="rec">In use</span>}
                          {onDev && !isActive && <span className="rec dl">On device</span>}
                        </b>
                        <span>{m.note}</span>
                      </span>
                      {isActive ? (
                        <span className="asd-mm-use ghost">Active</span>
                      ) : onDev ? (
                        <button type="button" className="asd-mm-use" onClick={() => switchTo(m)}>Use</button>
                      ) : (
                        <button type="button" className="asd-mm-use alt" onClick={() => startDownload(m)}>Download</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* on-device model preloading note */}
        {NATIVE && offline && modelLoading && (
          <div className="asd-loading">
            <span className="spin" aria-hidden />
            Preparing the on-device model… first answer can take up to a minute.
          </div>
        )}

        {/* chat */}
        {!needsModel && (
          <section className="asd-panel asd-neu asd-chat">
            <ChatWidget fullPage specialty={spec} initialMessage={initialQ} offline={NATIVE ? offline : undefined} fullscreen={fullscreen} canFullscreen={canFullscreen} onToggleFullscreen={() => setFullscreen((v) => !v)} />
          </section>
        )}

        <p className="asd-disc">Educational / research support — not a diagnosis, prescription or medical advice. Always confirm with a qualified clinician.</p>
      </div>
      </div>
      </div>
    </div>
  );
}

const ASD_CSS = `
.asd{--sp:#ffffff;--shd:rgba(90,98,112,.20);--shl:#ffffff;--ink:#2b3757;--mut:#6a7699;--fnt:#9aa6c2;--blue:#2F6FE0;--grad:linear-gradient(135deg,#5a9bff,#2F6FE0);--disp:Poppins,Inter,system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;
  background:#fdfdfc;min-height:100vh;color:var(--ink);}
.asd-wrap{padding-top:26px;padding-bottom:44px;}
.asd-neu{background:var(--sp);border-radius:22px;box-shadow:9px 9px 22px var(--shd),-9px -9px 18px var(--shl);}
.asd-top{display:flex;align-items:center;gap:14px;margin-bottom:20px;}
.asd-mark{width:56px;height:56px;border-radius:17px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:6px 6px 14px var(--shd),-6px -6px 12px var(--shl);}
.asd-mark svg{width:26px;height:26px;}
.asd-ttl{min-width:0;flex:1;display:flex;flex-direction:column;gap:9px;align-items:flex-start;}
.asd-ttl h1{font-family:var(--disp);font-weight:700;font-size:clamp(24px,6vw,32px);margin:0;letter-spacing:-.01em;line-height:1.02;white-space:nowrap;}
.asd-ttl h1 span{color:var(--blue);}
.asd-badge{display:inline-block;max-width:100%;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.05em;color:var(--blue);padding:7px 12px;border-radius:999px;background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.asd-appbar{display:flex;align-items:center;gap:14px;padding:15px 18px;margin-bottom:18px;border-radius:18px;text-decoration:none;transition:transform .12s;}
.asd-appbar:hover{transform:translateY(-2px);}
.asd-appbar .ic{width:34px;height:34px;flex:none;color:var(--blue);display:grid;place-items:center;}
.asd-appbar .ic svg{width:34px;height:34px;}
.asd-appbar .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.asd-appbar .tx b{font-family:var(--disp);font-weight:700;font-size:14.5px;color:var(--ink);}
.asd-appbar .tx span{font-size:12px;color:var(--mut);}
.asd-appbar .go{flex:none;display:inline-flex;align-items:center;gap:7px;font-family:var(--disp);font-weight:600;font-size:13px;color:#fff;background:var(--grad);padding:10px 16px;border-radius:12px;box-shadow:5px 5px 14px rgba(47,111,224,.34),-4px -4px 9px var(--shl);}
.asd-appbar .go svg{width:16px;height:16px;}
@media(max-width:520px){.asd-appbar .tx span{display:none;}}
/* Online/Offline segmented toggle (Android app only) */
.asd-mode{margin-bottom:18px;}
.asd-mode-lbl{display:block;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--fnt);margin:0 0 8px 4px;}
.asd-mode-seg{display:flex;align-items:stretch;gap:8px;padding:8px;border-radius:20px;}
.asd-mode-opt{position:relative;flex:1;min-width:0;display:flex;align-items:center;gap:11px;cursor:pointer;border:0;text-align:left;padding:14px 15px;border-radius:15px;background:transparent;color:var(--mut);transition:color .15s,background .15s,box-shadow .15s,transform .12s;}
.asd-mode-opt .mi{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:11px;color:var(--mut);background:var(--sp);box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.asd-mode-opt .mi svg{width:20px;height:20px;}
.asd-mode-opt .mt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;}
.asd-mode-opt .mt b{font-family:var(--disp);font-weight:700;font-size:15px;line-height:1.1;}
.asd-mode-opt .mt span{font-size:11px;color:var(--fnt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.asd-mode-opt .mck{width:20px;height:20px;flex:none;display:grid;place-items:center;border-radius:50%;color:#fff;background:rgba(255,255,255,.28);opacity:0;transform:scale(.6);transition:opacity .15s,transform .15s;}
.asd-mode-opt .mck svg{width:13px;height:13px;}
.asd-mode-opt.on{color:#fff;background:var(--grad);box-shadow:5px 6px 15px rgba(47,111,224,.30);}
.asd-mode-opt.on .mi{color:#fff;background:rgba(255,255,255,.18);box-shadow:none;}
.asd-mode-opt.on .mt span{color:rgba(255,255,255,.88);}
.asd-mode-opt.on .mck{opacity:1;transform:scale(1);}
@media(max-width:560px){
  .asd-mode-seg{flex-direction:column;gap:6px;}
  .asd-mode-opt .mt span{white-space:normal;}
}
/* Offline model download gate */
.asd-detect{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;}
.asd-detect-btn{border:0;cursor:pointer;font-family:var(--disp);font-weight:600;font-size:13px;color:var(--blue);background:var(--sp);padding:11px 16px;border-radius:12px;box-shadow:4px 4px 10px var(--shd),-4px -4px 8px var(--shl);}
.asd-detect-btn:disabled{opacity:.6;}
.asd-detect-out{font-size:12px;color:var(--mut);}
.asd-models{display:flex;flex-direction:column;gap:8px;margin-top:14px;}
.asd-model{display:flex;align-items:center;gap:12px;cursor:pointer;border:0;text-align:left;padding:13px 15px;border-radius:14px;background:var(--sp);box-shadow:inset 3px 3px 7px var(--shd),inset -3px -3px 7px var(--shl);transition:box-shadow .15s;}
.asd-model .rc{width:18px;height:18px;flex:none;border-radius:50%;background:var(--sp);box-shadow:inset 2px 2px 4px var(--shd),inset -2px -2px 4px var(--shl);position:relative;}
.asd-model.on .rc{background:var(--grad);box-shadow:none;}
.asd-model.on .rc::after{content:"";position:absolute;inset:5px;border-radius:50%;background:#fff;}
.asd-model .mmeta{display:flex;flex-direction:column;gap:2px;min-width:0;}
.asd-model .mmeta b{font-family:var(--disp);font-weight:700;font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.asd-model .mmeta span{font-size:11.5px;color:var(--fnt);}
.asd-model .rec{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#fff;background:var(--good);padding:2px 7px;border-radius:999px;}
.asd-model.on{box-shadow:5px 5px 13px var(--shd),-5px -5px 11px var(--shl);}
.asd-model.warn .mmeta span{color:var(--warn);}
.asd-dl-prog .dlname{font-size:13px;color:var(--mut);margin-bottom:8px;}
.asd-loading{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--mut);margin:0 4px 14px;padding:11px 14px;border-radius:12px;background:var(--sp);box-shadow:inset 3px 3px 7px var(--shd),inset -3px -3px 7px var(--shl);}
.asd-loading .spin{width:15px;height:15px;flex:none;border-radius:50%;border:2px solid var(--line);border-top-color:var(--blue);animation:asdspin .8s linear infinite;}
@keyframes asdspin{to{transform:rotate(360deg);}}
/* WHO reference note */
.asd-whonote{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:var(--mut);margin:0 4px 14px;padding:11px 14px;border-radius:12px;background:var(--good-bg);border-left:3px solid var(--good);line-height:1.5;}
.asd-whonote b{color:var(--ink);}
.asd-whonote .ic{flex:none;color:var(--good);}
.asd-whonote .ic svg{width:18px;height:18px;}
/* Offline model manager */
.asd-mm{margin-bottom:14px;}
.asd-mm-chip{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;cursor:pointer;padding:12px 15px;border-radius:16px;background:var(--sp);}
.asd-mm-chip .pi{width:36px;height:36px;border-radius:11px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:inset 2px 2px 5px var(--shd),inset -2px -2px 5px var(--shl);}
.asd-mm-chip .pi svg{width:18px;height:18px;}
.asd-mm-chip .lk{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
.asd-mm-chip .lk b{font-family:var(--disp);font-weight:700;font-size:14px;color:var(--ink);}
.asd-mm-chip .lk span{font-size:11px;color:var(--fnt);}
.asd-mm-chip .chev{flex:none;color:var(--mut);transition:transform .15s;}
.asd-mm-chip .chev.up{transform:rotate(180deg);}
.asd-mm-list{margin-top:10px;}
.asd-model .rec.dl{background:var(--blue);}
.asd-mm-use{flex:none;border:0;cursor:pointer;font-family:var(--disp);font-weight:700;font-size:12.5px;color:#fff;background:var(--grad);padding:9px 16px;border-radius:11px;}
.asd-mm-use.alt{color:var(--blue);background:var(--sp);box-shadow:4px 4px 10px var(--shd),-4px -4px 8px var(--shl);}
.asd-mm-use.ghost{color:var(--good);background:transparent;font-size:11px;}
/* Full-screen chat: hide all page chrome except the chat, strip its panel */
.asd.fs{background:#fff;min-height:auto;}
.asd.fs .asd-wrap{padding:0;max-width:none;}
.asd.fs .asd-wrap > *:not(.asd-chat){display:none!important;}
.asd.fs .asd-chat{padding:0;margin:0;border-radius:0;box-shadow:none;background:transparent;}
.asd-dl-btn{margin-top:14px;border:0;cursor:pointer;font-family:var(--disp);font-weight:700;font-size:14px;color:#fff;background:var(--grad);padding:13px 22px;border-radius:13px;box-shadow:5px 5px 14px rgba(47,111,224,.30);}
.asd-dl-prog{margin-top:16px;}
.asd-dl-prog .bar{height:12px;border-radius:999px;background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);overflow:hidden;}
.asd-dl-prog .bar span{display:block;height:100%;border-radius:999px;background:var(--grad);transition:width .3s;}
.asd-dl-prog .pcttx{margin-top:8px;font-size:12.5px;color:var(--mut);}
.asd-dl-err{margin-top:14px;font-size:13px;color:#b91c1c;display:flex;flex-direction:column;gap:10px;align-items:flex-start;}
.asd-dl-alt{margin-top:16px;font-size:12.5px;color:var(--fnt);}
.asd-panel{padding:20px clamp(16px,2.2vw,24px);margin-bottom:18px;}
.asd-ph{display:flex;align-items:center;gap:11px;margin-bottom:6px;}
.asd .pi{width:38px;height:38px;border-radius:12px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);}
.asd .pi svg{width:19px;height:19px;}
.asd-ph h2{font-family:var(--disp);font-weight:700;font-size:clamp(16px,2vw,20px);margin:0;}
.asd-clear{margin-left:auto;border:0;cursor:pointer;font-family:var(--disp);font-weight:600;font-size:12px;color:var(--blue);padding:8px 14px;border-radius:11px;background:var(--sp);box-shadow:4px 4px 10px var(--shd),-4px -4px 8px var(--shl);transition:transform .12s;}
.asd-clear:hover{transform:translateY(-1px);}
/* Collapsed / locked speciality chip (frees space for chat) */
.asd-lock{display:flex;align-items:center;gap:13px;width:100%;text-align:left;border:0;cursor:pointer;padding:13px 16px;margin-bottom:18px;border-radius:18px;background:var(--sp);box-shadow:9px 9px 22px var(--shd),-9px -9px 18px var(--shl);transition:transform .12s;}
.asd-lock:hover{transform:translateY(-1px);}
.asd-lock .pi{width:40px;height:40px;border-radius:12px;flex:none;display:grid;place-items:center;color:var(--blue);background:var(--sp);box-shadow:inset 3px 3px 6px var(--shd),inset -3px -3px 6px var(--shl);}
.asd-lock .pi .em{display:grid;place-items:center;}
.asd-lock .pi svg{width:20px;height:20px;}
.asd-lock .lk{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
.asd-lock .lk b{font-family:var(--disp);font-weight:700;font-size:15px;color:var(--ink);}
.asd-lock .lk span{font-size:11.5px;color:var(--fnt);}
.asd-lock .lockic{flex:none;color:var(--mut);}
.asd-lock .lockic svg{width:18px;height:18px;}
.asd-sub{font-size:12.5px;color:var(--mut);margin:0 0 15px;line-height:1.55;}
.asd-sub b{color:var(--ink);}
.asd-specs{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:11px;}
.asd-spec{display:flex;align-items:center;gap:10px;text-align:left;border:0;cursor:pointer;padding:13px 14px;border-radius:14px;background:var(--sp);box-shadow:5px 5px 12px var(--shd),-5px -5px 10px var(--shl);transition:transform .12s,box-shadow .2s;font-family:inherit;}
.asd-spec:hover{transform:translateY(-2px);}
.asd-spec .em{width:24px;height:24px;flex:none;color:var(--blue);display:grid;place-items:center;}
.asd-spec .em svg{width:23px;height:23px;}
.asd-spec .lb{font-family:var(--disp);font-weight:600;font-size:13px;color:var(--ink);line-height:1.2;}
.asd-spec.on{box-shadow:inset 4px 4px 9px var(--shd),inset -4px -4px 9px var(--shl);}
.asd-spec.on .lb{color:var(--blue);}
.asd-chat{padding:14px clamp(10px,1.6vw,16px);}
/* let the embedded ChatWidget fill the neumorphic panel */
.asd-chat > *{width:100%;}
.asd-disc{font-size:11.5px;font-style:italic;color:var(--fnt);line-height:1.6;text-align:center;margin:6px 0 0;}
@media(prefers-reduced-motion:reduce){.asd *{transition:none!important;}}
/* ── Desktop full-screen shell with left sidebar (Claude-style), md+ only ── */
.asd-side{display:none;}
@media(min-width:768px){
  .asd-shell{display:flex;height:100vh;overflow:hidden;background:#fdfdfc;}
  .asd-main{flex:1;min-width:0;height:100vh;overflow-y:auto;}
  .asd-main .asd{min-height:100%;}
  .asd-side{display:flex;flex-direction:column;width:250px;flex:none;height:100vh;background:#ffffff;border-right:1px solid #e7e2d8;padding:16px 12px;gap:6px;}
  .asd-side-brand{display:flex;align-items:center;gap:9px;padding:8px 10px 14px;text-decoration:none;}
  .asd-side-brand span{font-family:Poppins,Inter,sans-serif;font-weight:800;font-size:19px;color:#141413;letter-spacing:-.01em;}
  .asd-nav{display:flex;flex-direction:column;gap:3px;margin-top:4px;}
  .asd-nav-item{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:12px;text-decoration:none;color:#3a3733;font-family:Inter,sans-serif;font-weight:600;font-size:14px;transition:background .15s,color .15s;}
  .asd-nav-item .ic{width:20px;height:20px;flex:none;color:#8a94a3;display:grid;place-items:center;}
  .asd-nav-item .ic svg{width:20px;height:20px;}
  .asd-nav-item:hover{background:#f4f5f6;}
  .asd-nav-item.on{background:#EAF1FE;color:#2F6FE0;}
  .asd-nav-item.on .ic{color:#2F6FE0;}
  .asd-side-foot{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid #e7e2d8;}
  .asd-side-user{display:flex;align-items:center;gap:10px;text-decoration:none;padding:6px 8px;border-radius:12px;color:#141413;}
  .asd-side-user:hover{background:#f4f5f6;}
  .asd-side-user .av{width:34px;height:34px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#2F6FE0;background:#D6E4FD;}
  .asd-side-user .nm{font-weight:700;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .asd-side-btn{display:block;text-align:center;border:0;cursor:pointer;font-family:Inter,sans-serif;font-weight:700;font-size:13.5px;color:#fff;background:#2F6FE0;padding:10px 14px;border-radius:12px;text-decoration:none;}
  .asd-side-btn.ghost{color:#2F6FE0;background:#EAF1FE;}
  /* Chat fills the whole main pane; app + speciality live in the sidebar */
  .asd-main{overflow:hidden;}
  .asd-main .asd{background:#fff;height:100%;min-height:100%;}
  .asd-main .asd-wrap{padding:0;max-width:none;height:100%;display:flex;flex-direction:column;}
  .asd-main .asd-wrap > .asd-top,
  .asd-main .asd-wrap > .asd-appbar,
  .asd-main .asd-wrap > .asd-lock,
  .asd-main .asd-wrap > .asd-mode,
  .asd-main .asd-wrap > .asd-mm,
  .asd-main .asd-wrap > .asd-whonote,
  .asd-main .asd-wrap > .asd-loading,
  .asd-main .asd-wrap > .asd-disc,
  .asd-main .asd-wrap > .asd-panel:not(.asd-chat){display:none!important;}
  .asd-main .asd-chat{flex:1;min-height:0;padding:0;margin:0;border-radius:0;box-shadow:none;background:transparent;}
  .asd-main .asd-chat > div{height:100%;}
  .asd-main .asd-chat > div > div{height:100%!important;max-height:none!important;min-height:0!important;max-width:900px!important;margin:0 auto!important;border-radius:0!important;box-shadow:none!important;border:0!important;}
  /* sidebar tools */
  .asd-side-tools{display:flex;flex-direction:column;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #e7e2d8;}
  .asd-side-spec{display:flex;flex-direction:column;gap:5px;}
  .asd-side-spec .lbl{font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa6c2;padding-left:2px;}
  .asd-dd{position:relative;}
  .asd-dd-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#141413;background:#f5f7fb;border:0;border-radius:12px;padding:10px 12px;cursor:pointer;box-shadow:inset 2px 2px 5px rgba(90,98,112,.16),inset -2px -2px 5px #fff;transition:box-shadow .15s ease;}
  .asd-dd-btn:hover{box-shadow:inset 1px 1px 3px rgba(90,98,112,.14),inset -1px -1px 3px #fff;}
  .asd-dd-btn:focus-visible{outline:2px solid #2F6FE0;outline-offset:2px;}
  .asd-dd-btn .cur{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;}
  .asd-dd-btn .chev{flex:0 0 auto;display:flex;color:#2F6FE0;transition:transform .18s ease;}
  .asd-dd-btn .chev svg{width:15px;height:15px;}
  .asd-dd-btn .chev.up{transform:rotate(180deg);}
  .asd-dd-menu{position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:40;display:flex;flex-direction:column;gap:2px;max-height:340px;overflow-y:auto;padding:6px;background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(28,40,64,.18),0 2px 8px rgba(28,40,64,.10),inset 0 0 0 1px rgba(230,234,242,.9);}
  .asd-dd-opt{display:block;width:100%;text-align:left;font-family:Inter,sans-serif;font-size:12.5px;font-weight:600;color:#2a3346;background:transparent;border:0;border-radius:9px;padding:9px 11px;cursor:pointer;transition:background .12s ease,color .12s ease;}
  .asd-dd-opt:hover{background:#EAF1FE;color:#2F6FE0;}
  .asd-dd-opt.on{background:#2F6FE0;color:#fff;}
  .asd-side-app{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-family:Inter,sans-serif;font-weight:700;font-size:13px;color:#2F6FE0;background:#EAF1FE;border-radius:12px;padding:10px 12px;}
  .asd-side-app svg{width:16px;height:16px;}
  .asd-side-app:hover{background:#D6E4FD;}
}
`;
