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
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield data;
        } catch {
          // Ignore malformed JSON
        }
      }
    }
  }
}
