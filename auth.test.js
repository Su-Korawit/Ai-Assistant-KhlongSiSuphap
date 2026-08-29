import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth.js';

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
