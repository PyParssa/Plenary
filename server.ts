import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/account/delete', async (req, res) => {
    const authorization = req.headers.authorization;
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Account deletion is not configured on the server.' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !user) return res.status(401).json({ error: 'Your session is invalid or expired.' });

    const { error: cardsError } = await adminClient.from('cards').delete().eq('created_by', user.id);
    if (cardsError) return res.status(500).json({ error: cardsError.message });
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) return res.status(500).json({ error: deleteError.message });
    return res.status(204).send();
  });

  app.post('/api/account/bootstrap', async (req, res) => {
    const authorization = req.headers.authorization;
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Account bootstrap is not configured on the server.' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !user?.email) return res.status(401).json({ error: 'Your session is invalid or missing an email.' });

    const displayName = typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null;
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });
    if (profileError) return res.status(500).json({ error: profileError.message });
    return res.status(204).send();
  });

  // Socratic Reflection API endpoint with server-side Gemini
  app.post('/api/socratic-reflect', async (req, res) => {
    try {
      const { apiSettings, cards, messages } = req.body as {
        apiSettings?: { provider?: string; apiKey?: string; model?: string };
        cards?: Array<{ category: string; author: string; book: string; question: string; backstory: string; relatedInquiries: string[] }>;
        messages?: Array<{ role: 'user' | 'model'; content: string }>;
      };
      const provider = apiSettings?.provider;
      const apiKey = apiSettings?.apiKey?.trim();
      const model = apiSettings?.model?.trim();
      if (!apiKey || !model || !cards?.length || !['openai', 'anthropic', 'gemini'].includes(provider ?? '')) {
        return res.status(400).json({ error: 'Add a provider, model, and API key in Account before starting reflection.' });
      }

      const cardContext = cards.map((card, index) => `${index + 1}. [${card.category}] ${card.author}, ${card.book}: ${card.question}\nContext: ${card.backstory}\nRelated: ${card.relatedInquiries.join(' | ')}`).join('\n\n');
      const systemPrompt = `You are a critical thinker and a Plenary Socratic AI. These are the inquiry cards the user vouched for:\n\n${cardContext}\n\nTalk with the user through these cards. Ask precise, challenging Socratic questions, identify assumptions, test contradictions, and connect their answers to the cards without preaching or giving shallow advice. Keep each response focused and conversational. Do not claim to be a therapist or make clinical judgments.`;
      const transcript = (messages ?? []).map((message) => ({ role: message.role, content: message.content }));
      const reply = provider === 'openai'
        ? await callOpenAi(apiKey, model, systemPrompt, transcript)
        : provider === 'anthropic'
          ? await callAnthropic(apiKey, model, systemPrompt, transcript)
          : await callGemini(apiKey, model, systemPrompt, transcript);
      return res.json({ reply });
    } catch (error) {
      console.error('Socratic AI provider error:', error instanceof Error ? error.message : 'Unknown provider error');
      return res.status(502).json({ error: 'The selected AI provider could not complete the reflection.' });
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

type ChatTurn = { role: 'user' | 'model'; content: string };

async function callOpenAi(apiKey: string, model: string, systemPrompt: string, messages: ChatTurn[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages.map((message) => ({ role: message.role === 'model' ? 'assistant' : 'user', content: message.content }))] }),
  });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `OpenAI returned ${response.status}`);
  return data.choices?.[0]?.message?.content ?? 'The model returned an empty reflection.';
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, messages: ChatTurn[]): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model, max_tokens: 700, system: systemPrompt, messages: messages.map((message) => ({ role: message.role === 'model' ? 'assistant' : 'user', content: message.content })) }),
  });
  const data = await response.json() as { content?: Array<{ text?: string }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Anthropic returned ${response.status}`);
  return data.content?.map((part) => part.text ?? '').join('') || 'The model returned an empty reflection.';
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, messages: ChatTurn[]): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: messages.map((message) => ({ role: message.role === 'model' ? 'model' : 'user', parts: [{ text: message.content }] })) }),
  });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Gemini returned ${response.status}`);
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') || 'The model returned an empty reflection.';
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
