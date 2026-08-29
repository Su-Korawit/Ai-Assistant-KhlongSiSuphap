import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../auth.js';
import { fakeReq, fakeRes } from '../httpTestUtils.js';

vi.mock('../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../db/client.js');
const { getValidatorSettings, updateValidatorSettings, default: handler } = await import('./validator-settings.js');

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

describe('getValidatorSettings / updateValidatorSettings', () => {
  beforeEach(() => { sql.mockReset(); });

  it('getValidatorSettings returns the current flag', async () => {
    sql.mockResolvedValue([{ allow_tone_penalty: true }]);
    expect(await getValidatorSettings()).toEqual({ allow_tone_penalty: true });
  });

  it('getValidatorSettings defaults to false if the singleton row is missing', async () => {
    sql.mockResolvedValue([]);
    expect(await getValidatorSettings()).toEqual({ allow_tone_penalty: false });
  });

  it('updateValidatorSettings writes and returns the new value', async () => {
    sql.mockResolvedValue([{ allow_tone_penalty: true }]);
    expect(await updateValidatorSettings({ allow_tone_penalty: true })).toEqual({ allow_tone_penalty: true });
  });
});

describe('validator-settings handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('GET is public — no auth required', async () => {
    sql.mockResolvedValue([{ allow_tone_penalty: false }]);
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ allow_tone_penalty: false });
  });

  it('PUT 401s without a session, never reaching the DB', async () => {
    const res = fakeRes();
    await handler(fakeReq('PUT', { allow_tone_penalty: true }), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('PUT 200s and coerces the body value to a real boolean before writing', async () => {
    sql.mockResolvedValue([{ allow_tone_penalty: true }]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { allow_tone_penalty: 'yes' }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ allow_tone_penalty: true });
    // sql`...${value}...` calls the mock as (strings, ...values) — assert
    // the coerced boolean actually reached the query, not the raw string.
    expect(sql.mock.calls[0][1]).toBe(true);
  });

  it('405s on DELETE', async () => {
    const res = fakeRes();
    await handler(fakeReq('DELETE'), res);
    expect(res.statusCode).toBe(405);
  });
});
