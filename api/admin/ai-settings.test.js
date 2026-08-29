import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../../auth.js';
import { fakeReq, fakeRes } from '../../httpTestUtils.js';

vi.mock('../../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../../db/client.js');
const { getAiSettings, updateAiSettings, default: handler } = await import('./ai-settings.js');

async function adminCookie() {
  const sealed = await sealData(
    { adminId: 1, username: 'admin' },
    { password: getSessionOptions().password },
  );
  return `${ADMIN_SESSION_COOKIE}=${sealed}`;
}

function fakeReqAs(cookie, method, body) {
  const req = fakeReq(method, body);
  req.headers.cookie = cookie;
  return req;
}

describe('getAiSettings / updateAiSettings', () => {
  beforeEach(() => { sql.mockReset(); });

  it('getAiSettings returns the full row, including prompt_template', async () => {
    sql.mockResolvedValue([{ ai_enabled: true, ai_autofill_enabled: true, prompt_template: 'custom' }]);
    expect(await getAiSettings()).toEqual({ ai_enabled: true, ai_autofill_enabled: true, prompt_template: 'custom' });
  });

  it('updateAiSettings writes the new values and returns the updated row', async () => {
    sql.mockResolvedValue([{ ai_enabled: false, ai_autofill_enabled: true, prompt_template: 'new template' }]);
    const result = await updateAiSettings({ ai_enabled: false, ai_autofill_enabled: true, prompt_template: 'new template' });
    expect(result).toEqual({ ai_enabled: false, ai_autofill_enabled: true, prompt_template: 'new template' });
  });
});

describe('admin ai-settings handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('401s with no session cookie', async () => {
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('200s on GET with a valid session', async () => {
    sql.mockResolvedValue([{ ai_enabled: true, ai_autofill_enabled: true, prompt_template: null }]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ai_enabled: true, ai_autofill_enabled: true, prompt_template: null });
  });

  it('PUT updates and coerces the flags to booleans, trims prompt_template, blank -> null', async () => {
    sql.mockResolvedValue([{ ai_enabled: false, ai_autofill_enabled: false, prompt_template: null }]);
    const res = fakeRes();
    await handler(
      fakeReqAs(await adminCookie(), 'PUT', { ai_enabled: false, ai_autofill_enabled: false, prompt_template: '   ' }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ai_enabled: false, ai_autofill_enabled: false, prompt_template: null });
  });

  it('PUT 401s without a session, never reaching the DB', async () => {
    const res = fakeRes();
    await handler(fakeReq('PUT', { ai_enabled: false }), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('405s on DELETE', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'DELETE'), res);
    expect(res.statusCode).toBe(405);
  });
});
