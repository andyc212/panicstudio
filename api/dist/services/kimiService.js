"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamChatCompletion = streamChatCompletion;
exports.buildPromptFromForm = buildPromptFromForm;
const openai_1 = __importDefault(require("openai"));
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
const client = new openai_1.default({
    apiKey: KIMI_API_KEY,
    baseURL: KIMI_BASE_URL,
});
// Panasonic PLC 专用 System Prompt
const SYSTEM_PROMPT = `你是 PanicStudio — 一个专业的 Panasonic PLC 编程助手。
你的任务是帮助机械设计师和自动化工程师编写 IEC 61131-3 标准的 PLC 程序。

## 核心规则
1. 只生成结构化文本（ST）代码，使用 IEC 61131-3 标准语法
2. 必须包含完整的 VAR / VAR_INPUT / VAR_OUTPUT / VAR_IN_OUT 声明块
3. 使用 Panasonic FP 系列 PLC 的地址规范：X（输入）、Y（输出）、R（内部继电器）、DT（数据寄存器）
4. 生成的代码必须可以直接导入 Panasonic FPWIN Pro7
5. 所有变量必须声明类型（BOOL, INT, DINT, REAL, TIME 等）
6. 在代码前添加注释说明程序功能和 I/O 定义

## 代码格式要求
- 使用标准 IEC 61131-3 ST 语法
- 定时器使用 TON, TOF, TP 标准功能块
- 计数器使用 CTU, CTD, CTUD 标准功能块
- 注释使用 // 或 (* *) 格式
- 每个 POU 以 PROGRAM 或 FUNCTION_BLOCK 开头

## 安全要求
- 急停逻辑必须放在最前面
- 所有输出必须有明确的复位条件
- 避免使用未初始化的变量
- 自锁电路必须包含解锁条件

## 输出格式
请用中文解释程序逻辑，但代码本身使用标准英文 IEC 61131-3 语法。
在代码块后，提供变量对照表（地址 → 名称 → 功能说明）。`;
async function* streamChatCompletion(messages) {
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
function buildPromptFromForm(formData) {
    const lines = [];
    lines.push(`请为 ${formData.plcModel} PLC 编写一个 ${formData.scenario} 控制程序。`);
    lines.push('');
    lines.push('## I/O 配置');
    formData.ioList.forEach((io) => {
        lines.push(`- ${io.address} (${io.type}): ${io.name} — ${io.description}`);
    });
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
//# sourceMappingURL=kimiService.js.map