import { describe, it, expect, vi } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../../auth.js';
import { fakeReqWithCookie as fakeReq, fakeRes } from '../../httpTestUtils.js';

vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { default: handler } = await import('./session.js');

describe('session-check handler', () => {
  it('reports not authenticated when there is no session cookie', async () => {
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(JSON.parse(res.body)).toEqual({ authenticated: false, username: null });
  });

  it('reports authenticated with the username when a valid session cookie is sent', async () => {
    const sealed = await sealData(
      { adminId: 1, username: 'admin' },
      { password: getSessionOptions().password },
    );
    const res = fakeRes();
    await handler(fakeReq('GET', `${ADMIN_SESSION_COOKIE}=${sealed}`), res);
    expect(JSON.parse(res.body)).toEqual({ authenticated: true, username: 'admin' });
  });

  it('405s on POST', async () => {
    const res = fakeRes();
    await handler(fakeReq('POST'), res);
    expect(res.statusCode).toBe(405);
  });
});
