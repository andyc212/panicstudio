import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { streamChatCompletion, buildPromptFromForm, KimiMessage } from '../services/kimiService';

const router = Router();

// POST /api/ai/generate
// Stream SSE response
// Supports both guided mode (formData) and chat mode (messages)
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  console.log('[AI] Generate request received');
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

    const { formData, messages } = req.body;

    let chatMessages: KimiMessage[];
    let model: string;
    let maxTokens: number;
    let promptForLogging: string;

    if (messages && Array.isArray(messages)) {
      // Chat mode
      chatMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })) as KimiMessage[];
      model = 'moonshot-v1-32k';
      maxTokens = 8192;
      promptForLogging = messages.map((m: any) => m.content).join('\n');
    } else if (formData) {
      // Guided mode
      const promptResult = buildPromptFromForm(formData);
      model = promptResult.model;
      maxTokens = promptResult.maxTokens;
      promptForLogging = promptResult.prompt;
      chatMessages = [{ role: 'user' as const, content: promptResult.prompt }];
    } else {
      res.status(400).json({ error: 'formData or messages is required' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    try {
      for await (const chunk of streamChatCompletion(chatMessages, { model, maxTokens })) {
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
          promptTokens: Math.ceil(promptForLogging.length / 4),
          completionTokens: Math.ceil(fullResponse.length / 4),
          model,
        },
      });

      res.write(`data: ${JSON.stringify({ type: 'done', model })}\n\n`);
      res.end();
    } catch (streamErr: any) {
      console.error('Kimi stream error:', streamErr);
      const errorMessage = streamErr?.message || '';
      let userError = 'AI generation failed';
      if (errorMessage.includes('context length') || errorMessage.includes('maximum context') || errorMessage.includes('too long')) {
        userError = 'Prompt too long: The uploaded content exceeds the AI model\'s context limit. Try using a smaller file or fewer I/O entries.';
      } else if (errorMessage.includes('rate limit')) {
        userError = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        userError = 'AI service authentication failed. Please contact support.';
      }
      res.write(`data: ${JSON.stringify({ type: 'error', error: userError })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
