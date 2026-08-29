import { describe, it, expect, vi } from 'vitest';
import { sealData } from 'iron-session';
import { fakeReqWithCookie, fakeRes } from './httpTestUtils.js';

vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { hashPassword, verifyPassword, requireAdmin, getSessionOptions, ADMIN_SESSION_COOKIE } = await import('./auth.js');

describe('hashPassword / verifyPassword', () => {
  it('verifies a password against its own hash', async () => {
    const hash = await hashPassword('1234');
    expect(await verifyPassword('1234', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('1234');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('never stores the plaintext password in the hash', async () => {
    const hash = await hashPassword('1234');
    expect(hash).not.toContain('1234');
  });

  it('salts each hash differently, even for the same password', async () => {
    const a = await hashPassword('1234');
    const b = await hashPassword('1234');
    expect(a).not.toBe(b);
  });
});

describe('requireAdmin', () => {
  it('401s and returns null when there is no session cookie', async () => {
    const res = fakeRes();
    const session = await requireAdmin(fakeReqWithCookie('GET'), res);
    expect(session).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it('returns the session and leaves the response untouched when authenticated', async () => {
    const sealed = await sealData(
      { adminId: 1, username: 'admin' },
      { password: getSessionOptions().password },
    );
    const res = fakeRes();
    const session = await requireAdmin(fakeReqWithCookie('GET', `${ADMIN_SESSION_COOKIE}=${sealed}`), res);
    expect(session).not.toBeNull();
    expect(session.adminId).toBe(1);
    expect(res.statusCode).toBe(200); // untouched — caller writes the real response
  });
});
