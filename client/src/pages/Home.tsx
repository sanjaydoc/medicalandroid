import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SIMD_CSS } from '../theme/simd';
import { BRAND, SPECIALITIES } from '../brand';
import { useAuth } from '../context/AuthContext';

// ChatGPT-style home, rendered in the Simulator's white neumorphic (.simd) theme.
// A left rail + centered greeting + a neumorphic ask box; submitting carries the
// question into the full Assistant page (the reused chat surface).
const HOME_CSS = `
.mh{display:flex;min-height:100vh;background:linear-gradient(180deg,#fdfdfc,#f4f7fd);}
.mh-side{width:264px;flex:none;display:flex;flex-direction:column;gap:14px;
  padding:18px 16px;background:#ffffff;border-right:1px solid var(--track);
  box-shadow:6px 0 24px -18px rgba(90,98,112,.5);}
.mh-brand{display:flex;align-items:center;gap:10px;font-family:var(--disp);font-weight:700;font-size:18px;color:var(--ink);}
.mh-logo{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--grad);color:#fff;box-shadow:3px 3px 8px var(--shd),-3px -3px 8px var(--shl);}
.mh-new{display:flex;align-items:center;gap:8px;width:100%;justify-content:flex-start;padding:11px 14px;border:0;border-radius:14px;
  background:#fff;color:var(--ink);font:inherit;font-weight:600;font-size:14px;cursor:pointer;
  box-shadow:4px 4px 10px var(--shd),-4px -4px 10px var(--shl);transition:transform .08s;}
.mh-new:hover{transform:translateY(-1px);}
.mh-nav{display:flex;flex-direction:column;gap:4px;margin-top:4px;}
.mh-nav a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:11px;color:var(--mut);
  font-size:14px;font-weight:600;text-decoration:none;transition:background .15s,color .15s;}
.mh-nav a:hover{background:#f1f5fd;color:var(--blue);}
.mh-side-foot{margin-top:auto;display:flex;flex-direction:column;gap:8px;}
.mh-tip{font-size:12px;color:var(--mut);line-height:1.5;}
.mh-btn{display:block;width:100%;text-align:center;padding:11px;border-radius:14px;font:inherit;font-weight:700;font-size:14px;
  text-decoration:none;cursor:pointer;border:0;transition:transform .08s;}
.mh-btn:hover{transform:translateY(-1px);}
.mh-btn.pri{background:var(--blue);color:#fff;box-shadow:4px 4px 10px rgba(47,111,224,.3);}
.mh-btn.ghost{background:#fff;color:var(--ink);box-shadow:4px 4px 10px var(--shd),-4px -4px 10px var(--shl);}

.mh-main{flex:1;min-width:0;display:flex;flex-direction:column;position:relative;}
.mh-top{display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:16px 22px;}
.mh-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 20px 8vh;gap:22px;}
.mh-h1{font-family:var(--disp);font-weight:700;font-size:clamp(26px,4vw,40px);color:var(--ink);text-align:center;letter-spacing:-.01em;margin:0;}
.mh-ask{width:100%;max-width:720px;display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;border-radius:22px;
  background:#fff;box-shadow:7px 7px 18px var(--shd),-6px -6px 16px var(--shl);}
.mh-ask input{flex:1;border:0;background:transparent;font:inherit;font-size:15.5px;color:var(--ink);outline:none;}
.mh-ask input::placeholder{color:var(--fnt);}
.mh-ic{width:38px;height:38px;flex:none;border:0;border-radius:50%;display:grid;place-items:center;cursor:pointer;
  background:#fff;color:var(--mut);box-shadow:3px 3px 7px var(--shd),-3px -3px 7px var(--shl);transition:transform .08s;}
.mh-ic:hover{transform:translateY(-1px);color:var(--blue);}
.mh-send{background:var(--blue);color:#fff;box-shadow:3px 3px 8px rgba(47,111,224,.35);}
.mh-send:hover{color:#fff;}
.mh-chips{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;max-width:720px;}
.mh-chip{padding:8px 15px;border-radius:999px;border:0;background:#fff;color:var(--ink);font:inherit;font-size:13px;font-weight:600;
  cursor:pointer;box-shadow:3px 3px 8px var(--shd),-3px -3px 8px var(--shl);transition:transform .08s,color .15s;}
.mh-chip:hover{transform:translateY(-1px);color:var(--blue);}
.mh-chip.on{background:var(--blue);color:#fff;box-shadow:inset 2px 2px 6px rgba(0,0,0,.15);}
.mh-foot{padding:14px 20px;text-align:center;font-size:11.5px;color:var(--mut);line-height:1.5;max-width:70ch;margin:0 auto;}
.mh-mtop{display:none;}
@media(max-width:820px){
  .mh-side{display:none;}
  .mh-mtop{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border-bottom:1px solid var(--track);}
  .mh-top{display:none;}
}
`;

function LogoMark() {
  return (
    <span className="mh-logo" aria-hidden>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [spec, setSpec] = useState('');

  const go = (question?: string) => {
    const text = (question ?? q).trim();
    try {
      sessionStorage.setItem('medimind_pending', JSON.stringify({ q: text, spec }));
    } catch { /* ignore */ }
    nav('/assistant');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    go();
  };

  return (
    <div className="simd">
      <style>{SIMD_CSS + HOME_CSS}</style>
      <div className="mh">
        {/* Sidebar (desktop) */}
        <aside className="mh-side">
          <div className="mh-brand"><LogoMark /> {BRAND.name}</div>
          <button className="mh-new" onClick={() => go('')}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New chat
          </button>
          <nav className="mh-nav">
            <Link to="/assistant"><NavIcon d="M4 5.5h16a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5H9l-4 3v-3H4A1.5 1.5 0 012.5 15V7A1.5 1.5 0 014 5.5z" /> Assistant</Link>
            <Link to="/assistant"><NavIcon d="M12 3v18M3 12h18" /> Ask by speciality</Link>
            {user && <Link to="/admin"><NavIcon d="M4 5h16v6H4zM4 15h10v4H4z" /> Admin</Link>}
          </nav>
          <div className="mh-side-foot">
            {user ? (
              <Link to="/admin" className="mh-btn ghost">{user.name || 'Account'}</Link>
            ) : (
              <>
                <p className="mh-tip"><b>Get answers tailored to you.</b> Log in to save your chats and history.</p>
                <Link to="/login" className="mh-btn ghost">Log in</Link>
                <Link to="/register" className="mh-btn pri">Sign up free</Link>
              </>
            )}
          </div>
        </aside>

        {/* Main */}
        <div className="mh-main">
          {/* Mobile top bar */}
          <div className="mh-mtop">
            <div className="mh-brand" style={{ fontSize: 16 }}><LogoMark /> {BRAND.name}</div>
            {user ? (
              <Link to="/admin" className="mh-btn ghost" style={{ width: 'auto', padding: '7px 14px' }}>Account</Link>
            ) : (
              <Link to="/login" className="mh-btn pri" style={{ width: 'auto', padding: '7px 16px' }}>Log in</Link>
            )}
          </div>

          {/* Top-right auth (desktop) */}
          <div className="mh-top">
            {user ? (
              <Link to="/admin" className="mh-btn ghost" style={{ width: 'auto', padding: '8px 18px' }}>Account</Link>
            ) : (
              <>
                <Link to="/login" className="mh-btn ghost" style={{ width: 'auto', padding: '8px 18px' }}>Log in</Link>
                <Link to="/register" className="mh-btn pri" style={{ width: 'auto', padding: '8px 18px' }}>Sign up free</Link>
              </>
            )}
          </div>

          <div className="mh-center">
            <h1 className="mh-h1">{BRAND.greeting}</h1>

            <form className="mh-ask" onSubmit={onSubmit}>
              <button type="button" className="mh-ic" aria-label="Attachments" onClick={() => go('')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={spec ? `Ask a ${spec} question…` : BRAND.inputPlaceholder}
                aria-label="Ask a medical question"
              />
              <button type="button" className="mh-ic" aria-label="Voice input" onClick={() => go()}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
              </button>
              <button type="submit" className="mh-ic mh-send" aria-label="Send">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V5M5 12l7-7 7 7" /></svg>
              </button>
            </form>

            <div className="mh-chips">
              {SPECIALITIES.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`mh-chip ${spec === s ? 'on' : ''}`}
                  onClick={() => setSpec(spec === s ? '' : s)}
                >
                  {s}
                </button>
              ))}
              <button type="button" className="mh-chip" onClick={() => go('What can you help me with?')}>
                What can you do?
              </button>
            </div>
          </div>

          <p className="mh-foot">{BRAND.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
