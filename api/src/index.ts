import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Access log
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.2.1',
    features: ['32k-model-support', 'improved-error-messages'],
  });
});

// Diagnostic endpoint - checks Kimi API connectivity
app.get('/api/diagnostic', async (_req, res) => {
  const kimiKeyConfigured = !!process.env.KIMI_API_KEY;
  const kimiKeyPrefix = process.env.KIMI_API_KEY ? process.env.KIMI_API_KEY.slice(0, 8) + '...' : 'NOT SET';

  let kimiTest = 'not tested';
  if (kimiKeyConfigured) {
    try {
      const { streamChatCompletion } = await import('./services/kimiService');
      const stream = streamChatCompletion([{ role: 'user', content: 'Hi' }], { model: 'moonshot-v1-8k', maxTokens: 10 });
      const result = await stream.next();
      kimiTest = result.done ? 'no response' : 'ok';
    } catch (err: any) {
      kimiTest = `error: ${err.message}`;
    }
  }

  res.json({
    status: 'ok',
    version: '1.2.1',
    kimiApiKeyConfigured: kimiKeyConfigured,
    kimiApiKeyPrefix: kimiKeyPrefix,
    kimiApiTest: kimiTest,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 PLC-AIStudio API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
