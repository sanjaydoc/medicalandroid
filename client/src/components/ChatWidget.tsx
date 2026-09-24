import { useEffect, useRef, useState } from 'react';
import {
  streamChat,
  fileToBase64,
  isChatConfigured,
  isNativeApp,
  type ChatMessage,
  type ContentBlock,
} from '../api/chat';
import { saveRow } from '../api/supabase';
import { BRAND } from '../brand';
import ClinicCards from './ClinicCards';
import ReportCanvas, { parseReport, stripEmoji, type ParsedReport } from './ReportCanvas';
import {
  findNearbyClinics,
  geocodeArea,
  getBrowserLocation,
  hospitalsNearUrl,
  type Clinic,
  type GeoPoint,
} from '../api/clinics';
import {
  parseVitals,
  looksLikeVitalLog,
  addVital,
  classify,
  loadVitals,
  avgLast,
  assessEscalation,
} from '../api/vitals';

interface Attachment {
  file: File;
  kind: 'image' | 'document';
  previewUrl?: string;
}

interface UIMsg {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { name: string; kind: 'image' | 'document' }[];
  clinics?: Clinic[];       // nearby-clinic cards (real OSM data)
  locationLabel?: string;
  center?: { lat: number; lon: number }; // search centre (for Google Maps deep-links)
  specialtyHint?: string;   // specialty context (for "search doctors" deep-link)
  suggestClinic?: boolean;  // show a "Find a clinic near me" nudge under this reply
  isReport?: boolean;       // render this assistant reply as the Report & Scan canvas
  report?: ParsedReport | null; // parsed structured interpretation
  reportImage?: string;     // data URL of the uploaded scan (imaging mode)
}

// When an assistant reply recommends in-person care, we offer the clinic finder.
// Requires an action verb near a care word, so it skips boilerplate like
// "this is not a diagnosis" or "confirm with your doctor".
const RECOMMENDS_CARE_RE =
  /\b(see|consult|visit|go to|seek|contact|refer(?:red)?(?: to)?)\b[^.?!]{0,45}\b(doctor|gp|physician|specialist|hospital|clinic|emergency|dermatologist|cardiologist|gyna|gynaecologist|gynecologist|paediatrician|pediatrician|dentist|pharmacist|neurologist|orthopa|ent|a&e|casualty|nearest)\b/i;

const MAX_IMAGE_MB = 5;
const MAX_PDF_MB = 10;

// When a report/scan is attached, ask the model for a structured interpretation
// so the Report & Scan canvas can render it (live marking + summary cards).
const REPORT_INSTRUCTION =
  'The attachment is a medical report or scan. Reply with ONLY one JSON object ' +
  '(you may wrap it in a ```json fence) and no other text, matching this schema: ' +
  '{"type":"lab"|"imaging","title":"short e.g. Blood report · 19 Aug 2026",' +
  '"findings":[{"section":"e.g. Liver (LFT)","label":"Test name","value":"result with unit","range":"normal range","status":"ok"|"flag","note":"<=5 words, only when flagged"}],' +
  '"imageFindings":[{"status":"flag"|"ok","label":"short finding","note":"optional"}],' +
  '"simple":[{"sev":"watch"|"mild"|"ok","title":"short","detail":"one plain sentence"}],' +
  '"seriousLevel":"short phrase e.g. Early warning signs","serious":["short bullet"],"next":["short action bullet"]}. ' +
  'Rules: for a blood/lab report use type "lab" and fill findings for EVERY test (status "flag" when the value is outside its normal range, else "ok"); omit imageFindings. ' +
  'For an X-ray/CT/MRI/ultrasound/ECG image use type "imaging" and fill imageFindings; omit findings. ' +
  'Always fill simple, seriousLevel, serious and next. Use simple language a patient understands. ' +
  'Educational only, not a diagnosis. Do NOT use any emoji, symbols or decorative characters in any text value — plain text only. ' +
  'If a reply language was requested above, translate all text values.';

const SUGGESTIONS = [
  'Explain my prescription, X-ray, MRI or CT',
  'What do my blood test results mean?',
];

// Language code (for speech) → English name (for the reply instruction).
const LANG_NAME: Record<string, string> = {
  'en-IN': 'English',
  'ta-IN': 'Tamil',
  'hi-IN': 'Hindi',
  'ml-IN': 'Malayalam',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'bn-IN': 'Bengali',
  'mr-IN': 'Marathi',
  'ur-PK': 'Urdu',
  'ar-SA': 'Arabic',
  'fr-FR': 'French',
  'de-DE': 'German',
  'es-ES': 'Spanish',
  'it-IT': 'Italian',
  'pt-PT': 'Portuguese',
  'ru-RU': 'Russian',
  'nl-NL': 'Dutch',
  'zh-CN': 'Chinese',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'ms-MY': 'Malay',
};

// Persist the conversation so history + memory survive closing the widget,
// navigating away, or reloading the page.
const STORAGE_KEY = 'stemcells_chat_history_v1';
const LANG_KEY = 'stemcells_chat_lang_v1';
const DOCTOR_KEY = 'stemcells_chat_doctor_v1';

function loadMessages(): UIMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed as UIMsg[];
  } catch {
    return [];
  }
}

const OPEN_KEY = 'scp_chat_open';
const EXPAND_KEY = 'scp_chat_expanded';
const OFFLINE_KEY = 'stemcells_chat_offline_v1';
// Only the packaged Android app can go offline (on-device LSM + LLM). On the web
// this is always false, so the online/offline toggle never shows.
const NATIVE_APP = isNativeApp();

export default function ChatWidget({ fullPage = false, specialty = '', offline: offlineProp, fullscreen = false, onToggleFullscreen, canFullscreen = true, initialMessage = '' }: { fullPage?: boolean; specialty?: string; offline?: boolean; fullscreen?: boolean; onToggleFullscreen?: () => void; canFullscreen?: boolean; initialMessage?: string }) {
  // Persist the open state for the browser session so a remount (e.g. a mobile
  // browser reloading the page after the native file picker, or a parent
  // re-render) does not "kick the user out" of the chat mid-upload.
  const [open, setOpen] = useState<boolean>(() => {
    try { return sessionStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* ignore */ }
  }, [open]);
  // Desktop-only "expand" — widens/heightens the floating panel. Persisted for
  // the session; ignored on mobile (the panel is a full-width bottom sheet there).
  const [expanded, setExpanded] = useState<boolean>(() => {
    try { return sessionStorage.getItem(EXPAND_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(EXPAND_KEY, expanded ? '1' : '0'); } catch { /* ignore */ }
  }, [expanded]);
  const [messages, setMessages] = useState<UIMsg[]>(loadMessages);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clinicMode, setClinicMode] = useState(false); // awaiting the user's area
  const [clinicBusy, setClinicBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [voiceLang, setVoiceLang] = useState(() => {
    try {
      return localStorage.getItem(LANG_KEY) || '';
    } catch {
      return '';
    }
  });
  const [doctorMode, setDoctorMode] = useState(() => {
    try {
      return localStorage.getItem(DOCTOR_KEY) === '1';
    } catch {
      return false;
    }
  });
  // Android only: offline = on-device LSM + LLM; online = Anthropic API. Default
  // to offline in the app (its whole purpose is working with no signal); the user
  // can flip to online when they have connectivity. Always false on the web.
  //
  // When the parent passes `offline`, the widget is CONTROLLED — the big
  // Online/Offline switch on the Assistant page owns the state (and localStorage),
  // and the small in-widget toggle is gone. Otherwise it self-manages.
  const controlledOffline = offlineProp !== undefined;
  const [offlineState, setOfflineState] = useState<boolean>(() => {
    if (!NATIVE_APP) return false;
    try {
      return localStorage.getItem(OFFLINE_KEY) === '1'; // v1 online-first default
    } catch {
      return false;
    }
  });
  const offline = controlledOffline ? !!offlineProp : offlineState;
  void setOfflineState; // self-managed path retained; switching is done on the Assistant page
  useEffect(() => {
    if (!NATIVE_APP || controlledOffline) return;
    try { localStorage.setItem(OFFLINE_KEY, offline ? '1' : '0'); } catch { /* ignore */ }
  }, [offline, controlledOffline]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const configured = isChatConfigured();
  const speechSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // ---- Voice input (Web Speech API) ----
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = voiceLang || navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  // ---- Export / save the conversation ----
  const transcriptRows = () =>
    messages
      .filter((m) => m.text && !m.text.startsWith('⚠️'))
      .map((m) => ({ who: m.role === 'user' ? 'You' : `${BRAND.name} AI`, text: m.text }));

  const downloadBlob = (content: BlobPart, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const transcriptHtml = () => {
    // Render the assistant's Markdown to clean HTML so exports show bold,
    // headings and bullets instead of raw ** and ## symbols.
    const rows = transcriptRows()
      .map(
        (r) =>
          `<div style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5"><b style="color:#2f6fe0">${r.who}:</b><div>${mdToHtml(
            r.text,
          )}</div></div>`,
      )
      .join('');
    const when = new Date().toLocaleString();
    return `<h2 style="font-family:Arial,sans-serif">${BRAND.name} — chat summary</h2><p style="color:#666;font-family:Arial,sans-serif;font-size:12px">${when}</p><hr>${rows}<hr><p style="color:#888;font-family:Arial,sans-serif;font-size:11px">Educational information only — not a diagnosis or prescription. Confirm with your doctor.</p>`;
  };

  // Strip Markdown for the plain-text export.
  const stripMd = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^\s*---\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const exportText = () => {
    const txt = transcriptRows()
      .map((r) => `${r.who}:\n${stripMd(r.text)}\n`)
      .join('\n');
    downloadBlob(txt, 'text/plain;charset=utf-8', 'stemcells-chat.txt');
    setExportOpen(false);
  };

  const exportWord = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">${transcriptHtml()}</body></html>`;
    downloadBlob(html, 'application/msword', 'stemcells-chat.doc');
    setExportOpen(false);
  };

  const exportPdf = () => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(
        `<html><head><meta charset="utf-8"><title>${BRAND.name} chat</title></head><body>${transcriptHtml()}</body></html>`,
      );
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1500);
      }, 300);
    }
    setExportOpen(false);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if ((!open && !fullPage) || !el) return;
    // First open (only the greeting, no conversation yet): keep the view at the top
    // so the greeting + sample CTA read from the start — no jump arrow here.
    if (messages.length === 0) { el.scrollTop = 0; setShowJump(false); return; }
    // Otherwise follow the conversation to the bottom ONLY if the user is already
    // near it. If they've scrolled up to read, don't yank them down — the jump
    // arrow lets them return (Claude-style).
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) { el.scrollTop = el.scrollHeight; setShowJump(false); }
  }, [messages, open, busy, fullPage]);

  // On open / mount / page refresh, jump straight to the latest message so the
  // user always lands on the current conversation, not the very first message.
  // Runs a few times to survive late layout (web fonts, markdown/canvas reflow).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || (!open && !fullPage) || messages.length === 0) return;
    const jump = () => { el.scrollTop = el.scrollHeight; setShowJump(false); };
    jump();
    const id = requestAnimationFrame(jump);
    const t1 = setTimeout(jump, 90);
    const t2 = setTimeout(jump, 300);
    return () => { cancelAnimationFrame(id); clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fullPage]);

  // Persist the conversation (keep the last 60 turns to stay well under quota).
  useEffect(() => {
    try {
      if (messages.length === 0) localStorage.removeItem(STORAGE_KEY);
      // Strip the (potentially large) scan data URL before persisting so we don't
      // blow the localStorage quota; the parsed report + cards are still kept.
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(
        messages.slice(-60).map((m) => (m.reportImage ? { ...m, reportImage: '' } : m)),
      ));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [messages]);

  // Remember the chosen language across visits.
  useEffect(() => {
    try {
      if (voiceLang) localStorage.setItem(LANG_KEY, voiceLang);
      else localStorage.removeItem(LANG_KEY);
    } catch {
      /* ignore */
    }
  }, [voiceLang]);

  // Remember the Doctor-mode preference across visits.
  useEffect(() => {
    try {
      if (doctorMode) localStorage.setItem(DOCTOR_KEY, '1');
      else localStorage.removeItem(DOCTOR_KEY);
    } catch {
      /* ignore */
    }
  }, [doctorMode]);

  // Clean up object URLs.
  useEffect(() => {
    return () => attachments.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickFiles = (files: FileList | null) => {
    if (!files) return;
    setError('');
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        setError('Supported: images (JPG/PNG) or PDF.');
        continue;
      }
      const mb = file.size / (1024 * 1024);
      if (isImage && mb > MAX_IMAGE_MB) {
        setError(`Images must be under ${MAX_IMAGE_MB} MB.`);
        continue;
      }
      if (isPdf && mb > MAX_PDF_MB) {
        setError(`PDFs must be under ${MAX_PDF_MB} MB.`);
        continue;
      }
      next.push({
        file,
        kind: isImage ? 'image' : 'document',
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 4));
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (i: number) => {
    setAttachments((prev) => {
      const a = prev[i];
      if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // ---- Nearby clinic / hospital finder (real OpenStreetMap data, no LLM) ----
  const looksLikeClinicIntent = (t: string): boolean => {
    const s = t.toLowerCase();
    const place = /(hospital|clinic|doctor|physician|specialist|gp|nursing home|medical centre|medical center)/;
    const near = /(near\s?me|nearby|near by|nearest|closest|around me|in my area|close to me|around here)/;
    if (near.test(s) && place.test(s)) return true;
    if (/\b(find|where.*(can|do) i (find|see|go)|show me|recommend|suggest)\b/.test(s) && place.test(s)) return true;
    return false;
  };

  const runClinicSearch = async (point: GeoPoint, specialtyHint = '') => {
    setClinicBusy(true);
    setMessages((m) => [...m, { role: 'assistant', text: `Finding hospitals & clinics near ${point.label || 'you'}…` }]);
    try {
      const clinics = await findNearbyClinics(point, specialtyHint);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = clinics.length
          ? {
              role: 'assistant',
              text: `Here ${clinics.length === 1 ? 'is 1 option' : `are ${clinics.length} options`} near ${point.label || 'you'}. Tap a name for photos & reviews, or Directions / Call — and please confirm they treat your condition before travelling.`,
              clinics,
              locationLabel: point.label,
              center: { lat: point.lat, lon: point.lon },
              specialtyHint,
            }
          : {
              role: 'assistant',
              text: `I couldn't find hospitals or clinics listed near ${point.label || 'that area'} in the free map data — but you can see them on Google Maps:\n\n[Open hospitals near you on Google Maps](${hospitalsNearUrl(point)})`,
            };
        return copy;
      });
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          text: `⚠️ ${e instanceof Error ? e.message : 'The map service is busy just now.'} In the meantime, open hospitals near you directly on Google Maps:\n\n[Open hospitals near you on Google Maps](${hospitalsNearUrl(point)})`,
        };
        return copy;
      });
      setClinicMode(true);
    } finally {
      setClinicBusy(false);
    }
  };

  const startClinicFlow = () => {
    setClinicMode(true);
    setMessages((m) => [
      ...m,
      { role: 'assistant', text: 'I can find hospitals & clinics near you. Tap **Use my location** below, or just type your area (e.g. "T. Nagar, Chennai").' },
    ]);
  };

  const showVitalHelp = () => {
    setMessages((m) => [
      ...m,
      { role: 'assistant', text: 'To track your health, just type a reading like **“bp 130/85”** or **“sugar 140 fasting”** — I’ll log it, tell you if it’s in range, flag any concern, and track your trend. Your charts live on your **Account** page.' },
    ]);
  };

  const useMyLocation = async () => {
    setClinicMode(false);
    try {
      const p = await getBrowserLocation();
      await runClinicSearch(p, specialty);
    } catch (e) {
      setClinicMode(true);
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `${e instanceof Error ? e.message : 'Location unavailable.'} No problem — type your area (e.g. "Bandra, Mumbai") and I'll find clinics there.` },
      ]);
    }
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if ((!text && attachments.length === 0) || busy || clinicBusy) return;
    setError('');

    // If we're waiting for the user's area (clinic flow), treat this as the area.
    if (clinicMode && text) {
      setMessages((m) => [...m, { role: 'user', text }]);
      setInput('');
      setClinicMode(false);
      try {
        const p = await geocodeArea(text);
        await runClinicSearch(p, specialty);
      } catch (e) {
        setClinicMode(true);
        setMessages((m) => [...m, { role: 'assistant', text: `${e instanceof Error ? e.message : 'Could not find that area.'} Try a nearby town or a more specific area.` }]);
      }
      return;
    }

    // Detect "find a hospital/clinic/doctor near me" and start the location flow.
    if (text && looksLikeClinicIntent(text)) {
      setMessages((m) => [...m, { role: 'user', text }]);
      setInput('');
      startClinicFlow();
      return;
    }

    // Chronic-Condition Coach: log one OR MORE BP / sugar readings (local, no LLM).
    if (text && !clinicMode && looksLikeVitalLog(text)) {
      const parsedList = parseVitals(text);
      if (parsedList.length) {
        const recs = parsedList.map((p) => addVital(p));
        const all = loadVitals();
        const esc = assessEscalation(all);
        const lines = recs.map((rec) => {
          const c = classify(rec);
          const valStr =
            rec.type === 'bp' ? `${rec.systolic}/${rec.diastolic} mmHg`
            : rec.type === 'glucose' ? `${rec.glucose} mg/dL (${rec.context})`
            : `${rec.weight} kg`;
          return `- **${valStr}** — ${c.label}${c.detail ? ` (${c.detail})` : ''}`;
        });
        let reply = recs.length > 1 ? `Logged ${recs.length} readings:\n${lines.join('\n')}` : `Logged: ${lines[0].replace(/^- /, '')}`;
        // trend note (per type present)
        if (recs.some((r) => r.type === 'bp')) {
          const a = avgLast(all, 'bp', 7) as { systolic: number; diastolic: number; count: number } | null;
          if (a && a.count > 1) reply += `\n\nBP 7-day average: ${a.systolic}/${a.diastolic} (${a.count} readings).`;
        }
        if (recs.some((r) => r.type === 'glucose')) {
          const a = avgLast(all, 'glucose', 7) as { glucose: number; count: number } | null;
          if (a && a.count > 1) reply += `\nSugar 7-day average: ${a.glucose} mg/dL (${a.count} readings).`;
        }
        reply += `\n\n${esc.message}`;
        reply += `\n\nSee your full trends & charts on your **Account** page.`;
        setMessages((m) => [
          ...m,
          { role: 'user', text },
          { role: 'assistant', text: reply, suggestClinic: esc.level === 'urgent' || esc.level === 'soon' },
        ]);
        setInput('');
        return;
      }
    }

    if (!configured) {
      setMessages((m) => [
        ...m,
        { role: 'user', text: text || '(attachment)' },
        {
          role: 'assistant',
          text: "The AI assistant isn't connected on this deployment yet. In the meantime, please use “Book a consultation” and our specialist team will get back to you.",
        },
      ]);
      setInput('');
      setAttachments([]);
      return;
    }

    // Build the content blocks for the API from text + attachments.
    // An attachment triggers "report mode": we ask the model for structured JSON
    // and render it in the Report & Scan canvas instead of plain text.
    const isReport = attachments.length > 0;
    let reportImage = '';
    const blocks: ContentBlock[] = [];
    for (const a of attachments) {
      try {
        const data = await fileToBase64(a.file);
        if (a.kind === 'image') {
          blocks.push({ type: 'image', source: { type: 'base64', media_type: a.file.type, data } });
          if (!reportImage) reportImage = `data:${a.file.type};base64,${data}`;
        } else {
          blocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data },
          });
        }
      } catch {
        setError('Could not read one of the attached files.');
        return;
      }
    }
    if (text) blocks.push({ type: 'text', text });
    // If the patient picked a language, instruct the assistant to reply in it
    // (works even when they type in English/transliteration). Not shown in the
    // chat bubble — only sent to the model.
    if (voiceLang && LANG_NAME[voiceLang]) {
      blocks.push({ type: 'text', text: `(Please reply in ${LANG_NAME[voiceLang]}.)` });
    }
    // If the patient chose a speciality, orient the answer to it (context only —
    // not shown in the chat bubble). Still general info, still defers to a clinician.
    if (specialty) {
      blocks.push({ type: 'text', text: `(Background: the person's area of interest is ${specialty}. Use that only as light context — ALWAYS directly and fully answer the actual question they ask, whatever the topic (e.g. a cold, a medicine, a dose). Do NOT refuse or say you only cover ${specialty}, and do NOT open with a scope description — just answer. General information, not a diagnosis; suggest confirming with a pharmacist or doctor.)` });
    }

    if (isReport) {
      blocks.push({ type: 'text', text: REPORT_INSTRUCTION });
    }

    const uiAttach = attachments.map((a) => ({ name: a.file.name, kind: a.kind }));
    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.text }));
    history.push({ role: 'user', content: blocks.length ? blocks : text });

    setMessages((m) => [
      ...m,
      { role: 'user', text: text || '(attachment)', attachments: uiAttach },
      { role: 'assistant', text: '', isReport, reportImage },
    ]);
    setInput('');
    setAttachments([]);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let acc = '';
    const runStream = async () => {
      acc = '';
      await streamChat({
        messages: history,
        signal: ctrl.signal,
        mode: doctorMode ? 'doctor' : 'concise',
        report: isReport,
        offline,
        onText: (chunk) => {
          acc += chunk;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { ...copy[copy.length - 1], text: acc };
            return copy;
          });
        },
      });
    };

    try {
      await runStream();
      // Empty reply = a transient hiccup (brief model overload / dropped
      // stream). Retry once automatically before giving up.
      if (!acc.trim() && !ctrl.signal.aborted) {
        await runStream();
      }
      if (!acc.trim() && !ctrl.signal.aborted) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            ...copy[copy.length - 1],
            text: '⚠️ No reply came back — please tap send to try again.',
          };
          return copy;
        });
      }
      // Report mode: parse the structured JSON into the canvas; if the model
      // didn't return valid JSON, fall back to showing its text as a normal reply.
      if (isReport && acc.trim()) {
        const parsed = parseReport(acc);
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            copy[copy.length - 1] = parsed
              ? { ...last, report: parsed, isReport: true, text: '' }
              : { ...last, isReport: false, text: acc };
          }
          return copy;
        });
      }
      // If the reply recommends in-person care, offer the clinic finder.
      if (acc.trim() && !isReport && RECOMMENDS_CARE_RE.test(acc)) {
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant' && !last.clinics) {
            copy[copy.length - 1] = { ...last, suggestClinic: true };
          }
          return copy;
        });
      }
      // Log the exchange to the clinic database (insert-only, RLS-protected).
      if (acc.trim()) {
        saveRow('chat_logs', {
          language: voiceLang || 'auto',
          question: text || '(attachment only)',
          answer: acc,
          had_attachment: uiAttach.length > 0,
        });
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        const detail = (e?.message || 'Could not reach the assistant.').toString();
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant' && !last.text) {
            copy[copy.length - 1] = { ...last, text: `⚠️ ${detail}` };
          }
          return copy;
        });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // Auto-send a question handed over from the home page (once, on mount).
  const initSentRef = useRef(false);
  useEffect(() => {
    if (initSentRef.current) return;
    const msg = (initialMessage || '').trim();
    if (!msg) return;
    initSentRef.current = true;
    const id = setTimeout(() => { void send(msg); }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  const stop = () => abortRef.current?.abort();

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setExportOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Show a "jump to latest" chevron when the user has scrolled up from the bottom.
  const onMsgScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Only offer "jump to latest" once a real conversation exists AND the user
    // has scrolled up away from the newest message.
    const scrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
    setShowJump(messages.length > 0 && scrolledUp);
  };
  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  return (
    <>
      {/* Launcher — sits above the hero search card */}
      {!fullPage && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group mb-5 flex w-full max-w-2xl items-center gap-3 rounded-2xl bg-white/10 p-3 text-left ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 sm:p-4"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay-500 text-white shadow-sm">
            <SparkIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-white">Ask the {BRAND.name} assistant</span>
            <span className="block truncate text-sm text-white/60">
              Therapies, recovery &amp; post-op care, medications — attach a report too
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition group-hover:bg-white/20">
            Chat
          </span>
        </button>
      )}

      {/* Chat panel — full page on /assistant, else floating on desktop / bottom sheet on mobile */}
      {(open || fullPage) && (
        <div className={fullPage ? 'w-full' : 'fixed inset-x-0 bottom-0 z-[60] sm:inset-x-auto sm:bottom-6 sm:right-6'}>
          <div
            className={fullPage
              ? (fullscreen
                  ? 'cw-fs-panel mx-auto flex w-full max-w-3xl flex-col overflow-hidden bg-white'
                  : 'mx-auto flex h-[calc(100vh-8rem)] min-h-[500px] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink-900/10')
              : `mx-auto flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-ink-900/10 transition-[width,height] duration-200 sm:max-h-[92vh] sm:rounded-3xl ${
                  expanded ? 'sm:h-[88vh] sm:w-[720px]' : 'sm:h-[600px] sm:max-h-[80vh] sm:w-[400px]'
                }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-ink-900 px-4 py-3.5 text-white">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-clay-500">
                <SparkIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{BRAND.name} AI</p>
                <div className="flex items-center gap-2 text-xs">
                  {busy ? (
                    <span className="flex items-center gap-2 text-white/70"><CellLoader /> Generating…</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-white/60">
                      <span className={`h-2 w-2 rounded-full ${NATIVE_APP && offline ? 'bg-sky-400' : 'bg-green-400'}`} />
                      {NATIVE_APP && offline ? 'Offline · on-device' : 'Online'}
                    </span>
                  )}
                  {fullPage && onToggleFullscreen && (
                    <button
                      type="button"
                      onClick={onToggleFullscreen}
                      disabled={!canFullscreen}
                      title={canFullscreen ? (fullscreen ? 'Exit full screen' : 'Full screen') : 'Pick Online or Offline first'}
                      className="cw-fsbtn ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-clay-500 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-clay-600 disabled:opacity-40"
                    >
                      {fullscreen ? (
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4v3a2 2 0 0 1-2 2H4M20 9h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3M15 20v-3a2 2 0 0 1 2-2h3" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" /></svg>
                      )}
                      {fullscreen ? 'Exit' : 'Full screen'}
                    </button>
                  )}
                </div>
              </div>
              {messages.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setExportOpen((v) => !v)}
                    aria-label="Save or export chat"
                    className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
                    </svg>
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-xl bg-white py-1 text-ink-900 shadow-xl ring-1 ring-ink-900/10">
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">
                        Save chat as
                      </p>
                      <button onClick={exportPdf} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream-100">
                        <DocIcon />
                        PDF
                      </button>
                      <button onClick={exportWord} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream-100">
                        <DocIcon />
                        Word (.doc)
                      </button>
                      <button onClick={exportText} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream-100">
                        <DocIcon />
                        Text (.txt)
                      </button>
                      <div className="my-1 border-t border-cream-300" />
                      <button
                        onClick={clearChat}
                        className="block w-full px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Clear chat
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!fullPage && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? 'Shrink chat' : 'Expand chat'}
                  title={expanded ? 'Shrink' : 'Expand'}
                  className="hidden h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white sm:grid"
                >
                  {expanded ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 9L4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4M15 15l5 5m0 0v-4m0 4h-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 9V4m0 0h5M4 4l6 6M20 9V4m0 0h-5m5 0l-6 6M4 15v5m0 0h5m-5 0l6-6M20 15v5m0 0h-5m5 0l-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
              {!fullPage && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Minimise chat"
                  className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="relative min-h-0 flex-1">
              <div ref={scrollRef} onScroll={onMsgScroll} className="h-full space-y-4 overflow-y-auto bg-cream-100 p-4">
              <GreetingBubble />
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-clay-200 bg-white px-3 py-1.5 text-xs font-semibold text-clay-700 transition hover:border-clay-400 hover:bg-clay-50"
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={startClinicFlow}
                    className="inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-white px-3 py-1.5 text-xs font-semibold text-clay-700 transition hover:border-clay-400 hover:bg-clay-50"
                  >
                    <PinIcon />
                    Find a clinic near me
                  </button>
                  <button
                    onClick={showVitalHelp}
                    className="inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-white px-3 py-1.5 text-xs font-semibold text-clay-700 transition hover:border-clay-400 hover:bg-clay-50"
                  >
                    <PulseIcon />
                    Track BP / sugar
                  </button>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i}>
                  {m.isReport && m.role === 'assistant' && (m.report || (busy && i === messages.length - 1)) ? (
                    <ReportCanvas
                      report={m.report}
                      loading={busy && i === messages.length - 1 && !m.report}
                      imageUrl={m.reportImage}
                    />
                  ) : (
                    <Bubble
                      role={m.role}
                      text={m.text}
                      attachments={m.attachments}
                      loading={busy && i === messages.length - 1 && m.role === 'assistant'}
                    />
                  )}
                  {m.clinics && m.clinics.length > 0 && (
                    <ClinicCards
                      clinics={m.clinics}
                      locationLabel={m.locationLabel}
                      center={m.center}
                      specialty={m.specialtyHint}
                    />
                  )}
                  {m.suggestClinic && !m.clinics && !clinicMode && (
                    <button
                      type="button"
                      onClick={startClinicFlow}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-clay-300 bg-clay-50 px-3 py-1.5 text-xs font-bold text-clay-700 transition hover:border-clay-400 hover:bg-clay-100"
                    >
                      <PinIcon />
                      Find a clinic or hospital near you
                    </button>
                  )}
                </div>
              ))}
              {clinicBusy && (
                <p className="text-xs font-semibold text-clay-600">Searching the map…</p>
              )}
              </div>
              {showJump && (
                <button
                  type="button"
                  onClick={jumpToBottom}
                  aria-label="Scroll to latest"
                  className="absolute bottom-3 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full bg-white text-ink-800 shadow-lg ring-1 ring-ink-900/10 transition hover:bg-cream-100"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 10l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-cream-300 bg-white p-3">
              {clinicMode && (
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={clinicBusy}
                    className="flex items-center gap-1.5 rounded-full bg-clay-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-clay-600 disabled:opacity-50"
                  >
                    <PinIcon />
                    Use my location
                  </button>
                  <span className="text-xs text-ink-700/60">or type your area below</span>
                  <button
                    type="button"
                    onClick={() => setClinicMode(false)}
                    className="ml-auto text-xs font-semibold text-ink-700/50 hover:text-ink-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg bg-cream-200 py-1 pl-2 pr-1 text-xs font-semibold text-ink-800"
                    >
                      {a.kind === 'image' ? <ImageIcon /> : <FileIcon />}
                      <span className="max-w-[120px] truncate">{a.file.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        aria-label="Remove attachment"
                        className="grid h-4 w-4 place-items-center rounded text-ink-700/60 hover:text-ink-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs text-ink-700/60">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
                </svg>
                <span>Lang</span>
                <select
                  value={voiceLang}
                  onChange={(e) => setVoiceLang(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-cream-300 bg-white px-1.5 py-0.5 font-semibold text-ink-800 focus:border-clay-400 focus:outline-none"
                  aria-label="Chat language (typing, voice and replies)"
                >
                  <option value="">Auto-detect</option>
                  <option value="en-IN">English</option>
                  <optgroup label="India">
                    <option value="ta-IN">தமிழ் (Tamil)</option>
                    <option value="hi-IN">हिन्दी (Hindi)</option>
                    <option value="ml-IN">മലയാളം (Malayalam)</option>
                    <option value="te-IN">తెలుగు (Telugu)</option>
                    <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                    <option value="bn-IN">বাংলা (Bengali)</option>
                    <option value="mr-IN">मराठी (Marathi)</option>
                    <option value="ur-PK">اردو (Urdu)</option>
                  </optgroup>
                  <optgroup label="International">
                    <option value="ar-SA">العربية (Arabic)</option>
                    <option value="fr-FR">Français (French)</option>
                    <option value="de-DE">Deutsch (German)</option>
                    <option value="es-ES">Español (Spanish)</option>
                    <option value="it-IT">Italiano (Italian)</option>
                    <option value="pt-PT">Português (Portuguese)</option>
                    <option value="ru-RU">Русский (Russian)</option>
                    <option value="nl-NL">Nederlands (Dutch)</option>
                    <option value="zh-CN">中文 (Chinese)</option>
                    <option value="ja-JP">日本語 (Japanese)</option>
                    <option value="ko-KR">한국어 (Korean)</option>
                    <option value="ms-MY">Bahasa Melayu (Malay)</option>
                  </optgroup>
                </select>

                {/* The Online/Offline switch lives on the Assistant page (big
                    switch above the chat) — see Assistant.tsx. Not repeated here. */}
                <button
                  type="button"
                  onClick={() => setDoctorMode((v) => !v)}
                  aria-pressed={doctorMode}
                  title="Doctor mode: full, detailed clinical answers. Off: short, patient-friendly answers."
                  className={`ml-auto flex items-center gap-1.5 rounded-full px-1.5 py-0.5 font-semibold transition ${
                    doctorMode ? 'text-clay-700' : 'text-ink-700/70 hover:text-ink-900'
                  }`}
                >
                  <span
                    className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
                      doctorMode ? 'bg-clay-500' : 'bg-cream-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                        doctorMode ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </span>
                  Doctor mode
                </button>
              </div>
              <div className="flex items-end gap-2">
                {/* Native <label> trigger: tapping it opens the OS file picker
                    directly (no JS .click() on a display:none input, which some
                    mobile browsers drop). The input stays in the DOM. */}
                <label
                  aria-label="Attach a file"
                  title="Attach an ECG / scan / report (image or PDF)"
                  className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-cream-300 text-ink-700/70 transition hover:border-clay-400 hover:text-clay-600"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="sr-only"
                    onChange={(e) => pickFiles(e.target.files)}
                  />
                  <ClipIcon />
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder={listening ? 'Listening…' : 'Ask a question…'}
                  className="max-h-28 min-h-[44px] w-full resize-none rounded-xl border border-cream-300 px-3 py-2.5 text-ink-900 placeholder:text-ink-700/40 focus:border-clay-400 focus:outline-none focus:ring-2 focus:ring-clay-200"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={listening ? 'Stop voice input' : 'Speak your question'}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition ${
                      listening
                        ? 'animate-pulse border-clay-400 bg-clay-50 text-clay-600'
                        : 'border-cream-300 text-ink-700/70 hover:border-clay-400 hover:text-clay-600'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-900 text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => send()}
                    aria-label="Send"
                    disabled={!input.trim() && attachments.length === 0}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-clay-500 text-white transition hover:bg-clay-600 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Structured, eye-catching first-run greeting — replaces a plain text bubble.
function GreetingBubble() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white p-3.5 text-sm leading-relaxed text-ink-900 ring-1 ring-cream-300">
        <p className="font-bold text-ink-900">Hi — I'm {BRAND.name}, your medical assistant</p>

        <p className="mt-2.5 text-ink-800">
          Ask a health question in any language, or attach an{' '}
          <span className="font-semibold text-ink-900">ECG, X-ray, MRI, CT, prescription or lab report</span>{' '}
          and I'll explain it in simple words.
        </p>

        <p className="mt-2.5 text-ink-800">
          Pick a <span className="font-semibold text-ink-900">speciality</span> above to focus the answer,
          or just start typing.
        </p>

        <p className="mt-2 text-[11px] italic text-ink-700/55">
          General information, not a diagnosis — always consult a qualified clinician.
        </p>
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  attachments,
  loading,
}: {
  role: 'user' | 'assistant';
  text: string;
  attachments?: { name: string; kind: 'image' | 'document' }[];
  loading?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-clay-500 text-white'
            : 'rounded-bl-md bg-white text-ink-900 ring-1 ring-cream-300'
        }`}
      >
        {attachments && attachments.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <span
                key={i}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  isUser ? 'bg-white/20' : 'bg-cream-200 text-ink-800'
                }`}
              >
                {a.kind === 'image' ? <ImageIcon /> : <FileIcon />}
                <span className="max-w-[110px] truncate">{a.name}</span>
              </span>
            ))}
          </div>
        )}
        {isUser ? (
          text
        ) : (
          <>
            {text && <div className="chat-md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />}
            {loading && <CellLoader className={text ? 'mt-2 inline-block' : ''} />}
          </>
        )}
      </div>
    </div>
  );
}

// Minimal, safe Markdown → HTML for assistant replies. Escapes HTML first,
// then introduces only our own tags, so there is no XSS surface.
function mdToHtml(src: string): string {
  src = stripEmoji(src); // guarantee no emoji / 3D icons in any assistant output
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (t: string) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  const lines = escape(src).split('\n');
  let html = '';
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      html += `</${list}>`;
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      closeList();
      html += '<hr>';
    } else if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) {
      closeList();
      html += `<h4>${inline(m[1])}</h4>`;
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (list !== 'ul') {
        closeList();
        html += '<ul>';
        list = 'ul';
      }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (list !== 'ol') {
        closeList();
        html += '<ol>';
        list = 'ol';
      }
      html += `<li>${inline(m[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

// Dividing stem-cell loader — shown while the assistant is generating.
function CellLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`cell-loader ${className}`} role="status" aria-label="Generating answer">
      <span className="m" />
      <span className="n" />
      <span className="bud" />
    </span>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ClipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M21 11.5l-8.5 8.5a5 5 0 01-7-7l8.5-8.5a3.3 3.3 0 014.7 4.7L10 17.4a1.7 1.7 0 01-2.4-2.4l7.8-7.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2 5 4-12 2 7h6" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-700/60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinejoin="round" />
    </svg>
  );
}
