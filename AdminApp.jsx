import React, { useState, useEffect } from 'react';
import { Lock, LogOut, Loader2, AlertCircle, CheckCircle2, Plus, Pencil, Trash2, X, CheckCircle } from 'lucide-react';
import SharedStyles from './SharedStyles.jsx';
import { BAHT_SCHEME } from './klongRules.js';
import { IRREGULAR_SYLLABLES } from './irregularSyllables.js';
import { DEFAULT_PROMPT_TEMPLATE } from './promptTemplate.js';

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
      .then((data) => {
        // Materialize the real default into the editable field immediately —
        // an admin should see and edit the prompt actually in use, not an
        // empty box with just a placeholder example. Saving unedited still
        // works exactly like before: {scheme}/{rhyme} stay unresolved
        // placeholders in the stored text, substituted live at generation
        // time, so this can never go stale even if BAHT_SCHEME changes later.
        setSettings({ ...data, prompt_template: data.prompt_template || DEFAULT_PROMPT_TEMPLATE });
        setLoading(false);
      })
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
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm" style={{ color: 'var(--c-charcoal)' }}>
            Prompt ที่จะส่งไปสร้างโคลง — นี่คือ prompt จริงที่ระบบใช้อยู่ตอนนี้ แก้ได้โดยตรง
          </label>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, prompt_template: DEFAULT_PROMPT_TEMPLATE })}
            className="btn-pixel btn-secondary px-2 py-1 text-xs flex-shrink-0"
          >
            คืนค่าเริ่มต้น
          </button>
        </div>
        <textarea
          className="input-pixel w-full px-3 py-2 h-64 resize-y font-mono text-sm"
          value={settings.prompt_template ?? ''}
          onChange={(e) => setSettings({ ...settings, prompt_template: e.target.value })}
        />
        <p className="text-xs mt-1 space-y-0.5" style={{ color: 'var(--c-sage-dark)' }}>
          <span className="block">นี่คือ prompt เต็มที่ส่งให้ AI จริงๆ แก้ถ้อยคำ/ลำดับ/เนื้อหาได้อิสระ — <strong>ต้องมี {'{topic}'}</strong> ไม่งั้นระบบจะใช้ค่าเริ่มต้นแทนทั้งหมด (AI จะไม่รู้หัวข้อที่ผู้ใช้พิมพ์)</span>
          <span className="block">ใส่ {'{scheme}'} / {'{rhyme}'} เพื่อแทรกกฎโครงสร้าง/สัมผัสที่ดึงสดจาก klongRules.js — ถ้าไม่ใส่ AI จะไม่เห็นกฎเหล่านี้เลย (คะแนนตรวจฉันทลักษณ์อาจต่ำลง แต่ระบบยังตรวจจริงเหมือนเดิมเสมอ ไม่ว่า prompt จะเขียนว่าอย่างไร)</span>
          <span className="block">คำสั่งให้ตอบเป็น JSON ท้าย prompt ถูกเติมให้อัตโนมัติเสมอ แก้ไม่ได้ เพราะระบบต้อง parse คำตอบเป็น JSON ไม่งั้นจะสร้างโคลงไม่สำเร็จเลย</span>
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

// --- Prompt library CRUD ---
// /api/prompts.js's GET already returns categories nested with their
// prompts — reused here as the admin listing too (no separate admin GET,
// same non-sensitive-data reasoning as ChallengesPanel/ValidatorSettings).

const CategoryPrompts = ({ category, onChanged }) => {
  const [newPromptText, setNewPromptText] = useState('');
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [editingPromptText, setEditingPromptText] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [categoryName, setCategoryName] = useState(category.name);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const addPrompt = async () => {
    const text = newPromptText.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: category.id, text }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'เพิ่มโจทย์ไม่สำเร็จ');
      setNewPromptText('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEditedPrompt = async (id) => {
    const text = editingPromptText.trim();
    if (!text) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'แก้ไขไม่สำเร็จ');
      setEditingPromptId(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deletePrompt = async (id) => {
    if (!confirm('ลบโจทย์นี้ถาวร?')) return;
    setError('');
    try {
      const res = await fetch('/api/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveRename = async () => {
    const name = categoryName.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/prompt-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id, name, sort_order: category.sort_order }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'เปลี่ยนชื่อไม่สำเร็จ');
      setRenaming(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async () => {
    if (!confirm(`ลบหมวด "${category.name}" ถาวร? โจทย์ทั้งหมด ${category.prompts.length} ข้อในหมวดนี้จะถูกลบไปด้วย`)) return;
    setError('');
    try {
      const res = await fetch('/api/prompt-categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: category.id }),
      });
      if (!res.ok) throw new Error('ลบไม่สำเร็จ');
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card-pixel p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="input-pixel flex-1 px-2 py-1 text-sm"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              autoFocus
            />
            <button onClick={saveRename} className="btn-pixel btn-primary px-2 py-1 text-xs" disabled={busy}>บันทึก</button>
            <button onClick={() => { setRenaming(false); setCategoryName(category.name); }} className="btn-pixel btn-secondary px-2 py-1 text-xs">ยกเลิก</button>
          </div>
        ) : (
          <h3 className="font-heading font-bold" style={{ color: 'var(--c-charcoal)' }}>{category.name}</h3>
        )}
        {!renaming && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setRenaming(true)} className="btn-pixel btn-secondary px-2 py-1 text-xs"><Pencil className="w-3 h-3" /></button>
            <button onClick={deleteCategory} className="btn-pixel btn-danger px-2 py-1 text-xs"><Trash2 className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      <ul className="space-y-1">
        {category.prompts.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            {editingPromptId === p.id ? (
              <>
                <input
                  className="input-pixel flex-1 px-2 py-1 text-sm"
                  value={editingPromptText}
                  onChange={(e) => setEditingPromptText(e.target.value)}
                  autoFocus
                />
                <button onClick={() => saveEditedPrompt(p.id)} className="btn-pixel btn-primary px-2 py-1 text-xs" disabled={busy}>บันทึก</button>
                <button onClick={() => setEditingPromptId(null)} className="btn-pixel btn-secondary px-2 py-1 text-xs">ยกเลิก</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm" style={{ color: 'var(--c-charcoal)' }}>{p.text}</span>
                <button onClick={() => { setEditingPromptId(p.id); setEditingPromptText(p.text); }} className="btn-pixel btn-secondary px-2 py-1 text-xs"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => deletePrompt(p.id)} className="btn-pixel btn-danger px-2 py-1 text-xs"><Trash2 className="w-3 h-3" /></button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          className="input-pixel flex-1 px-2 py-1 text-sm"
          placeholder="เพิ่มโจทย์ใหม่ในหมวดนี้"
          value={newPromptText}
          onChange={(e) => setNewPromptText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPrompt()}
        />
        <button onClick={addPrompt} className="btn-pixel btn-primary px-3 py-1 text-xs" disabled={busy}>
          <Plus className="w-3 h-3" /> เพิ่ม
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
};

const PromptsPanel = () => {
  const [themes, setThemes] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const load = () => {
    fetch('/api/prompts')
      .then((res) => res.json())
      .then(setThemes)
      .catch(() => setError('โหลดคลังโจทย์ไม่สำเร็จ'));
  };

  useEffect(load, []);

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    setError('');
    try {
      const res = await fetch('/api/prompt-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sort_order: themes?.length ?? 0 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'เพิ่มหมวดไม่สำเร็จ');
      setNewCategoryName('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-bold" style={{ color: 'var(--c-charcoal)' }}>คลังโจทย์</h2>

      {themes === null ? (
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-sage)' }} />
      ) : (
        <div className="space-y-3">
          {themes.map((category) => (
            <CategoryPrompts key={category.id} category={category} onChanged={load} />
          ))}
          {themes.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--c-sage-dark)' }}>ยังไม่มีหมวดโจทย์</p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <input
          className="input-pixel flex-1 px-3 py-2 text-sm"
          placeholder="ชื่อหมวดใหม่"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
        />
        <button onClick={addCategory} className="btn-pixel btn-primary px-3 py-2 text-sm" disabled={addingCategory}>
          <Plus className="w-4 h-4" /> เพิ่มหมวด
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
};

// --- Algorithm docs + comments ---
// Prose summary of thaiSyllable.js/klongRules.js/klongValidator.js for an
// admin audience (full detail lives in CLAUDE.md, for developers). The
// irregular-syllable table below is NOT hardcoded — it imports
// IRREGULAR_SYLLABLES from irregularSyllables.js directly, so it can never
// drift out of sync with the actual dictionary the way a written-out list
// would. Important scope note, also stated in the UI: irregularSyllables.js
// is source code imported by thaiSyllable.js, not a database table —
// nothing on this page can edit it live. The comment box below lets an
// admin flag a word the scanner still gets wrong; a developer (or Claude)
// still applies the fix as an actual code change with tests, same as every
// entry already in the dictionary was added.

const CommentForm = ({ onAdded }) => {
  const [body, setBody] = useState('');
  const [linked, setLinked] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/algorithm-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, linked_irregular_syllable: linked.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'บันทึกไม่สำเร็จ');
      setBody('');
      setLinked('');
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-pixel p-4 space-y-2" style={{ backgroundColor: 'var(--c-cream)' }}>
      <textarea
        className="input-pixel w-full px-3 py-2 h-20 resize-none text-sm"
        placeholder="รายงานคำที่ scanner ยังตรวจผิด หรือข้อเสนอแนะเกี่ยวกับ algorithm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        className="input-pixel w-full px-3 py-2 text-sm"
        placeholder="คำที่เกี่ยวข้อง (ถ้ามี) — เช่น ฤกษ์"
        value={linked}
        onChange={(e) => setLinked(e.target.value)}
      />
      {error && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" /> {error}
        </div>
      )}
      <button onClick={submit} className="btn-pixel btn-primary px-3 py-1.5 text-sm" disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ส่งความเห็น'}
      </button>
    </div>
  );
};

const CommentRow = ({ comment, onChanged }) => {
  const [busy, setBusy] = useState(false);

  const toggleStatus = async () => {
    setBusy(true);
    try {
      await fetch('/api/admin/algorithm-comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: comment.id, status: comment.status === 'open' ? 'resolved' : 'open' }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('ลบความเห็นนี้ถาวร?')) return;
    await fetch('/api/admin/algorithm-comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: comment.id }),
    });
    onChanged();
  };

  return (
    <div className="card-pixel p-3 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm flex-1" style={{ color: 'var(--c-charcoal)' }}>{comment.body}</p>
        <span
          className="badge-pixel px-2 py-0.5 text-xs flex-shrink-0"
          style={{ backgroundColor: comment.status === 'resolved' ? 'var(--c-sage-light)' : 'var(--c-gold)' }}
        >
          {comment.status === 'resolved' ? 'แก้แล้ว' : 'ยังเปิดอยู่'}
        </span>
      </div>
      {comment.linked_irregular_syllable && (
        <p className="text-xs" style={{ color: 'var(--c-sage-dark)' }}>
          คำที่เกี่ยวข้อง: <code>{comment.linked_irregular_syllable}</code>
        </p>
      )}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--c-sage-dark)' }}>
        <span>{comment.admin_username} · {new Date(comment.created_at).toLocaleString('th-TH')}</span>
        <div className="flex gap-2">
          <button onClick={toggleStatus} className="btn-pixel btn-secondary px-2 py-1 text-xs" disabled={busy}>
            <CheckCircle className="w-3 h-3" /> {comment.status === 'open' ? 'ทำเครื่องหมายว่าแก้แล้ว' : 'เปิดใหม่'}
          </button>
          <button onClick={remove} className="btn-pixel btn-danger px-2 py-1 text-xs"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
};

const AlgorithmDocsPanel = () => {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/admin/algorithm-comments')
      .then((res) => res.json())
      .then(setComments)
      .catch(() => setError('โหลดความเห็นไม่สำเร็จ'));
  };

  useEffect(load, []);

  const irregularEntries = Object.entries(IRREGULAR_SYLLABLES);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--c-charcoal)' }}>เอกสาร Algorithm</h2>
        <div className="text-sm space-y-2" style={{ color: 'var(--c-charcoal)' }}>
          <p><strong>ตัวตรวจฉันทลักษณ์ (klongValidator.js)</strong> ตรวจ 3 อย่าง: โครงสร้าง (จำนวนคำต่อบาท, klongRules.js), เอก/โท (ตำแหน่งบังคับ), และสัมผัสสระระหว่างบาท — เป็นกฎตายตัว (deterministic) AI ไม่มีสิทธิ์ override</p>
          <p><strong>ตัวตัดพยางค์ (thaiSyllable.js)</strong> เป็น scanner เขียนมือ ไม่ใช่ regex เดียว เพราะภาษาไทยกำกวมเกินกว่า regex ทั่วไปจะตัดถูกทุกกรณี</p>
          <p><strong>เอกโทษ/โทโทษ</strong> เปิด/ปิดได้ที่แท็บ "ตั้งค่า" — อนุญาตสลับไม้เอก/ไม้โทในตำแหน่งบังคับ ตรวจแค่ระดับตัวอักษร ไม่ได้ตรวจว่า "ไม่มีคำที่สะกดถูกจริง" ตามกฎดั้งเดิม (ต้องใช้ความรู้เชิงศัพท์ที่เช็คจากตัวอักษรอย่างเดียวไม่ได้)</p>
        </div>
      </div>

      <div>
        <h3 className="font-heading font-bold mb-1" style={{ color: 'var(--c-charcoal)' }}>Dictionary คำยกเว้น (irregularSyllables.js)</h3>
        <p className="text-xs mb-2" style={{ color: 'var(--c-sage-dark)' }}>
          ตารางนี้ดึงจากไฟล์จริงสด — ไม่ใช่ข้อความ hardcode จะไม่มีวันไม่ตรงกับ dictionary จริง แต่ <strong>แก้ไม่ได้จากหน้านี้</strong> เพราะเป็นซอร์สโค้ด ไม่ใช่ตาราง DB ใช้ฟอร์มด้านล่างเพื่อรายงานคำที่ยังพัง แล้วให้ผู้พัฒนาต่อ dictionary เป็นโค้ดจริงทีหลัง (ตามกระบวนการ TDD เดียวกับที่ใช้เพิ่มคำในตารางนี้ทุกคำ)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--c-charcoal)' }}>
            <thead>
              <tr className="text-left border-b-2" style={{ borderColor: 'var(--c-charcoal)' }}>
                <th className="py-1 pr-4">คำ</th>
                <th className="py-1">ลักษณะ</th>
              </tr>
            </thead>
            <tbody>
              {irregularEntries.map(([word, override]) => (
                <tr key={word} className="border-b" style={{ borderColor: 'var(--c-sage-light)' }}>
                  <td className="py-1 pr-4"><code>{word}</code></td>
                  <td className="py-1 text-xs" style={{ color: 'var(--c-sage-dark)' }}>
                    {override
                      ? `vowelSkeleton: ${JSON.stringify(override.vowelSkeleton)}, final: ${override.finalConsonant ?? '-'} (${override.finalClass})`
                      : 'แค่แก้ split เท่านั้น (analyzeSyllable ใช้ path ปกติ)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-heading font-bold mb-2" style={{ color: 'var(--c-charcoal)' }}>ความเห็น / รายงานบั๊ก</h3>
        <CommentForm onAdded={load} />
        {error && <p className="text-sm mt-2" style={{ color: 'var(--c-brick)' }}>{error}</p>}
        <div className="space-y-2 mt-3">
          {comments === null ? (
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-sage)' }} />
          ) : comments.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--c-sage-dark)' }}>ยังไม่มีความเห็น</p>
          ) : (
            comments.map((c) => <CommentRow key={c.id} comment={c} onChanged={load} />)
          )}
        </div>
      </div>
    </div>
  );
};

// --- Admin account CRUD ---

const AccountForm = ({ initial, onCancel, onSave, saving, error }) => {
  const [username, setUsername] = useState(initial.username);
  const [password, setPassword] = useState('');

  return (
    <div className="card-pixel p-4 space-y-3" style={{ backgroundColor: 'var(--c-cream)' }}>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--c-charcoal)' }}>ชื่อผู้ใช้</label>
        <input className="input-pixel w-full px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--c-charcoal)' }}>
          รหัสผ่าน{initial.id && ' (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)'}
        </label>
        <input className="input-pixel w-full px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => onSave({ username: username.trim(), password })}
          className="btn-pixel btn-primary px-4 py-2 text-sm"
          disabled={saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
        </button>
        <button onClick={onCancel} className="btn-pixel btn-secondary px-4 py-2 text-sm" disabled={saving}>
          <X className="w-4 h-4" /> ยกเลิก
        </button>
      </div>
    </div>
  );
};

const AccountsPanel = ({ currentUsername }) => {
  const [accounts, setAccounts] = useState(null);
  const [editingId, setEditingId] = useState(null); // null | 'new' | an account id
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/admin/accounts')
      .then((res) => res.json())
      .then(setAccounts)
      .catch(() => setError('โหลดรายชื่อแอดมินไม่สำเร็จ'));
  };

  useEffect(load, []);

  const handleSave = async ({ username, password }) => {
    if (!username) {
      setError('ต้องระบุชื่อผู้ใช้');
      return;
    }
    if (editingId === 'new' && !password) {
      setError('ต้องระบุรหัสผ่านสำหรับบัญชีใหม่');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: editingId === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId === 'new' ? { username, password } : { id: editingId, username, password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, accountUsername) => {
    if (!confirm(`ลบบัญชี "${accountUsername}" ถาวร?`)) return;
    setError('');
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบไม่สำเร็จ');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold" style={{ color: 'var(--c-charcoal)' }}>บัญชีแอดมิน</h2>
        {editingId === null && (
          <button onClick={() => setEditingId('new')} className="btn-pixel btn-primary px-3 py-1.5 text-sm">
            <Plus className="w-4 h-4" /> เพิ่มบัญชี
          </button>
        )}
      </div>

      {error && editingId === null && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-brick)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {editingId === 'new' && (
        <AccountForm initial={{ username: '' }} onCancel={() => setEditingId(null)} onSave={handleSave} saving={saving} error={error} />
      )}

      {accounts === null ? (
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-sage)' }} />
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            editingId === a.id ? (
              <AccountForm key={a.id} initial={a} onCancel={() => setEditingId(null)} onSave={handleSave} saving={saving} error={error} />
            ) : (
              <div key={a.id} className="card-pixel p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold" style={{ color: 'var(--c-charcoal)' }}>
                    {a.username} {a.username === currentUsername && <span className="text-xs font-normal">(บัญชีนี้)</span>}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--c-sage-dark)' }}>
                    สร้างเมื่อ {new Date(a.created_at).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditingId(a.id)} className="btn-pixel btn-secondary px-3 py-1.5 text-sm">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id, a.username)} className="btn-pixel btn-danger px-3 py-1.5 text-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

const ADMIN_TABS = [
  { id: 'settings', label: 'ตั้งค่า' },
  { id: 'challenges', label: 'ด่านท้าทาย' },
  { id: 'prompts', label: 'คลังโจทย์' },
  { id: 'docs', label: 'เอกสาร Algorithm' },
  { id: 'accounts', label: 'บัญชีแอดมิน' },
];

const AdminDashboard = ({ username, onLoggedOut }) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

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
      <header className="card-pixel m-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-xl font-bold" style={{ color: 'var(--c-charcoal)' }}>Kawi AI — แผงควบคุมแอดมิน</h1>
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--c-charcoal)' }}>{username}</span>
            <button onClick={handleLogout} className="btn-pixel btn-secondary px-3 py-1.5 text-sm" disabled={loggingOut}>
              <LogOut className="w-4 h-4" /> ออกจากระบบ
            </button>
          </div>
        </div>
        <div role="tablist" aria-label="ส่วนต่างๆ ของแผงควบคุม" className="flex gap-2 flex-wrap">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn-pixel px-3 py-1.5 text-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      <main className="m-4 card-pixel p-8" style={{ color: 'var(--c-charcoal)' }}>
        <div role="tabpanel" hidden={activeTab !== 'settings'} className="space-y-8">
          <AiSettingsPanel />
          <div style={{ borderTop: '2px solid var(--c-charcoal)', paddingTop: '2rem' }}>
            <ValidatorSettingsPanel />
          </div>
        </div>
        <div role="tabpanel" hidden={activeTab !== 'challenges'}>
          <ChallengesPanel />
        </div>
        <div role="tabpanel" hidden={activeTab !== 'prompts'}>
          <PromptsPanel />
        </div>
        <div role="tabpanel" hidden={activeTab !== 'docs'}>
          <AlgorithmDocsPanel />
        </div>
        <div role="tabpanel" hidden={activeTab !== 'accounts'}>
          <AccountsPanel currentUsername={username} />
        </div>
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
