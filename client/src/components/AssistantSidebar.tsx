import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BRAND } from '../brand';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

// Desktop-only left navigation for the Assistant page (Claude-style full-screen
// layout). Hidden below md — mobile keeps the top navbar.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const LINKS: { to: string; label: string; icon: JSX.Element }[] = [
  { to: '/assistant', label: 'Assistant', icon: <svg viewBox="0 0 24 24" {...S}><path d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3z" /></svg> },
  { to: '/workflows', label: 'Workflows', icon: <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> },
  { to: '/research', label: 'Research', icon: <svg viewBox="0 0 24 24" {...S}><path d="M9 3h6M10 3v5.5L6.2 16a2 2 0 0 0 1.8 2.9h8a2 2 0 0 0 1.8-2.9L14 8.5V3" /><path d="M8.3 14h7.4" /></svg> },
  { to: '/about', label: 'About', icon: <svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg> },
];

export default function AssistantSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const cls = ({ isActive }: { isActive: boolean }) =>
    `asd-nav-item${isActive ? ' on' : ''}`;

  return (
    <aside className="asd-side">
      <Link to="/" className="asd-side-brand">
        <BrandLogo className="h-8 w-8" />
        <span>{BRAND.name}</span>
      </Link>

      <nav className="asd-nav">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className={cls} end={l.to === '/assistant'}>
            <span className="ic">{l.icon}</span>
            <span className="tx">{l.label}</span>
          </NavLink>
        ))}
        {user && (
          <NavLink to="/account" className={cls}>
            <span className="ic"><svg viewBox="0 0 24 24" {...S}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg></span>
            <span className="tx">My account</span>
          </NavLink>
        )}
      </nav>

      <div className="asd-side-foot">
        {user ? (
          <>
            <Link to="/account" className="asd-side-user" title="Your account">
              <span className="av">{user.name.charAt(0).toUpperCase()}</span>
              <span className="nm">{user.name}</span>
            </Link>
            <button type="button" className="asd-side-btn" onClick={() => { logout(); navigate('/'); }}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="asd-side-btn ghost">Log in</Link>
            <Link to="/register" className="asd-side-btn">Sign up</Link>
          </>
        )}
      </div>
    </aside>
  );
}
