import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

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
