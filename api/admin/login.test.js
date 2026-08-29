import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword } from '../../auth.js';
import { fakeReq, fakeRes } from '../../httpTestUtils.js';

vi.mock('../../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32)); // iron-session requires >= 32 chars

const { sql } = await import('../../db/client.js');
const { authenticateAdmin, default: handler } = await import('./login.js');

describe('authenticateAdmin', () => {
  beforeEach(() => {
    sql.mockReset();
  });

  it('rejects an unknown username', async () => {
    sql.mockResolvedValue([]);
    const result = await authenticateAdmin('nobody', 'anything');
    expect(result.ok).toBe(false);
  });

  it('rejects a wrong password for a real account', async () => {
    const passwordHash = await hashPassword('1234');
    sql.mockResolvedValue([{ id: 1, username: 'admin', password_hash: passwordHash }]);
    const result = await authenticateAdmin('admin', 'wrong');
    expect(result.ok).toBe(false);
  });

  it('accepts the right username/password and returns the admin id', async () => {
    const passwordHash = await hashPassword('1234');
    sql.mockResolvedValue([{ id: 1, username: 'admin', password_hash: passwordHash }]);
    const result = await authenticateAdmin('admin', '1234');
    expect(result).toEqual({ ok: true, admin: { id: 1, username: 'admin' } });
  });

  it('rejects empty username or password without querying the DB', async () => {
    expect((await authenticateAdmin('', 'x')).ok).toBe(false);
    expect((await authenticateAdmin('admin', '')).ok).toBe(false);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('login handler (HTTP)', () => {
  beforeEach(() => {
    sql.mockReset();
  });

  it('405s on GET', async () => {
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(405);
  });

  it('400s on malformed JSON body', async () => {
    const req = { method: 'POST', async *[Symbol.asyncIterator]() { yield Buffer.from('{not json'); } };
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('401s on wrong credentials, sets no cookie', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReq('POST', { username: 'admin', password: 'wrong' }), res);
    expect(res.statusCode).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('200s and sets the session cookie on correct credentials', async () => {
    const passwordHash = await hashPassword('1234');
    sql.mockResolvedValue([{ id: 1, username: 'admin', password_hash: passwordHash }]);
    const res = fakeRes();
    await handler(fakeReq('POST', { username: 'admin', password: '1234' }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ username: 'admin' });
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
