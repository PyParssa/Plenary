import { appendSignupToSheet, consumeCode, normalizeEmail, verifyCode } from '../_auth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const selectedAtmospheres = Array.isArray(req.body?.selectedAtmospheres)
    ? req.body.selectedAtmospheres.filter((item: unknown): item is string => typeof item === 'string').slice(0, 3)
    : [];

  if (!email || !verifyCode(email, code)) {
    return res.status(400).json({ error: 'That code is invalid or expired.' });
  }

  try {
    await appendSignupToSheet(email, selectedAtmospheres);
    consumeCode(email);
    return res.status(200).json({ ok: true, email });
  } catch (error) {
    console.error('Signup sheet error:', error);
    return res.status(503).json({
      error: process.env.NODE_ENV !== 'production' && error instanceof Error
        ? `Your code was correct, but signup storage failed: ${error.message}`
        : 'Your code was correct, but signup storage is unavailable.',
    });
  }
}