import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pendingCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[dev] Verification code for ${email}: ${code}`);
      return;
    }
    throw new Error('Email delivery is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Plenary verification code',
      text: `Your Plenary verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

async function appendSignupToSheet(email: string, selectedAtmospheres: string[]): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Plenary-Webhook-Secret': process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ?? '',
    },
    body: JSON.stringify({
      secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ?? '',
      email,
      selectedAtmospheres,
      createdAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) throw new Error(`Google Sheets webhook returned ${response.status}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/auth/request-code', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });

    const code = String(crypto.randomInt(100000, 1000000));
    pendingCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });

    try {
      await sendVerificationEmail(email, code);
      const developmentCode = process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY ? code : undefined;
      return res.json({ ok: true, developmentCode });
    } catch (error) {
      pendingCodes.delete(email);
      console.error('Verification email error:', error);
      return res.status(503).json({ error: 'Email delivery is not configured yet.' });
    }
  });

  app.post('/api/auth/verify-code', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const selectedAtmospheres = Array.isArray(req.body?.selectedAtmospheres)
      ? req.body.selectedAtmospheres.filter((item: unknown): item is string => typeof item === 'string').slice(0, 3)
      : [];
    const pending = email ? pendingCodes.get(email) : undefined;

    if (!email || !pending || pending.expiresAt < Date.now() || pending.attempts >= 5 || code !== pending.code) {
      if (pending) pending.attempts += 1;
      return res.status(400).json({ error: 'That code is invalid or expired.' });
    }

    pendingCodes.delete(email);
    try {
      await appendSignupToSheet(email, selectedAtmospheres);
      return res.json({ ok: true, email });
    } catch (error) {
      console.error('Signup sheet error:', error);
      return res.status(503).json({ error: 'Your code was correct, but signup storage is unavailable.' });
    }
  });

  // Socratic Reflection API endpoint with server-side Gemini
  app.post('/api/socratic-reflect', async (req, res) => {
    try {
      const { question, backstory, author, book, currentTurn, maxTurns, messages } = req.body;

      const lockedMessage = `This is a Pro feature. The Socratic AI will unlock when the app is deployed with its production AI credentials. Until then, your reflection practice is intentionally paused.`;
      return res.json({
        reply: lockedMessage,
      });
    } catch (error) {
      console.error('Socratic AI locked state error:', error);
      return res.json({
        reply: 'This is a Pro feature. Please wait until deployment to unlock the Socratic AI.',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for development vs. static dist serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Plenary server running on http://0.0.0.0:${PORT}`);
  });
}

function getFallbackReflection(
  question: string,
  author: string,
  turn: number,
  messages: Array<{ role: string; content: string }>
): string {
  const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === 'user')?.content || '';

  if (turn === 1) {
    return `When you speak of this, notice the tension between anticipation and habit. If ${author}'s question were a direct instruction rather than a theoretical idea, what would be the first tangible thing you would change tomorrow?`;
  }
  if (turn === 2) {
    return `You observe: "${lastUserMsg.slice(0, 36)}...". What would happen if you ceased trying to explain this to other people and simply stood by your own inner knowing?`;
  }
  if (turn === 3) {
    return `In five years, will you value the safety of having avoided the friction, or the depth gained from having confronted it?`;
  }
  if (turn === 4) {
    return `What is the silent condition you have placed on your own peace of mind—and who gave you that condition?`;
  }
  return `We have completed our five turns. Let this inquiry settle into your chest rather than your intellect. May it accompany your decisions today.`;
}

startServer();
