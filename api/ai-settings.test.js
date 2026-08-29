import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeReq, fakeRes } from '../httpTestUtils.js';

vi.mock('../db/client.js', () => ({ sql: vi.fn() }));

const { sql } = await import('../db/client.js');
const { getPublicAiSettings, default: handler } = await import('./ai-settings.js');

describe('getPublicAiSettings', () => {
  beforeEach(() => { sql.mockReset(); });

  it('returns only the public-safe fields, never prompt_template', async () => {
    sql.mockResolvedValue([{ ai_enabled: true, ai_autofill_enabled: false, prompt_template: 'secret internal prompt' }]);
    const settings = await getPublicAiSettings();
    expect(settings).toEqual({ ai_enabled: true, ai_autofill_enabled: false });
  });

  it('defaults to both enabled if the singleton row is somehow missing', async () => {
    sql.mockResolvedValue([]);
    const settings = await getPublicAiSettings();
    expect(settings).toEqual({ ai_enabled: true, ai_autofill_enabled: true });
  });
});

describe('public ai-settings handler (HTTP)', () => {
  beforeEach(() => { sql.mockReset(); });

  it('405s on POST', async () => {
    const res = fakeRes();
    await handler(fakeReq('POST'), res);
    expect(res.statusCode).toBe(405);
  });

  it('200s with the settings on GET, no auth required', async () => {
    sql.mockResolvedValue([{ ai_enabled: false, ai_autofill_enabled: true, prompt_template: null }]);
    const res = fakeRes();
    await handler(fakeReq('GET'), res);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ai_enabled: false, ai_autofill_enabled: true });
  });
});
