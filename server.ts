import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Socratic Reflection API endpoint with server-side Gemini
  app.post('/api/socratic-reflect', async (req, res) => {
    try {
      const { question, backstory, author, book, currentTurn, maxTurns, messages } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          reply: getFallbackReflection(question, author, currentTurn, messages),
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = `You are Plenary's Socratic Guide, a contemplative, discerning, and gentle philosophical interlocutor inspired by classic stoic, existential, and meditative traditions.
The seeker is meditating on the question: "${question}" from "${book}" by ${author}.
Context: ${backstory}.

This dialogue is structured into 5 turns of deep reflection (Currently Turn ${currentTurn} of ${maxTurns}).
Rules for your reply:
- Keep your response brief, uncluttered, and poetic (strictly under 70 words).
- Do not provide cheerleading, cliché self-help advice, or bulleted lists.
- Directly acknowledge the essence of what the user just expressed.
- Turn 1-4: Pose one illuminating, gentle, penetrating question that invites deeper honesty.
- Turn 5 (Final Turn): Offer a grounded, luminous synthesis of what was unearthed.`;

      const contents = (messages || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents.length > 0 ? contents : [{ parts: [{ text: 'Begin reflection.' }] }],
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || getFallbackReflection(question, author, currentTurn, messages);
      res.json({ reply });
    } catch (error) {
      console.error('Gemini Socratic API error:', error);
      const { question, author, currentTurn, messages } = req.body;
      res.json({ reply: getFallbackReflection(question, author, currentTurn, messages) });
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
