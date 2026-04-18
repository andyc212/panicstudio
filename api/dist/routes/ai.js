"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const kimiService_1 = require("../services/kimiService");
const router = (0, express_1.Router)();
// POST /api/ai/generate
// Stream SSE response
router.post('/generate', auth_1.authMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
        // Check quota
        const user = await prisma_1.prisma.user.findUnique({
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
        const prompt = (0, kimiService_1.buildPromptFromForm)(formData);
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const messages = [
            { role: 'user', content: prompt },
        ];
        let fullResponse = '';
        try {
            for await (const chunk of (0, kimiService_1.streamChatCompletion)(messages)) {
                fullResponse += chunk;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
            }
            // Update quota
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: { aiQuotaUsed: { increment: 1 } },
            });
            // Log usage
            await prisma_1.prisma.aILog.create({
                data: {
                    userId,
                    promptTokens: Math.ceil(prompt.length / 4),
                    completionTokens: Math.ceil(fullResponse.length / 4),
                },
            });
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            res.end();
        }
        catch (streamErr) {
            console.error('Kimi stream error:', streamErr);
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI generation failed' })}\n\n`);
            res.end();
        }
    }
    catch (err) {
        console.error('AI generate error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map