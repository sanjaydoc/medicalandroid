import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../brand';

// Admin is intentionally NOT listed — the /admin route still works when
// navigated to directly, but it's hidden from the public nav.
const links = [
  { to: '/assistant', label: 'Assistant' },
  { to: '/workflows', label: 'Workflows' },
  { to: '/research', label: 'Research' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-semibold rounded-full transition ${
      isActive ? 'text-clay-600 bg-clay-50' : 'text-ink-800 hover:text-clay-600'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream-100/95">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Logo />
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900 sm:text-xl">
            {BRAND.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                title="Your account & health dashboard"
                aria-label="Account"
                className="grid h-9 w-9 place-items-center rounded-full bg-clay-100 font-bold text-clay-700 ring-clay-300 transition hover:ring-2"
              >
                {user.name.charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="btn-outline px-4 py-2 text-sm"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary px-5 py-2.5 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-lg md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-cream-300 bg-cream-100 md:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={navClass}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {user && (
              <NavLink to="/account" className={navClass} onClick={() => setOpen(false)}>
                Account
              </NavLink>
            )}
            <div className="mt-2 flex gap-2">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                    navigate('/');
                  }}
                  className="btn-outline flex-1 py-2 text-sm"
                >
                  Log out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-outline flex-1 py-2 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary flex-1 py-2 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8">
      {/* MedDroid: medical cross + ECG pulse */}
      <rect width="64" height="64" rx="14" fill="#4285F4" />
      <rect x="27.5" y="13" width="9" height="30" rx="4.5" fill="#EA4335" />
      <rect x="17" y="23.5" width="30" height="9" rx="4.5" fill="#EA4335" />
      <path
        d="M10 46 h11 l4 -9 5 16 4 -10 h20"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
