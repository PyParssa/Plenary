import { createCode, normalizeEmail, sendVerificationEmail } from '../_auth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });

  const code = createCode(email);
  try {
    await sendVerificationEmail(email, code);
    return res.status(200).json({ ok: true, developmentCode: process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY ? code : undefined });
  } catch (error) {
    console.error('Verification email error:', error);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ ok: true, developmentCode: code, deliveryFallback: true });
    }
    return res.status(503).json({ error: 'Email delivery is not configured yet.' });
  }
}