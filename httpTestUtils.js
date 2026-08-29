// Shared fake req/res for testing raw Node http handlers (api/*.js) without
// a real server. Used by auth.test.js and the api/admin/*.test.js files.

export function fakeReq(method, body) {
  const raw = body === undefined ? '' : JSON.stringify(body);
  return {
    method,
    headers: {},
    async *[Symbol.asyncIterator]() {
      if (raw) yield Buffer.from(raw);
    },
  };
}

export function fakeReqWithCookie(method, cookieHeader) {
  return {
    method,
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    async *[Symbol.asyncIterator]() {},
  };
}

export function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    getHeader(name) { return this.headers[name]; },
    end(data) { this.body = data ?? ''; },
  };
}
