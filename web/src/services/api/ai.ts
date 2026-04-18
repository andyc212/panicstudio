import type { AIGenerationForm } from '@types';
import { apiClient } from './client';

export async function* streamAIGeneration(formData: AIGenerationForm) {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('panicstudio-token') || ''}`,
    },
    body: JSON.stringify({ formData }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 查找完整的 SSE 消息边界 (\n\n)
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const message = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (message.startsWith('data: ')) {
        try {
          const data = JSON.parse(message.slice(6));
          yield data;
        } catch {
          // Ignore malformed JSON
        }
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  // 处理最后剩余的数据（如果没有 \n\n 结尾）
  if (buffer.trim()) {
    const message = buffer.trim();
    if (message.startsWith('data: ')) {
      try {
        const data = JSON.parse(message.slice(6));
        yield data;
      } catch {
        // Ignore malformed JSON
      }
    }
  }
}
