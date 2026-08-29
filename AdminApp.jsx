import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Loader2, AlertCircle, CheckCircle2, Plus, Pencil, Trash2, X } from 'lucide-react';
import SharedStyles from './SharedStyles.jsx';
import { BAHT_SCHEME } from './klongRules.js';

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

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5" />
    <span style={{ color: 'var(--c-charcoal)' }}>{label}</span>
  </label>
);

const AiSettingsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/ai-settings')
      .then((res) => res.json())
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => { setError('โหลดการตั้งค่าไม่สำเร็จ'); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setSettings(data);
      setMessage('บันทึกแล้ว');
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-sage)' }} />;
  }
  if (!settings) {
    return <p style={{ color: 'var(--c-brick)' }}>{error || 'โหลดการตั้งค่าไม่สำเร็จ'}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold" style={{ color: 'var(--c-charcoal)' }}>ผู้ช่วย AI</h2>

      <Toggle
        label="เปิดใช้งานผู้ช่วย AI (ปุ่ม “สร้างโคลง”)"
        checked={settings.ai_enabled}
        onChange={(v) => setSettings({ ...settings, ai_enabled: v })}
      />
      <Toggle
        label="เปิดใช้งานปุ่ม “นำไปแก้ไขใน KlongEditor” (autofill)"
        checked={settings.ai_autofill_enabled}
        onChange={(v) => setSettings({ ...settings, ai_autofill_enabled: v })}
      />

      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--c-charcoal)' }}>
          Prompt override (ใส่ {'{topic}'} แทนหัวข้อ — เว้นว่างไว้เพื่อใช้ค่าเริ่มต้น)
        </label>
        <textarea
          className="input-pixel w-full px-3 py-2 h-28 resize-none font-mono text-sm"
          value={settings.prompt_template ?? ''}
          onChange={(e) => setSettings({ ...settings, prompt_template: e.target.value })}
          placeholder='เช่น: เขียนโคลงสี่สุภาพแนวขำขันเกี่ยวกับ "{topic}"'
        />
        <p className="text-xs mt-1" style={{ color: 'var(--c-sage-dark)' }}>
          กฎฉันทลักษณ์ (จำนวนคำ, เอก-โท, สัมผัส) มาจาก klongRules.js เสมอ ไม่ว่า prompt นี้จะเขียนว่าอย่างไร
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-sage-dark)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {message}
        </div>
      )}

      <button onClick={handleSave} className="btn-pixel btn-primary px-4 py-2" disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
      </button>
    </div>
  );
};

const ValidatorSettingsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Same endpoint the public app reads (GET is unauthenticated there
    // too) — PUT is the only branch that needs the admin session.
    fetch('/api/validator-settings')
      .then((res) => res.json())
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => { setError('โหลดการตั้งค่าไม่สำเร็จ'); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/validator-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setSettings(data);
      setMessage('บันทึกแล้ว');
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-sage)' }} />;
  }
  if (!settings) {
    return <p style={{ color: 'var(--c-brick)' }}>{error || 'โหลดการตั้งค่าไม่สำเร็จ'}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold" style={{ color: 'var(--c-charcoal)' }}>ตัวตรวจฉันทลักษณ์</h2>

      <Toggle
        label="อนุญาตเอกโทษ/โทโทษ (สลับไม้เอก-ไม้โทได้ในตำแหน่งบังคับ)"
        checked={settings.allow_tone_penalty}
        onChange={(v) => setSettings({ ...settings, allow_tone_penalty: v })}
      />
      <p className="text-xs" style={{ color: 'var(--c-sage-dark)' }}>
        เมื่อเปิด ตำแหน่งที่บังคับเอกจะยอมรับไม้โทได้ด้วย (เอกโทษ) และตำแหน่งที่บังคับโทจะยอมรับไม้เอกได้ด้วย (โทโทษ) — ใช้ได้ทั้งในตัวแก้ไข ด่านท้าทาย และผู้ช่วย AI
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-sage-dark)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {message}
        </div>
      )}

      <button onClick={handleSave} className="btn-pixel btn-primary px-4 py-2" disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
      </button>
    </div>
  );
};

// --- Challenges CRUD ---
// segments (what App.jsx's Challenge component consumes) is an array like
// [{ bahtIndex: 0, count: 5 }] — the form below edits it as "which บาท are
// included, how many words each" per BAHT_SCHEME, converted to/from that
// array shape rather than editing raw JSON.

const emptyChallengeForm = () => ({
  title: '', description: '', badge: '', sort_order: 0,
  segmentsByBaht: BAHT_SCHEME.map(() => ({ included: false, count: 1 })),
});

const segmentsToForm = (segments) =>
  BAHT_SCHEME.map((_, bahtIndex) => {
    const seg = segments.find((s) => s.bahtIndex === bahtIndex);
    return seg ? { included: true, count: seg.count } : { included: false, count: 1 };
  });

const formToSegments = (segmentsByBaht) =>
  segmentsByBaht
    .map((s, bahtIndex) => (s.included ? { bahtIndex, count: s.count } : null))
    .filter(Boolean);

const ChallengeForm = ({ initialForm, onCancel, onSave, saving, error }) => {
  const [form, setForm] = useState(initialForm);

  const updateSegment = (bahtIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      segmentsByBaht: prev.segmentsByBaht.map((s, i) => (i === bahtIndex ? { ...s, ...patch } : s)),
    }));
  };

  return (
    <div className="card-pixel p-4 space-y-3" style={{ backgroundColor: 'var(--c-cream)' }}>
      <input
        className="input-pixel w-full px-3 py-2"
        placeholder="ชื่อด่าน (เช่น ด่านที่ ๑ · แต่งวรรคเดียว)"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />
      <input
        className="input-pixel w-full px-3 py-2"
        placeholder="คำอธิบาย"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="flex gap-3">
        <input
          className="input-pixel flex-1 px-3 py-2"
          placeholder="ตรา (เช่น 🌱 นักฝึกวรรคแรก)"
          value={form.badge}
          onChange={(e) => setForm({ ...form, badge: e.target.value })}
        />
        <input
          className="input-pixel w-24 px-3 py-2"
          type="number"
          placeholder="ลำดับ"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
        />
      </div>

      <p className="text-sm font-bold" style={{ color: 'var(--c-charcoal)' }}>บาทที่ต้องแต่งในด่านนี้</p>
      <div className="space-y-2">
        {BAHT_SCHEME.map((baht, bahtIndex) => {
          const seg = form.segmentsByBaht[bahtIndex];
          return (
            <label key={bahtIndex} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={seg.included}
                onChange={(e) => updateSegment(bahtIndex, { included: e.target.checked })}
                className="w-5 h-5"
              />
              <span style={{ color: 'var(--c-charcoal)' }}>{baht.label} (สูงสุด {baht.wordCount} คำ)</span>
              {seg.included && (
                <input
                  type="number"
                  min={1}
                  max={baht.wordCount}
                  value={seg.count}
                  onChange={(e) => updateSegment(bahtIndex, { count: Math.min(Number(e.target.value) || 1, baht.wordCount) })}
                  className="input-pixel w-20 px-2 py-1 ml-auto"
                />
              )}
            </label>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)} className="btn-pixel btn-primary px-4 py-2 text-sm" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
        </button>
        <button onClick={onCancel} className="btn-pixel btn-secondary px-4 py-2 text-sm" disabled={saving}>
          <X className="w-4 h-4" /> ยกเลิก
        </button>
      </div>
    </div>
  );
};

const ChallengesPanel = () => {
  const [challenges, setChallenges] = useState(null);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null); // null | 'new' | a challenge id
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch('/api/challenges')
      .then((res) => res.json())
      .then(setChallenges)
      .catch(() => setError('โหลดด่านท้าทายไม่สำเร็จ'));
  };

  useEffect(load, []);

  const handleSave = async (form) => {
    setSaving(true);
    setError('');
    const segments = formToSegments(form.segmentsByBaht);
    if (!form.title.trim() || segments.length === 0) {
      setError('ต้องมีชื่อด่านและเลือกอย่างน้อย 1 บาท');
      setSaving(false);
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      badge: form.badge.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      segments,
    };
    try {
      const res = await fetch('/api/challenges', {
        method: editingId === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId === 'new' ? payload : { id: editingId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ลบด่านนี้ถาวร? ผู้เล่นที่ปลดล็อกด่านนี้ไว้จะไม่เห็นด่านนี้อีก')) return;
    setError('');
    try {
      const res = await fetch('/api/challenges', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      load();
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold" style={{ color: 'var(--c-charcoal)' }}>ด่านท้าทาย</h2>
        {editingId === null && (
          <button onClick={() => setEditingId('new')} className="btn-pixel btn-primary px-3 py-1.5 text-sm">
            <Plus className="w-4 h-4" /> เพิ่มด่าน
          </button>
        )}
      </div>

      {error && editingId === null && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {editingId === 'new' && (
        <ChallengeForm
          initialForm={emptyChallengeForm()}
          onCancel={() => setEditingId(null)}
          onSave={handleSave}
          saving={saving}
          error={error}
        />
      )}

      {challenges === null ? (
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-sage)' }} />
      ) : (
        <div className="space-y-2">
          {challenges.map((c) => (
            editingId === c.id ? (
              <ChallengeForm
                key={c.id}
                initialForm={{
                  title: c.title, description: c.description || '', badge: c.badge || '',
                  sort_order: c.sort_order, segmentsByBaht: segmentsToForm(c.segments),
                }}
                onCancel={() => setEditingId(null)}
                onSave={handleSave}
                saving={saving}
                error={error}
              />
            ) : (
              <div key={c.id} className="card-pixel p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold" style={{ color: 'var(--c-charcoal)' }}>{c.title}</p>
                  <p className="text-xs" style={{ color: 'var(--c-sage-dark)' }}>
                    {c.segments.length} บาท · ลำดับ {c.sort_order} {c.badge && `· ${c.badge}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditingId(c.id)} className="btn-pixel btn-secondary px-3 py-1.5 text-sm">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="btn-pixel btn-danger px-3 py-1.5 text-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          ))}
          {challenges.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--c-sage-dark)' }}>ยังไม่มีด่านท้าทาย</p>
          )}
        </div>
      )}
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
      <main className="m-4 card-pixel p-8 space-y-8" style={{ color: 'var(--c-charcoal)' }}>
        <AiSettingsPanel />
        <div style={{ borderTop: '2px solid var(--c-charcoal)', paddingTop: '2rem' }}>
          <ValidatorSettingsPanel />
        </div>
        <div style={{ borderTop: '2px solid var(--c-charcoal)', paddingTop: '2rem' }}>
          <ChallengesPanel />
        </div>
        <p className="text-xs pt-4" style={{ color: 'var(--c-sage-dark)', borderTop: '2px solid var(--c-charcoal)' }}>
          คลังโจทย์, เอกสาร Algorithm — จะมาในขั้นถัดไป
        </p>
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
