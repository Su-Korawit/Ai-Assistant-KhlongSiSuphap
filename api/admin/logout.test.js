import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));

const { default: handler } = await import('./logout.js');

function fakeReq(method) {
  return { method, headers: {}, async *[Symbol.asyncIterator]() {} };
}

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    getHeader(name) { return this.headers[name]; },
    end(data) { this.body = data ?? ''; },
  };
}

describe('logout handler', () => {
  it('405s on GET', async () => {
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(405);
  });

  it('200s and clears the session cookie on POST', async () => {
    const res = fakeRes();
    await handler(fakeReq('POST'), res);
    expect(res.statusCode).toBe(200);
    // iron-session's session.destroy() clears the cookie via a Max-Age=0 Set-Cookie
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
