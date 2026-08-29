import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../auth.js';
import { fakeReq, fakeRes } from '../httpTestUtils.js';

vi.mock('../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../db/client.js');
const {
  listPromptsGrouped, createPrompt, updatePrompt, deletePrompt, default: handler,
} = await import('./prompts.js');

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

const CATEGORIES = [{ id: 1, name: 'สิ่งแวดล้อม', sort_order: 0 }];
const PROMPTS = [
  { id: 10, category_id: 1, text: 'ฝุ่น PM2.5' },
  { id: 11, category_id: 1, text: 'ขยะพลาสติก' },
];

describe('listPromptsGrouped', () => {
  beforeEach(() => { sql.mockReset(); });

  it('nests prompts under their category', async () => {
    sql.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce(PROMPTS);
    const grouped = await listPromptsGrouped();
    expect(grouped).toEqual([
      { id: 1, category: 'สิ่งแวดล้อม', sort_order: 0, prompts: [{ id: 10, text: 'ฝุ่น PM2.5' }, { id: 11, text: 'ขยะพลาสติก' }] },
    ]);
  });

  it('a category with no prompts yet gets an empty array, not omitted', async () => {
    sql.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce([]);
    const grouped = await listPromptsGrouped();
    expect(grouped).toEqual([{ id: 1, category: 'สิ่งแวดล้อม', sort_order: 0, prompts: [] }]);
  });
});

describe('createPrompt / updatePrompt / deletePrompt', () => {
  beforeEach(() => { sql.mockReset(); });

  it('createPrompt inserts under a category and returns the row', async () => {
    sql.mockResolvedValue([PROMPTS[0]]);
    expect(await createPrompt({ category_id: 1, text: 'ฝุ่น PM2.5' })).toEqual(PROMPTS[0]);
  });

  it('updatePrompt writes new text and returns the row', async () => {
    sql.mockResolvedValue([{ ...PROMPTS[0], text: 'แก้แล้ว' }]);
    const result = await updatePrompt({ id: 10, text: 'แก้แล้ว' });
    expect(result.text).toBe('แก้แล้ว');
  });

  it('deletePrompt issues a delete', async () => {
    sql.mockResolvedValue([]);
    await deletePrompt(10);
    expect(sql).toHaveBeenCalled();
  });
});

describe('prompts handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('GET is public — no auth required', async () => {
    sql.mockResolvedValueOnce(CATEGORIES).mockResolvedValueOnce(PROMPTS);
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)[0].prompts.length).toBe(2);
  });

  it('POST 401s without a session', async () => {
    const res = fakeRes();
    await handler(fakeReq('POST', { category_id: 1, text: 'x' }), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 400s without category_id or text', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { text: 'x' }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 201s with a valid session + body', async () => {
    sql.mockResolvedValue([PROMPTS[0]]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { category_id: 1, text: 'ฝุ่น PM2.5' }), res);
    expect(res.statusCode).toBe(201);
  });

  it('PUT 404s when the id does not exist', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 999, text: 'x' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE 200s with a valid session + id', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'DELETE', { id: 10 }), res);
    expect(res.statusCode).toBe(200);
  });

  it('405s on PATCH', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PATCH'), res);
    expect(res.statusCode).toBe(405);
  });
});
