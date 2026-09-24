import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../api/supabase';
import { setVitalsUser, clearLocalVitals } from '../api/vitals';
import { setRecordsUser, clearLocalRecords } from '../api/records';

// Per-user, device-local data that must NEVER survive an account change on a
// shared device/browser (chat history + health caches).
const CHAT_HISTORY_KEY = 'stemcells_chat_history_v1';
function purgeDeviceUserData() {
  clearLocalVitals();
  clearLocalRecords();
  try { localStorage.removeItem(CHAT_HISTORY_KEY); } catch { /* ignore */ }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(session: any): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    name: meta.name || meta.full_name || (u.email ? u.email.split('@')[0] : 'Patient'),
    email: u.email || '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Tracks the signed-in identity so we can detect an account change on this
  // device. `undefined` = not initialised yet (first session resolution).
  const lastUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const apply = (session: any) => {
      const uid = session?.user?.id ?? null;
      const prev = lastUid.current;
      setUser(toUser(session));

      // A real identity change on this device (login, logout, or switching
      // accounts). Wipe the previous user's device-local data BEFORE anything
      // syncs, then hard-reload so no stale in-memory state (chat messages,
      // dashboards) from the previous user remains.
      if (prev !== undefined && prev !== uid) {
        purgeDeviceUserData();
        lastUid.current = uid;
        try { window.location.reload(); } catch { /* ignore */ }
        return;
      }

      lastUid.current = uid;
      setVitalsUser(uid);
      setRecordsUser(uid);
    };

    supabase.auth.getSession().then(({ data }) => {
      apply(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Sign-in is not available.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const register = async (name: string, email: string, password: string) => {
    if (!supabase) throw new Error('Sign-up is not available.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  };

  const loginWithGoogle = async () => {
    if (!supabase) throw new Error('Google sign-in is not available.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
    if (error) throw new Error(error.message);
  };

  const logout = () => {
    supabase?.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
