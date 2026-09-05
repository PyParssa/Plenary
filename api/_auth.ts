import crypto from 'node:crypto';

type PendingCode = { code: string; expiresAt: number; attempts: number };

const globalState = globalThis as typeof globalThis & { __plenaryPendingCodes?: Map<string, PendingCode> };
const pendingCodes = globalState.__plenaryPendingCodes ?? new Map<string, PendingCode>();
globalState.__plenaryPendingCodes = pendingCodes;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function createCode(email: string): string {
  const code = String(crypto.randomInt(100000, 1000000));
  pendingCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
  return code;
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') return;
    throw new Error('Email delivery is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Plenary verification code',
      text: `Your Plenary verification code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export function verifyCode(email: string, code: string): boolean {
  const pending = pendingCodes.get(email);
  if (!pending || pending.expiresAt < Date.now() || pending.attempts >= 5 || code !== pending.code) {
    if (pending) pending.attempts += 1;
    return false;
  }
  return true;
}

export function consumeCode(email: string): void {
  pendingCodes.delete(email);
}

export async function appendSignupToSheet(email: string, selectedAtmospheres: string[]): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ?? '';
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Plenary-Webhook-Secret': secret },
    body: JSON.stringify({ action: 'append_signup', secret, email, selectedAtmospheres, createdAt: new Date().toISOString() }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Google Sheets webhook returned ${response.status}: ${details.slice(0, 240)}`);
  }
}