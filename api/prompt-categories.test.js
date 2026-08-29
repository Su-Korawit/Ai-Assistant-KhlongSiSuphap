import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../auth.js';
import { fakeReq, fakeRes } from '../httpTestUtils.js';

vi.mock('../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../db/client.js');
const {
  createCategory, updateCategory, deleteCategory, default: handler,
} = await import('./prompt-categories.js');

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

const CATEGORY = { id: 1, name: 'สิ่งแวดล้อม', sort_order: 0 };

describe('createCategory / updateCategory / deleteCategory', () => {
  beforeEach(() => { sql.mockReset(); });

  it('createCategory inserts and returns the row', async () => {
    sql.mockResolvedValue([CATEGORY]);
    expect(await createCategory({ name: 'สิ่งแวดล้อม', sort_order: 0 })).toEqual(CATEGORY);
  });

  it('updateCategory writes and returns the row', async () => {
    sql.mockResolvedValue([{ ...CATEGORY, name: 'แก้แล้ว' }]);
    const result = await updateCategory({ id: 1, name: 'แก้แล้ว', sort_order: 0 });
    expect(result.name).toBe('แก้แล้ว');
  });

  it('deleteCategory issues a delete', async () => {
    sql.mockResolvedValue([]);
    await deleteCategory(1);
    expect(sql).toHaveBeenCalled();
  });
});

describe('prompt-categories handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('GET is not a supported method here (405) — categories are read via /api/prompts', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'GET'), res);
    expect(res.statusCode).toBe(405);
  });

  it('POST 401s without a session', async () => {
    const res = fakeRes();
    await handler(fakeReq('POST', { name: 'x' }), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 400s without a name', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { sort_order: 0 }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 201s with a valid session + name', async () => {
    sql.mockResolvedValue([CATEGORY]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { name: 'สิ่งแวดล้อม', sort_order: 0 }), res);
    expect(res.statusCode).toBe(201);
  });

  it('PUT 404s when the id does not exist', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 999, name: 'x' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE 200s with a valid session + id', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'DELETE', { id: 1 }), res);
    expect(res.statusCode).toBe(200);
  });
});
