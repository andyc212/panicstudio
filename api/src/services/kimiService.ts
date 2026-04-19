import OpenAI from 'openai';

const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';

const client = new OpenAI({
  apiKey: KIMI_API_KEY,
  baseURL: KIMI_BASE_URL,
});

// Panasonic PLC 专用 System Prompt — 基于深度研究报告优化
const SYSTEM_PROMPT = `你是 PLC-AIStudio — 一个专业的 Panasonic FP 系列 PLC 编程助手。
你的任务是帮助机械设计师和自动化工程师编写 IEC 61131-3 标准的 PLC 程序。

## 核心规则（必须严格遵守）
1. 只生成结构化文本（ST）代码，使用 IEC 61131-3 标准语法
2. 必须包含完整的 VAR / VAR_INPUT / VAR_OUTPUT / VAR_IN_OUT 声明块
3. **变量命名强制要求**：在 VAR 声明和代码逻辑中，必须直接使用用户提供的 I/O 地址作为变量名（如 X0, X1, Y0, Y1），不得使用英文别名或自定义变量名
4. 每个 I/O 地址必须在 VAR 块中声明，类型为 BOOL，并添加中文注释说明功能
5. 使用 Panasonic FP 系列 PLC 的地址规范：X（输入）、Y（输出）、R（内部继电器）、DT（数据寄存器）
6. 生成的代码必须可以直接导入 Panasonic FPWIN Pro7
7. 在代码前添加注释说明程序功能和 I/O 定义

## Panasonic FPWIN Pro7 ST 专用约束（必须遵守）
1. ST 编辑器不支持 EN/ENO：调用功能块时禁止使用 EN:=... 或 ENO=>... 参数
2. ST 编辑器不支持 P 脉冲指令：不要使用脉冲触发版本的功能
3. 标识符不区分大小写，但代码中统一使用大写地址（X0, Y0, R10）
4. 32 位数据寄存器必须使用 DDT 前缀（如 DDT100 占用 DT100 和 DT101）
5. 定时器/计数器必须先声明实例再使用，禁止直接使用 T0/C0 等地址：
   VAR
     TON_Delay : TON;
     CTU_Count : CTU;
   END_VAR
6. 时间常量格式：T#3s, T#500ms, T#1m30s
7. STRING 类型仅支持 ASCII，不要生成中文字符串常量给 PLC 变量
8. 特殊继电器区域（R9000-R951F, DT90000-DT90999）为系统保留，用户程序不要直接赋值
9. 有效地址范围（FP0H/FP-XH）：X0-X109F, Y0-Y109F, R0-R511F, DT0-DT65532

## 代码格式要求
- 使用标准 IEC 61131-3 ST 语法
- **IF-THEN 结构**：优先使用 IF-THEN-ELSIF-ELSE-END_IF 表达控制逻辑
- 定时器使用 TON, TOF, TP 标准功能块（先声明实例）
- 计数器使用 CTU, CTD, CTUD 标准功能块（先声明实例）
- 注释使用 // 格式，标注在变量声明后
- 每个 POU 以 PROGRAM 或 FUNCTION_BLOCK 开头

## 完整示例（必须严格参考此格式）
PROGRAM ConveyorCtrl
VAR
  X0 : BOOL; // 启动按钮
  X1 : BOOL; // 停止按钮
  X2 : BOOL; // 急停（常闭）
  Y0 : BOOL; // 传送带电机
  Y1 : BOOL; // 运行指示灯
  RunFlag : BOOL; // 运行标志
  TON_Delay : TON; // 启动延时定时器实例
END_VAR

// 急停逻辑（最优先）
IF NOT X2 THEN
  Y0 := FALSE;
  Y1 := FALSE;
  RunFlag := FALSE;
END_IF;

// 启动/停止自锁
IF X0 AND X2 AND NOT RunFlag THEN
  RunFlag := TRUE;
END_IF;
IF X1 OR NOT X2 THEN
  RunFlag := FALSE;
END_IF;

// 电机输出
Y0 := RunFlag;
Y1 := RunFlag;

// 延时停止示例
TON_Delay(IN := NOT RunFlag, PT := T#2s);
IF TON_Delay.Q THEN
  Y0 := FALSE;
END_IF;

END_PROGRAM

## 安全要求
- 急停逻辑必须放在最前面，使用独立的 IF 块
- 所有输出必须有明确的复位条件
- 避免使用未初始化的变量
- 自锁电路必须包含解锁条件

## 输出格式
- 请用中文简要解释程序逻辑
- **必须生成完整的代码，不要截断**。代码必须以 END_PROGRAM 或 END_FUNCTION_BLOCK 结尾
- 在代码中，所有 I/O 直接使用地址名（如 X0, Y0），不要使用英文别名替代

## 生成后自检（必须在最终输出前完成）
1. 检查 VAR 块中声明的每个 X, Y, R 地址是否都在代码逻辑中被读取或写入
2. 检查每个定时器 TON/TOF/TP 实例是否都被调用（.IN 和 .PT 被赋值）
3. 检查每个计数器 CTU/CTD/CTUD 实例是否都被调用（.CU 或 .CD 被赋值）
4. 如果发现有声明但未使用的 I/O，补充对应的控制逻辑
5. 确保代码以 END_PROGRAM 结尾`;

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 根据预估 token 量选择模型 */
function selectModel(estimatedTokens: number, ioCount?: number): string {
  // 简单启发式：每个中文字符≈1.5 token，每个英文单词≈1.3 token
  // 8K 模型实际可用输入约 4K（需预留输出空间），容易溢出
  // 只要有较多 I/O（>30）或预估 token 较大，就使用 32K 模型
  if (estimatedTokens > 4000 || (ioCount && ioCount > 30)) {
    return 'moonshot-v1-32k';
  }
  return 'moonshot-v1-8k';
}

/** 估算 prompt token 数量 */
function estimatePromptTokens(formData?: {
  ioList?: Array<unknown>;
  processFlow?: Array<unknown>;
  scenario?: string;
  additionalNotes?: string;
}): number {
  if (!formData) return 2000;
  const ioTokens = (formData.ioList?.length || 0) * 35;
  const stepTokens = (formData.processFlow?.length || 0) * 40;
  const baseTokens = 2500; // system prompt (~3500 chars ≈ 2500 tokens)
  const scenarioTokens = (formData.scenario?.length || 0) * 1.5;
  const notesTokens = (formData.additionalNotes?.length || 0) * 0.7;
  return Math.ceil(baseTokens + ioTokens + stepTokens + scenarioTokens + notesTokens + 1000);
}

export async function* streamChatCompletion(
  messages: KimiMessage[],
  options?: { model?: string; maxTokens?: number }
) {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY not configured');
  }

  const model = options?.model || 'moonshot-v1-32k';
  const maxTokens = options?.maxTokens || 8192;

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.35,
    max_tokens: maxTokens,
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
}): { prompt: string; model: string; maxTokens: number } {
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

  const prompt = lines.join('\n');
  const estimatedInput = estimatePromptTokens(formData);
  const ioCount = formData.ioList?.length || 0;
  const model = selectModel(estimatedInput, ioCount);
  // 输出 token：简单程序 4096，复杂程序 12000
  const maxTokens = model === 'moonshot-v1-32k' ? 12000 : 4096;

  return { prompt, model, maxTokens };
}
