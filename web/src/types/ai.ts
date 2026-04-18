// AI 相关类型定义

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  // 如果消息包含代码块
  codeBlocks?: CodeBlock[];
}

export interface CodeBlock {
  id: string;
  language: string;   // 'iec-st' | 'ld' | 'xml'
  content: string;
  title?: string;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AIStreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  error?: string;
  model?: string;
}

export interface GenerateRequest {
  formData: import('./plc').AIGenerationForm;
  conversationId?: string;
}

export interface GenerateResponse {
  conversationId: string;
  messageId: string;
}
