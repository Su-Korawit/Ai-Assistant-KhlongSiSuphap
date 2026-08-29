import { getIronSession } from 'iron-session';
import { getSessionOptions } from '../../auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const session = await getIronSession(req, res, getSessionOptions());
  session.destroy();

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
}
