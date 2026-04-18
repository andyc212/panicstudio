import OpenAI from 'openai';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';

const client = new OpenAI({
  apiKey: KIMI_API_KEY,
  baseURL: KIMI_BASE_URL,
});

// Panasonic PLC 专用 System Prompt
const SYSTEM_PROMPT = `你是 PanicStudio — 一个专业的 Panasonic PLC 编程助手。
你的任务是帮助机械设计师和自动化工程师编写 IEC 61131-3 标准的 PLC 程序。

## 核心规则（必须严格遵守）
1. 只生成结构化文本（ST）代码，使用 IEC 61131-3 标准语法
2. 必须包含完整的 VAR / VAR_INPUT / VAR_OUTPUT / VAR_IN_OUT 声明块
3. **变量命名强制要求**：在 VAR 声明和代码逻辑中，必须直接使用用户提供的 I/O 地址作为变量名（如 X0, X1, Y0, Y1），不得使用英文别名或自定义变量名
4. 每个 I/O 地址必须在 VAR 块中声明，类型为 BOOL，并添加中文注释说明功能
5. 使用 Panasonic FP 系列 PLC 的地址规范：X（输入）、Y（输出）、R（内部继电器）、DT（数据寄存器）
6. 生成的代码必须可以直接导入 Panasonic FPWIN Pro7
7. 在代码前添加注释说明程序功能和 I/O 定义

## 代码格式要求
- 使用标准 IEC 61131-3 ST 语法
- **IF-THEN 结构**：优先使用 IF-THEN-ELSIF-ELSE-END_IF 表达控制逻辑，每个条件分支对应一个 Network
- 定时器使用 TON, TOF, TP 标准功能块
- 计数器使用 CTU, CTD, CTUD 标准功能块
- 注释使用 // 格式，标注在变量声明后
- 每个 POU 以 PROGRAM 或 FUNCTION_BLOCK 开头

## 变量声明示例（必须遵循此格式）
VAR
  X0 : BOOL; // 启动按钮
  X1 : BOOL; // 停止按钮
  X2 : BOOL; // 急停开关
  Y0 : BOOL; // 传送带电机
  Y1 : BOOL; // 运行指示灯
  RunFlag : BOOL; // 运行标志位
END_VAR

## 安全要求
- 急停逻辑必须放在最前面，使用独立的 IF 块
- 所有输出必须有明确的复位条件
- 避免使用未初始化的变量
- 自锁电路必须包含解锁条件

## 输出格式
请用中文简要解释程序逻辑。
在代码中，所有 I/O 直接使用地址名（如 X0, Y0），不要在代码中使用英文别名替代。`;

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function* streamChatCompletion(messages: KimiMessage[]) {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY not configured');
  }

  const stream = await client.chat.completions.create({
    model: 'moonshot-v1-8k',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.3,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      yield content;
    }
  }
}

// 构建 Prompt 从表单数据
export function buildPromptFromForm(formData: {
  plcModel: string;
  scenario: string;
  ioList: Array<{ address: string; type: string; name: string; description: string }>;
  processFlow: Array<{ description: string; condition?: string; delayMs?: number }>;
  safetyConditions: Array<{ description: string; enabled: boolean; ioRef?: string }>;
  controlModes: string[];
  additionalNotes?: string;
}): string {
  const lines: string[] = [];

  lines.push(`请为 ${formData.plcModel} PLC 编写一个 ${formData.scenario} 控制程序。`);
  lines.push('');

  lines.push('## I/O 配置（以下地址必须在代码中直接使用，不可替换为其他名称）');
  formData.ioList.forEach((io) => {
    lines.push(`- ${io.address} (${io.type}): ${io.name} — ${io.description}`);
  });
  lines.push('');
  lines.push('**重要**：代码中所有变量必须使用上述 I/O 地址（如 X0, Y0），不要使用 StopButton、Motor 等英文别名。');
  lines.push('');

  lines.push('## 动作流程');
  formData.processFlow.forEach((step, i) => {
    lines.push(`${i + 1}. ${step.description}${step.condition ? ` [条件: ${step.condition}]` : ''}`);
  });
  lines.push('');

  const activeSafety = formData.safetyConditions.filter((s) => s.enabled);
  if (activeSafety.length > 0) {
    lines.push('## 安全条件');
    activeSafety.forEach((s) => {
      lines.push(`- ${s.description}${s.ioRef ? ` (${s.ioRef})` : ''}`);
    });
    lines.push('');
  }

  if (formData.controlModes.length > 0) {
    lines.push(`## 控制模式: ${formData.controlModes.join(', ')}`);
    lines.push('');
  }

  if (formData.additionalNotes) {
    lines.push('## 补充说明');
    lines.push(formData.additionalNotes);
    lines.push('');
  }

  lines.push('请生成完整的 ST 代码，包含所有变量声明。');

  return lines.join('\n');
}
