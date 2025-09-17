import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('Missing GOOGLE_API_KEY. Create a .env file with GOOGLE_API_KEY=YOUR_KEY');
}
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Theme-specific guidance
const THEME_GUIDANCE = {
  general: `
You are Saathi, a kind, concise assistant. Be helpful and respectful. Keep answers clear and brief unless user asks for depth.`,
  stress: `
You are Saathi supporting study stress. Be calm, practical, and encouraging.
- Acknowledge pressure and normalize it.
- Offer actionable study tips, timeboxing, break scheduling, and prioritization.
- Suggest brief breathing/grounding exercises when user is overwhelmed.
- Avoid medical or diagnostic claims.`,
  anxiety: `
You are Saathi supporting anxiety. Be validating and non-judgmental.
- Use gentle language and short steps (e.g., 3–5 bullet actions).
- Offer grounding (5-4-3-2-1), paced breathing, and thought reframing examples.
- Encourage professional help if risk is implied; otherwise keep it supportive.
- Do not provide medical diagnosis.`,
  relationships: `
You are Saathi for relationships. Be neutral, empathetic, and fair.
- Encourage perspective-taking and I-statements.
- Offer clear communication steps and boundary-setting tips.
- Avoid taking sides; discourage invasive actions.`,
  depression: `
You are Saathi for mood support. Be warm and strengths-based.
- Encourage small achievable actions and self-compassion.
- Offer simple routines, activity scheduling, and reach-out ideas.
- If user mentions self-harm or crisis, gently advise local resources. Do not give medical advice.`
};

function getSystemInstruction(theme) {
  const PLAIN_TEXT_RULE = `\nOutput format: Use plain text only. Avoid Markdown formatting (no **bold**, lists, or code blocks). If listing steps, write short lines starting with a dash.`;
  const key = String(theme || 'general').toLowerCase();
  let base;
  switch (key) {
    case 'general': base = THEME_GUIDANCE.general; break;
    case 'stress': base = THEME_GUIDANCE.stress; break;
    case 'anxiety': base = THEME_GUIDANCE.anxiety; break;
    case 'relationships': base = THEME_GUIDANCE.relationships; break;
    case 'depression':
    case 'mood':
    case 'mood support': base = THEME_GUIDANCE.depression; break;
    default: base = THEME_GUIDANCE.general; break;
  }
  return base + PLAIN_TEXT_RULE;
}

function toGeminiHistory(messages = []) {
  const MAX_CHARS = 1200; // cap each message to reduce latency
  const safeText = (s) => {
    const t = String(s || '');
    return t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) + '…' : t;
  };
  return messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: safeText(m.content) }]
  }));
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/chat', async (req, res) => {
  try {
    const { theme = 'general', messages = [] } = req.body || {};
    if (!genAI) return res.status(500).json({ ok: false, error: 'MISSING_API_KEY' });

    // Reduce context window to speed up responses
    const last = messages.slice(-20);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: getSystemInstruction(theme)
    });

  const t0 = Date.now();
  const result = await model.generateContent({ contents: toGeminiHistory(last) });
  const t1 = Date.now();
  console.log(`Gemini latency: ${t1 - t0}ms (messages: ${last.length})`);
    const text = result.response.text() || '';
    res.json({ ok: true, text });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ ok: false, error: 'GENERATION_FAILED' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Saathi API listening on http://localhost:${PORT}`);
});
