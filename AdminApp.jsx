import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Loader2, AlertCircle } from 'lucide-react';
import SharedStyles from './SharedStyles.jsx';

/**
 * Login-gated admin shell. Step 3 scaffold only — the actual admin screens
 * (AI toggle, challenges CRUD, prompt library CRUD, ...) mount inside
 * <AdminDashboard> in later steps. Session state is checked once on load
 * via GET /api/admin/session (the iron-session cookie, not client storage —
 * see auth.js), then kept in sync locally after login/logout.
 */

async function fetchSession() {
  const res = await fetch('/api/admin/session');
  return res.json();
}

const LoginForm = ({ onLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }
      onLoggedIn(data.username);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-body" style={{ backgroundColor: 'var(--c-cream)' }}>
      <form onSubmit={handleSubmit} className="card-pixel p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-6 h-6" style={{ color: 'var(--c-charcoal)' }} />
          <h1 className="font-heading text-xl font-bold" style={{ color: 'var(--c-charcoal)' }}>เข้าสู่ระบบแอดมิน</h1>
        </div>

        <label className="block text-sm mb-1" style={{ color: 'var(--c-charcoal)' }}>ชื่อผู้ใช้</label>
        <input
          className="input-pixel w-full px-3 py-2 mb-4"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label className="block text-sm mb-1" style={{ color: 'var(--c-charcoal)' }}>รหัสผ่าน</label>
        <input
          className="input-pixel w-full px-3 py-2 mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--c-brick)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="btn-pixel btn-primary w-full py-2" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
};

const AdminDashboard = ({ username, onLoggedOut }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setLoggingOut(false);
      onLoggedOut();
    }
  };

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: 'var(--c-cream)' }}>
      <header className="card-pixel m-4 p-4 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold" style={{ color: 'var(--c-charcoal)' }}>Kawi AI — แผงควบคุมแอดมิน</h1>
        <div className="flex items-center gap-4">
          <span style={{ color: 'var(--c-charcoal)' }}>{username}</span>
          <button onClick={handleLogout} className="btn-pixel btn-secondary px-3 py-1.5 text-sm" disabled={loggingOut}>
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </header>
      <main className="m-4 card-pixel p-8" style={{ color: 'var(--c-charcoal)' }}>
        <p>แดชบอร์ดแอดมิน — อยู่ระหว่างพัฒนา (AI toggle, ด่านท้าทาย, คลังโจทย์ ฯลฯ จะมาในขั้นถัดไป)</p>
      </main>
    </div>
  );
};

const AdminApp = () => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'anonymous' | 'authenticated'
  const [username, setUsername] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession()
      .then((data) => {
        if (cancelled) return;
        if (data.authenticated) {
          setUsername(data.username);
          setStatus('authenticated');
        } else {
          setStatus('anonymous');
        }
      })
      .catch(() => { if (!cancelled) setStatus('anonymous'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <SharedStyles />
      {status === 'loading' && (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--c-cream)' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--c-sage)' }} />
        </div>
      )}
      {status === 'authenticated' && (
        <AdminDashboard username={username} onLoggedOut={() => { setUsername(null); setStatus('anonymous'); }} />
      )}
      {status === 'anonymous' && (
        <LoginForm onLoggedIn={(name) => { setUsername(name); setStatus('authenticated'); }} />
      )}
    </>
  );
};

export default AdminApp;
