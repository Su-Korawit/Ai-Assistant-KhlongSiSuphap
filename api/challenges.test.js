import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../auth.js';
import { fakeReq, fakeRes } from '../httpTestUtils.js';

vi.mock('../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../db/client.js');
const {
  listChallenges, createChallenge, updateChallenge, deleteChallenge, default: handler,
} = await import('./challenges.js');

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

const SAMPLE_ROW = {
  id: 1, title: 'ด่านที่ ๑', description: 'ฝึกวรรคเดียว',
  segments: [{ bahtIndex: 0, count: 5 }], badge: '🌱', sort_order: 0,
};

describe('listChallenges / createChallenge / updateChallenge / deleteChallenge', () => {
  beforeEach(() => { sql.mockReset(); });

  it('listChallenges returns the rows as-is', async () => {
    sql.mockResolvedValue([SAMPLE_ROW]);
    expect(await listChallenges()).toEqual([SAMPLE_ROW]);
  });

  it('createChallenge inserts and returns the new row', async () => {
    sql.mockResolvedValue([SAMPLE_ROW]);
    const result = await createChallenge({
      title: 'ด่านที่ ๑', description: 'ฝึกวรรคเดียว',
      segments: [{ bahtIndex: 0, count: 5 }], badge: '🌱', sort_order: 0,
    });
    expect(result).toEqual(SAMPLE_ROW);
  });

  it('updateChallenge writes and returns the updated row', async () => {
    sql.mockResolvedValue([{ ...SAMPLE_ROW, title: 'แก้แล้ว' }]);
    const result = await updateChallenge({ id: 1, ...SAMPLE_ROW, title: 'แก้แล้ว' });
    expect(result.title).toBe('แก้แล้ว');
  });

  it('deleteChallenge issues a delete by id', async () => {
    sql.mockResolvedValue([]);
    await deleteChallenge(1);
    expect(sql).toHaveBeenCalled();
  });
});

describe('challenges handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('GET is public — no auth required', async () => {
    sql.mockResolvedValue([SAMPLE_ROW]);
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([SAMPLE_ROW]);
  });

  it('POST 401s without a session, never reaching the DB', async () => {
    const res = fakeRes();
    await handler(fakeReq('POST', { title: 'x' }), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 400s when title or segments is missing', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { description: 'no title or segments' }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 201s and creates with a valid session + body', async () => {
    sql.mockResolvedValue([SAMPLE_ROW]);
    const res = fakeRes();
    await handler(
      fakeReqAs(await adminCookie(), 'POST', {
        title: 'ด่านที่ ๑', description: 'ฝึกวรรคเดียว',
        segments: [{ bahtIndex: 0, count: 5 }], badge: '🌱', sort_order: 0,
      }),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toEqual(SAMPLE_ROW);
  });

  it('PUT 400s without an id', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { title: 'x', segments: [] }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('PUT 404s when the id does not exist', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 999, title: 'x', segments: [] }), res);
    expect(res.statusCode).toBe(404);
  });

  it('PUT 200s and updates with a valid id', async () => {
    sql.mockResolvedValue([{ ...SAMPLE_ROW, title: 'แก้แล้ว' }]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 1, title: 'แก้แล้ว', segments: [{ bahtIndex: 0, count: 5 }] }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).title).toBe('แก้แล้ว');
  });

  it('DELETE 401s without a session', async () => {
    const res = fakeRes();
    await handler(fakeReq('DELETE', { id: 1 }), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('DELETE 200s with a valid session + id', async () => {
    sql.mockResolvedValue([]);
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
