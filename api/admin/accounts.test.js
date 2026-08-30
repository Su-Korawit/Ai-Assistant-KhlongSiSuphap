import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../../auth.js';
import { fakeReq, fakeRes } from '../../httpTestUtils.js';

vi.mock('../../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../../db/client.js');
const {
  listAccounts, createAccount, updateAccount, deleteAccount, default: handler,
} = await import('./accounts.js');

async function adminCookie(adminId = 1) {
  const sealed = await sealData(
    { adminId, username: 'admin' },
    { password: getSessionOptions().password },
  );
  return `${ADMIN_SESSION_COOKIE}=${sealed}`;
}

function fakeReqAs(cookie, method, body) {
  const req = fakeReq(method, body);
  req.headers.cookie = cookie;
  return req;
}

const ACCOUNT = { id: 1, username: 'admin', created_at: '2026-01-01T00:00:00.000Z' };

describe('listAccounts / createAccount / updateAccount / deleteAccount', () => {
  beforeEach(() => { sql.mockReset(); });

  it('listAccounts never includes password_hash', async () => {
    sql.mockResolvedValue([ACCOUNT]);
    const rows = await listAccounts();
    expect(rows).toEqual([ACCOUNT]);
    expect(rows[0].password_hash).toBeUndefined();
  });

  it('createAccount hashes the password before storing it', async () => {
    sql.mockImplementation(async (strings, ...values) => {
      // the password value (2nd interpolation: username, password_hash) must not be the plaintext
      expect(values[1]).not.toBe('1234');
      expect(values[1].length).toBeGreaterThan(20); // a bcrypt hash, not a raw string
      return [ACCOUNT];
    });
    const result = await createAccount({ username: 'admin', password: '1234' });
    expect(result).toEqual(ACCOUNT);
  });

  it('updateAccount changes username without touching password when none is given', async () => {
    sql.mockResolvedValue([{ ...ACCOUNT, username: 'newname' }]);
    const result = await updateAccount({ id: 1, username: 'newname' });
    expect(result.username).toBe('newname');
  });

  it('deleteAccount refuses to remove the last remaining account', async () => {
    sql.mockResolvedValueOnce([{ count: 1 }]);
    const result = await deleteAccount(1);
    expect(result.ok).toBe(false);
  });

  it('deleteAccount succeeds when more than one account exists', async () => {
    sql.mockResolvedValueOnce([{ count: 2 }]).mockResolvedValueOnce([]);
    const result = await deleteAccount(1);
    expect(result.ok).toBe(true);
  });
});

describe('accounts handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('every method 401s without a session', async () => {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      const res = fakeRes();
      await handler(fakeReq(method, { username: 'x', password: 'x' }), res);
      expect(res.statusCode).toBe(401);
    }
    expect(sql).not.toHaveBeenCalled();
  });

  it('GET 200s with a session', async () => {
    sql.mockResolvedValue([ACCOUNT]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([ACCOUNT]);
  });

  it('POST 400s without username or password', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { username: 'onlyusername' }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 201s and creates with a valid session + body', async () => {
    sql.mockResolvedValue([ACCOUNT]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { username: 'admin2', password: 'secret123' }), res);
    expect(res.statusCode).toBe(201);
  });

  it('POST 409s on a duplicate username (unique constraint)', async () => {
    sql.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { username: 'admin', password: 'secret123' }), res);
    expect(res.statusCode).toBe(409);
  });

  it('PUT 404s when the id does not exist', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 999, username: 'x' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE 400s when it is the last account', async () => {
    sql.mockResolvedValueOnce([{ count: 1 }]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'DELETE', { id: 1 }), res);
    expect(res.statusCode).toBe(400);
  });

  it('DELETE 200s when another account still remains', async () => {
    sql.mockResolvedValueOnce([{ count: 2 }]).mockResolvedValueOnce([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'DELETE', { id: 1 }), res);
    expect(res.statusCode).toBe(200);
  });

  it('405s on PATCH', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PATCH'), res);
    expect(res.statusCode).toBe(405);
  });
});
