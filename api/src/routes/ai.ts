import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { streamChatCompletion, buildPromptFromForm } from '../services/kimiService';

const router = Router();

// POST /api/ai/generate
// Stream SSE response
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  try {
    // Check quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiQuotaTotal: true, aiQuotaUsed: true, membership: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.aiQuotaUsed >= user.aiQuotaTotal) {
      res.status(403).json({
        error: 'AI quota exceeded',
        message: 'Your monthly AI generation limit has been reached. Please upgrade your membership.',
      });
      return;
    }

    const { formData } = req.body;
    if (!formData) {
      res.status(400).json({ error: 'formData is required' });
      return;
    }

    const prompt = buildPromptFromForm(formData);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messages = [
      { role: 'user' as const, content: prompt },
    ];

    let fullResponse = '';

    try {
      for await (const chunk of streamChatCompletion(messages)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }

      // Update quota
      await prisma.user.update({
        where: { id: userId },
        data: { aiQuotaUsed: { increment: 1 } },
      });

      // Log usage
      await prisma.aILog.create({
        data: {
          userId,
          promptTokens: Math.ceil(prompt.length / 4),
          completionTokens: Math.ceil(fullResponse.length / 4),
        },
      });

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (streamErr) {
      console.error('Kimi stream error:', streamErr);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI generation failed' })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
