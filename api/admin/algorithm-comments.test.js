import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sealData } from 'iron-session';
import { getSessionOptions, ADMIN_SESSION_COOKIE } from '../../auth.js';
import { fakeReq, fakeRes } from '../../httpTestUtils.js';

vi.mock('../../db/client.js', () => ({ sql: vi.fn() }));
vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { sql } = await import('../../db/client.js');
const {
  listComments, createComment, updateCommentStatus, deleteComment, default: handler,
} = await import('./algorithm-comments.js');

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

const COMMENT = {
  id: 1, body: 'จริงยังพัง', linked_irregular_syllable: 'จริง',
  status: 'open', created_at: '2026-01-01T00:00:00.000Z', admin_username: 'admin',
};

describe('listComments / createComment / updateCommentStatus / deleteComment', () => {
  beforeEach(() => { sql.mockReset(); });

  it('listComments returns rows with the commenting admin\'s username joined in', async () => {
    sql.mockResolvedValue([COMMENT]);
    expect(await listComments()).toEqual([COMMENT]);
  });

  it('createComment inserts and returns the row', async () => {
    sql.mockResolvedValue([COMMENT]);
    const result = await createComment({ admin_id: 1, body: 'จริงยังพัง', linked_irregular_syllable: 'จริง' });
    expect(result).toEqual(COMMENT);
  });

  it('updateCommentStatus writes the new status', async () => {
    sql.mockResolvedValue([{ ...COMMENT, status: 'resolved' }]);
    const result = await updateCommentStatus({ id: 1, status: 'resolved' });
    expect(result.status).toBe('resolved');
  });

  it('deleteComment issues a delete', async () => {
    sql.mockResolvedValue([]);
    await deleteComment(1);
    expect(sql).toHaveBeenCalled();
  });
});

describe('algorithm-comments handler (HTTP) — every method requires an admin session', () => {
  beforeEach(() => { sql.mockReset(); });

  it('GET 401s without a session (no public consumer for this endpoint at all)', async () => {
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(401);
    expect(sql).not.toHaveBeenCalled();
  });

  it('GET 200s with a session', async () => {
    sql.mockResolvedValue([COMMENT]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([COMMENT]);
  });

  it('POST 400s without a body', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'POST', { linked_irregular_syllable: 'จริง' }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('POST 201s and stamps admin_id from the session, not the request body', async () => {
    sql.mockResolvedValue([COMMENT]);
    const res = fakeRes();
    // client tries to claim admin_id 999 — the session's real id (1) must win
    await handler(fakeReqAs(await adminCookie(1), 'POST', { body: 'จริงยังพัง', admin_id: 999 }), res);
    expect(res.statusCode).toBe(201);
    expect(sql.mock.calls[0][1]).toBe(1); // first interpolated value in the insert is admin_id
  });

  it('PUT 400s with an invalid status value', async () => {
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 1, status: 'not-a-real-status' }), res);
    expect(res.statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('PUT 200s with status "resolved"', async () => {
    sql.mockResolvedValue([{ ...COMMENT, status: 'resolved' }]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 1, status: 'resolved' }), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('resolved');
  });

  it('PUT 404s when the id does not exist', async () => {
    sql.mockResolvedValue([]);
    const res = fakeRes();
    await handler(fakeReqAs(await adminCookie(), 'PUT', { id: 999, status: 'open' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE 200s with an id', async () => {
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
