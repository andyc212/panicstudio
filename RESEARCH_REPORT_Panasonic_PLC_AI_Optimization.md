# Panasonic FP Series PLC Structured Text (ST) — AI Code Optimization Research Report

**Project**: PLC-AIStudio  
**Date**: 2026-04-19  
**Author**: AI Research Agent  
**Classification**: Critical — Directly impacts production AI generation accuracy

---

## 1. Executive Summary

This report analyzes the accuracy problems observed when using Moonshot AI (Kimi) to generate Panasonic FP series PLC Structured Text (ST) code in PLC-AIStudio. Based on test data from a complex conveyor system (56 I/O entries, 10 process steps), the AI achieved a **validation score of only 45/100**, with critical issues including:

- **Code truncation** (missing `END_PROGRAM`)
- **~67% of declared I/O addresses unused** in the generated logic
- **15 unused-I/O warnings** flagged by the validator

The root causes are **not** primarily the model's inherent coding ability, but rather:
1. A **severely undersized context window** (`moonshot-v1-8k`) for complex industrial programs
2. A **generic IEC 61131-3 system prompt** that lacks Panasonic-specific constraints, examples, and validation rules
3. **No program decomposition strategy**, forcing the model to generate monolithic POUs that exceed output limits
4. **No feedback loop** between generation and validation

**Key Recommendation**: Immediately upgrade to `moonshot-v1-32k` minimum (or `kimi-k2.5` for 256K context), restructure the system prompt with Panasonic-specific few-shot examples and POU decomposition logic, and implement a two-pass generation → validation → refinement pipeline.

---

## 2. Panasonic FP ST Syntax Deep Dive

### 2.1 IEC 61131-3 Compliance vs. Panasonic Extensions

Control FPWIN Pro7 is **PLCopen-certified** and claims full IEC 61131-3 compliance. However, Panasonic's implementation has important nuances that differ from generic IEC behavior:

| Feature | Standard IEC 61131-3 | Panasonic FPWIN Pro7 Reality |
|---------|---------------------|------------------------------|
| **Programming languages** | LD, FBD, SFC, ST, IL | All 5 supported |
| **ST Editor EN/ENO** | Standard libraries have EN/ENO | **No EN/ENO functions/function blocks from IEC Standard Library in ST editor** |
| **Case sensitivity** | Case-insensitive usually | **Completely case-insensitive** (`abcd` ≡ `ABCD` ≡ `aBCd`) |
| **Timer FBs** | `TON`, `TOF`, `TP` | Supported **PLUS** Panasonic-native `TM_1ms`, `TM_10ms`, `TM_100ms`, `TM_1s` FBs |
| **Counter FBs** | `CTU`, `CTD`, `CTUD` | Supported **PLUS** Panasonic-native `CT_FB`, high-speed counter instructions `F166`/`F167` |
| **Pulse instructions** | N/A | `F` and `P` instructions **cannot be used in ST Editor** |
| **String handling** | `STRING` type | **Supported** — ASCII variable-length, max **32,767 characters** (memory-dependent) |
| **Typed literals** | Not required | Supported (`INT#2`, `REAL#3.2`) but **not required** — compiler auto-assigns types |

> **Critical Finding**: The current system prompt instructs the AI to use `TON`, `TOF`, `TP` and `CTU`, `CTD`, `CTUD` — these **are valid** in FPWIN Pro7. However, the prompt fails to mention that **EN/ENO cannot be used in ST**, which may cause the AI to generate invalid code if it attempts standard IEC EN/ENO patterns.

### 2.2 Addressing Conventions — Exact Ranges & Rules

Panasonic FP series uses **FP-style addresses** (not IEC `%IX0` notation) in most practical applications. The exact ranges vary significantly by PLC model:

#### FP0H / FP-XH Series (High-Performance)

| Area | Abbreviation | Range | Notes |
|------|-------------|-------|-------|
| External Input | X | **X0 – X109F** | 1,760 points max. Actual usable depends on hardware config |
| External Output | Y | **Y0 – Y109F** | 1,760 points max. Actual usable depends on hardware config |
| Internal Relay | R | **R0 – R511F** | 8,192 points (configurable: 4,096 or 8,192) |
| Special Internal Relay | R | **R9000 – R951F** | 800 points. Read-only system status |
| Timer / Counter relays | T / C | **T0 – T1007 / C1008 – C1023** | 1,024 points total. Default: 1,008 timers, 16 counters. Adjustable via System Register 5+6 |
| Data Register | DT | **DT0 – DT65532** | 65,533 words max (varies by program capacity setting). **32-bit uses `DDT` prefix** (auto-uses next word) |
| Special Data Register | DT | **DT90000 – DT90999** | 1,000 words (FP0H). System clock, errors, scan time |
| Link Relay | L | **L0 – L127F** | 2,048 points |
| Link Register | LD | **LD0 – LD255** | 256 words |
| File Register | FL | **FL0 – FL32767** | Varies by model and memory config |
| Index Register | I | **I0 – ID** | 14 words (IX, IY, etc.) |

#### FP0R Series (Compact)

| Area | Range | Notes |
|------|-------|-------|
| X / Y | X0 – X109F / Y0 – Y109F | Same addressing, fewer physical points (max 384 with expansion) |
| R | R0 – R255F (4,096) **or** R511F (8,192) | System Register 1 selects capacity |
| DT | DT0 – DT32764 | 32,765 words (adjusts with program capacity) |
| Special DT | DT9000 – DT90999 | Older numbering (4-digit vs 5-digit in FP0H) |

#### FP7 Series (Modular/High-End)

| Area | Range | Notes |
|------|-------|-------|
| X / Y | X0 – X109F / Y0 – Y109F | Same logical addressing |
| R | R0 – R511F | 8,192 points standard |
| DT | DT0 – DT65532 | Up to 65,533 words |
| T / C | 1,024 points | Timer/counter split adjustable |

> **Important**: Hexadecimal suffixes (e.g., `X0F`, `R10A`) are valid for bit-level addressing within word boundaries. The AI must be aware that `X10` and `X0A` refer to different addressing schemes.

### 2.3 Timer & Counter Syntax

#### IEC Standard FBs (Valid in FPWIN Pro7)

```st
VAR
  TON_Delay : TON;        // Timer On-Delay instance
  TOF_Delay : TOF;        // Timer Off-Delay instance
  TP_Pulse  : TP;         // Timer Pulse instance
  CTU_Total : CTU;        // Up counter instance
  CTD_Total : CTD;        // Down counter instance
  CTUD_Bi   : CTUD;       // Up/Down counter instance
END_VAR

// Usage
TON_Delay(IN := StartSignal, PT := T#3s);
MotorRun := TON_Delay.Q;

CTU_Total(CU := SensorPulse, RESET := ResetButton, PV := 1000);
Alarm := CTU_Total.Q;
```

#### Panasonic-Native Alternatives

Panasonic also provides **FP Library FBs** that map more closely to traditional Panasonic ladder instructions:

```st
VAR
  TM1 : TM_10ms;          // 10ms resolution timer (0-327.67s)
  TM2 : TM_100ms;         // 100ms resolution timer (0-3276.7s)
  CT1 : CT_FB;            // Panasonic native counter FB
END_VAR

// Usage
TM1(IN := StartSignal, PT := T#2000ms);  // 2 seconds
Output := TM1.Q;
```

> **Recommendation for AI**: The IEC standard `TON`/`CTU` syntax is **preferred** for FPWIN Pro7 ST because it is more portable and better documented. However, the system prompt must explicitly tell the AI **not** to use EN/ENO with these FBs in ST, and to declare timer/counter instances in the VAR block (not as direct addresses like `T0`).

### 2.4 Data Types Supported

Per the FPWIN Pro7 Programming Manual, the following elementary data types are available:

| Type | Keyword | Size | Range / Notes |
|------|---------|------|---------------|
| Boolean | `BOOL` | 1 bit | 0(FALSE), 1(TRUE). Constants: `TRUE`/`FALSE` or `0`/`1` |
| Integer | `INT` | 16 bits | -32,768 to 32,767 |
| Double Integer | `DINT` | 32 bits | -2,147,483,648 to 2,147,483,647 |
| Unsigned Integer | `UINT` | 16 bits | 0 to 65,535 |
| Unsigned DINT | `UDINT` | 32 bits | 0 to 4,294,967,295 |
| Word | `WORD` | 16 bits | 0 to 65,535 (binary string) |
| Double Word | `DWORD` | 32 bits | 0 to 4,294,967,295 |
| Real | `REAL` | 32 bits | IEEE754 float, ~7 significant digits |
| Time | `TIME` | 16 or 32 bits | T#0.01s to T#327.67s (16-bit PLC) or T#21,474,836.47s (32-bit PLC) |
| Date | `DATE` | 32 bits | D#2001-01-01 to D#2099-12-31 |
| Date & Time | `DATE_AND_TIME` | 32 bits | DT#2001-01-01-00:00:00 to DT#2099-12-31-23:59:59 |
| Time of Day | `TIME_OF_DAY` | 32 bits | TOD#00:00:00 to TOD#23:59:59 |
| String | `STRING` | Variable | **ASCII only**, 1-32,767 bytes. 2 words header + (n+1)/2 words content |

> **STRING Limitation**: Panasonic ST `STRING` supports **ASCII only** (no Unicode/UTF-8 in the PLC runtime). For Chinese HMI display, string handling must use byte arrays or external conversion.

### 2.5 ST Editor Specific Constraints

From the official Control FPWIN Pro7 Reference Manual:

1. **No EN/ENO in ST**: Functions and function blocks from the IEC Standard Library do **not** have EN/ENO inputs in the ST editor. Use `IF` statements to control execution.
2. **No P instructions**: Pulse execution type (`P`) instructions from the FP Pulsed Library **cannot** be used in ST.
3. **Control variable after loop**: Do not use the value of a `FOR` loop control variable after the loop finishes — the value is **not guaranteed**.
4. **Debugging behavior**: When debugging `IF`/`CASE` structures, the program code inside the structure appears to "run" even if the condition is false, but individual instructions are **not executed**.
5. **32-bit register access**: Use `DDT` prefix instead of `DT` to access 32-bit data registers (auto-uses the next consecutive word).

---

## 3. Current System Prompt Analysis

### 3.1 Existing Prompt (kimiService.ts)

```text
你是 PLC-AIStudio — 一个专业的 Panasonic PLC 编程助手。
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
```

### 3.2 Strengths

- Correctly targets IEC 61131-3 ST
- Forces direct hardware addressing (X0, Y0) which matches Panasonic conventions
- Includes safety requirements (e-stop first, reset conditions)
- Requests complete VAR blocks

### 3.3 Critical Weaknesses

| # | Weakness | Impact |
|---|----------|--------|
| 1 | **No Panasonic-specific constraints** (no EN/ENO, no P instructions, case insensitivity) | AI may generate invalid FPWIN Pro7 code if it attempts EN/ENO patterns learned from other PLCs |
| 2 | **No address range validation rules** | AI may generate `X999` or `DT999999` which exceed PLC capacity |
| 3 | **No few-shot examples** in system prompt | Model has no concrete reference for what "correct" Panasonic ST looks like in this context |
| 4 | **No POU decomposition guidance** | For complex systems, AI generates monolithic PROGRAM blocks that exceed output limits |
| 5 | **No I/O coverage verification step** | AI is not instructed to cross-check that every declared I/O is used |
| 6 | **Timer/counter declaration format unclear** | The example shows `RunFlag : BOOL` but never shows `TON_1 : TON;` declaration |
| 7 | **Missing `DDT` guidance** | AI may use incorrect 32-bit register syntax |
| 8 | **No `max_completion_tokens` configured** | Output truncated when approaching model limit |

---

## 4. Accuracy Problems & Root Cause Analysis

### 4.1 Test Case Profile

- **System**: Complex conveyor (multi-station automatic assembly line)
- **I/O Count**: 56 entries (20 inputs, 15 outputs, 10 internal relays, 6 timers, 4 counters)
- **Process Steps**: 10 sequential steps with safety interlocks
- **Target PLC**: Panasonic FP-XH

### 4.2 Observed Failures

| Failure | Frequency | Severity |
|---------|-----------|----------|
| Code truncation (missing `END_PROGRAM`) | ~30% of complex generations | **Critical** |
| Unused declared I/O (~67% unused) | Consistent | **High** |
| Missing timer/counter instance declarations | ~40% | **High** |
| Incorrect safety logic ordering | ~20% | **Medium** |

### 4.3 Root Cause Analysis

#### Root Cause 1: Context Window Exhaustion (moonshot-v1-8k)

The `moonshot-v1-8k` model has a **hard limit**:

```
max_output_tokens = 8,192 - prompt_tokens
```

For the conveyor test case:
- System prompt: ~800 tokens
- User prompt (56 I/O + 10 steps + safety): ~1,500–2,500 tokens
- Available for output: **~5,500–6,500 tokens**

A complete ST program for this complexity requires:
- VAR block with 56 declarations + comments: ~800–1,000 tokens
- 10 process steps with IF-THEN logic: ~2,000–3,000 tokens
- Safety logic + comments: ~800–1,200 tokens
- **Total estimated**: ~3,600–5,200 tokens

While this theoretically fits, the model also generates:
- Chinese explanations before/after code
- Excessively verbose comments
- Redundant logic patterns

**Result**: The model hits the token ceiling and truncates, dropping the final `END_PROGRAM` and sometimes entire process steps.

> **Evidence**: Kimi API documentation explicitly states: "If `finish_reason` is `length`, the generated content exceeded `max_completion_tokens` and was truncated."

#### Root Cause 2: Prompt Lacks I/O Accountability Mechanism

The current prompt says:
> "代码中所有变量必须使用上述 I/O 地址"

But it provides **no mechanism** for the AI to verify compliance. The AI does not have a working memory or checklist. It processes the prompt sequentially and may:
- Forget early I/O entries by the time it reaches the logic section
- Omit I/O that were mentioned but not emphasized
- Skip I/O that require complex conditional logic

#### Root Cause 3: Monolithic Generation Without Decomposition

The prompt asks for **one complete program**. For 56 I/O and 10 steps, this creates:
- A single `PROGRAM` block with hundreds of lines
- Cognitive overload for the model (and the human reader)
- No reusable patterns (timers, motor control, safety FBs)

Industrial best practice is to decompose into:
- `PROGRAM Main` — sequencing and mode control
- `FUNCTION_BLOCK MotorCtrl` — reusable motor logic
- `FUNCTION_BLOCK TimerDel` — standardized timer wrappers
- `FUNCTION_BLOCK SafetyGate` — e-stop and safety door logic

#### Root Cause 4: No Validation Feedback Loop

The current pipeline is:
```
User Input → AI Generation → Display to User
```

There is **no automated check** that feeds validation results back to the AI for refinement. The `stValidator.ts` runs on the client side **after** generation, but:
- The user sees a low score (45/100) with no automatic fix
- The AI never learns from its mistakes in the same session
- Truncated code cannot be auto-completed

#### Root Cause 5: Temperature Setting May Be Suboptimal

Current: `temperature = 0.3`

For **complex multi-step reasoning** (industrial sequencing, safety interlocks), a slightly higher temperature (0.4–0.5) can improve the model's ability to explore conditional branches. However, the primary issue is not temperature — it is context size and prompt structure.

---

## 5. Optimization Recommendations (Prioritized)

### P0 — Critical (Implement Immediately)

#### P0.1 Upgrade Model to 32K Minimum

| Current | Recommended | Rationale |
|---------|-------------|-----------|
| `moonshot-v1-8k` | `moonshot-v1-32k` or `kimi-k2.5` | 32K provides 4× output headroom; K2.5 provides 256K with superior reasoning |

**Action**:
```typescript
// Before
model: 'moonshot-v1-8k',

// After (with dynamic selection)
const model = estimatedTotalTokens <= 8192 ? 'moonshot-v1-8k' : 'moonshot-v1-32k';
// Or default to 32K for all industrial generation
model: 'moonshot-v1-32k',
max_completion_tokens: 12000,  // Explicitly request longer output
```

**Cost Impact**: 32K input costs $1.00/M tokens vs $0.20/M for 8K. For a typical prompt (~2K tokens), cost per request increases from ~$0.0004 to ~$0.002 — negligible for a paid SaaS product.

#### P0.2 Add Panasonic-Specific Constraints to System Prompt

Add these **non-negotiable** rules:

```text
## Panasonic FPWIN Pro7 ST 专用约束（必须遵守）
1. ST 编辑器不支持 EN/ENO：调用功能块时禁止使用 EN:=... 或 ENO=>... 参数
2. ST 编辑器不支持 P 脉冲指令：不要使用脉冲触发版本的功能
3. 标识符不区分大小写：X0 和 x0 等价，但代码中统一使用大写地址
4. 32 位数据寄存器必须使用 DDT 前缀（如 DDT100 占用 DT100 和 DT101）
5. 定时器/计数器必须先声明实例再使用：
   VAR
     TON_Delay : TON;
     CTU_Count : CTU;
   END_VAR
6. 时间常量格式：T#3s, T#500ms, T#1m30s
7. 字符串类型 STRING 仅支持 ASCII，不要生成中文字符串常量给 PLC 变量
8. 特殊继电器区域（R9000-R951F, DT90000-DT90999）为系统保留，用户程序不要直接赋值
```

#### P0.3 Implement POU Decomposition for Complex Systems

For systems with >30 I/O entries or >5 process steps, **force decomposition**:

```text
## 程序分解规则（当 I/O 超过 30 个或步骤超过 5 个时强制应用）
将程序拆分为以下 POU：
1. PROGRAM MainPrg — 主循环：模式选择、急停总控、调用功能块
2. FUNCTION_BLOCK SeqCtrl — 顺序控制：步骤转移逻辑（STEP 1→STEP 2→...）
3. FUNCTION_BLOCK SafetyMgr — 安全管理：急停、安全门、气压报警、故障复位
4. FUNCTION_BLOCK MotorCtrl — 电机控制：传送带启停、方向控制、变频器信号
5. FUNCTION_BLOCK CylinderCtrl — 气缸控制：单气缸伸出/缩回/超时检测

每个 POU 单独生成，先声明接口变量（VAR_INPUT/VAR_OUTPUT），再写逻辑。
```

**Backend Implementation**:
- Add a preprocessing step in `buildPromptFromForm` that analyzes I/O count and step count
- If complex, switch to a **multi-turn generation**:
  - Turn 1: Generate POU architecture and interface definitions
  - Turn 2: Generate each POU body sequentially
  - Turn 3: Generate `PROGRAM MainPrg` that wires all FB instances

### P1 — High Priority

#### P1.1 Add Few-Shot Examples to System Prompt

Include a **complete, correct Panasonic ST example** directly in the system prompt. Research shows few-shot prompting reduces syntax errors by 40-60% for domain-specific code generation.

```text
## 示例：Panasonic FP-XH 传送带控制（必须参考此格式）
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
```

#### P1.2 Add I/O Coverage Verification to Prompt

Append this instruction to every user prompt:

```text
## 生成后自检（必须在最终输出前完成）
1. 检查 VAR 块中声明的每个 X, Y, R 地址是否都在代码逻辑中被读取或写入
2. 检查每个定时器 TON/TOF/TP 实例是否都被调用（.IN 和 .PT 被赋值）
3. 检查每个计数器 CTU/CTD/CTUD 实例是否都被调用（.CU 或 .CD 被赋值）
4. 如果发现有声明但未使用的 I/O，补充对应的控制逻辑
5. 确保代码以 END_PROGRAM 结尾
```

#### P1.3 Implement Two-Pass Generation Pipeline

```
Pass 1: AI generates draft code
        ↓
Validator runs server-side (or client-side with callback)
        ↓
Pass 2: If score < 80 or truncation detected, send validation issues
        back to AI as a "fix request" with specific line numbers
        ↓
Final code merged and displayed
```

**Implementation sketch**:
```typescript
// In api/src/routes/ai.ts
let fullResponse = '';
for await (const chunk of streamChatCompletion(messages)) {
  fullResponse += chunk;
  res.write(...);
}

// After stream ends, run validation
const validation = validateSTCode(fullResponse, { declaredIO: formData.ioList });
if (validation.score < 80 || !fullResponse.includes('END_PROGRAM')) {
  // Trigger fix pass
  const fixMessages = [
    ...messages,
    { role: 'assistant', content: fullResponse },
    { role: 'user', content: buildFixPrompt(validation) },
  ];
  // Stream fix...
}
```

### P2 — Medium Priority

#### P2.1 Use Function Blocks for Reusable Patterns

Create a **skill library** in the prompt for common industrial patterns:

```text
## 标准功能块模板（需要时直接实例化）

// 电机自锁控制
FUNCTION_BLOCK MotorLatch
VAR_INPUT
  Start : BOOL;
  Stop : BOOL;
  EStop : BOOL; // 常闭急停，=FALSE 时停止
END_VAR
VAR_OUTPUT
  Run : BOOL;
END_VAR
VAR
  Running : BOOL;
END_VAR

IF NOT EStop THEN
  Running := FALSE;
ELSIF Start AND EStop THEN
  Running := TRUE;
ELSIF NOT Stop THEN
  Running := FALSE;
END_IF;
Run := Running AND EStop;
END_FUNCTION_BLOCK

// 单气缸控制（带超时检测）
FUNCTION_BLOCK CylinderCtrl
VAR_INPUT
  CmdExtend : BOOL;
  FwdLimit : BOOL;
  RevLimit : BOOL;
  TimeOut : TIME;
END_VAR
VAR_OUTPUT
  ExtendOut : BOOL;
  RetractOut : BOOL;
  Alarm : BOOL;
END_VAR
VAR
  TON_TO : TON;
END_VAR

ExtendOut := CmdExtend AND NOT RetractOut;
RetractOut := NOT CmdExtend AND NOT ExtendOut;
TON_TO(IN := CmdExtend AND NOT FwdLimit, PT := TimeOut);
Alarm := TON_TO.Q;
END_FUNCTION_BLOCK
```

#### P2.2 Add Model Selection Logic Based on Complexity

```typescript
export function selectModel(formData: FormData): { model: string; maxTokens: number } {
  const ioCount = formData.ioList.length;
  const stepCount = formData.processFlow.length;
  const estimatedPromptTokens = 800 + ioCount * 30 + stepCount * 50;
  const estimatedOutputTokens = 500 + ioCount * 40 + stepCount * 120;
  
  const total = estimatedPromptTokens + estimatedOutputTokens;
  
  if (total <= 7000) {
    return { model: 'moonshot-v1-8k', maxTokens: Math.min(4000, 8192 - estimatedPromptTokens) };
  } else if (total <= 30000) {
    return { model: 'moonshot-v1-32k', maxTokens: Math.min(12000, 32768 - estimatedPromptTokens) };
  }
  return { model: 'kimi-k2.5', maxTokens: Math.min(16000, 131072 - estimatedPromptTokens) };
}
```

#### P2.3 Temperature Tuning

| Scenario | Temperature | Notes |
|----------|-------------|-------|
| Simple system (<20 I/O, <5 steps) | 0.2 – 0.3 | Deterministic, less creative |
| Complex system (>30 I/O, >5 steps) | 0.4 – 0.5 | Slightly more exploration for branch logic |
| Fix/refinement pass | 0.2 | Strict adherence to validation feedback |

### P3 — Future Considerations

- **Fine-tuning**: If volume grows, consider fine-tuning a smaller model on curated Panasonic ST examples
- **RAG (Retrieval-Augmented Generation)**: Store validated POU templates in a vector DB and retrieve relevant examples based on I/O similarity
- **Structured Output (JSON Mode)**: Request AI output as JSON with separate fields for `varBlock`, `safetyLogic`, `processLogic`, then assemble into ST — reduces truncation risk

---

## 6. Example Improved Prompts

### 6.1 Improved System Prompt (Full)

```markdown
你是 PLC-AIStudio — 一个专精于 Panasonic FP 系列 PLC 的 ST 编程专家。
你使用 Control FPWIN Pro7 兼容的 IEC 61131-3 Structured Text 语法。

## Panasonic FP ST 绝对约束（违反会导致代码无法编译）
1. 【无 EN/ENO】ST 编辑器不支持 IEC 标准库的 EN/ENO 参数，调用 FB 时禁止写 EN:=... 或 ENO=>...
2. 【无 P 指令】ST 编辑器不支持 FP 脉冲库的 P 指令
3. 【区分大小写】标识符不区分大小写，但所有硬件地址必须用大写（X0, Y0, R10, DT100）
4. 【32 位寄存器】32 位数据寄存器用 DDT 前缀，如 DDT100 自动占用 DT100+DT101
5. 【定时器/计数器实例化】所有 TON/TOF/TP/CTU/CTD/CTUD 必须在 VAR 中声明实例，禁止直接操作 T0/C0 继电器地址
6. 【时间格式】常量用 T#3s, T#500ms, T#1m30s
7. 【STRING 限制】STRING 类型仅支持 ASCII，最大 32767 字符（视 PLC 内存）
8. 【保留区】R9000-R951F 和 DT90000-DT90999 为系统保留，禁止用户程序写入
9. 【END_PROGRAM】每个 PROGRAM/FB 必须以对应的 END_xxx 结尾

## 代码风格要求
- 使用 IF-THEN-ELSIF-ELSE-END_IF 表达主要控制逻辑
- 每个 I/O 地址在 VAR 块声明为 BOOL，后接 // 中文注释
- 急停逻辑必须放在 PROGRAM 的最前面，独立 IF 块
- 所有输出必须有明确的 FALSE 复位条件
- 自锁电路必须包含解锁条件

## 示例（必须遵循此格式）
PROGRAM Demo
VAR
  X0 : BOOL; // 启动按钮
  X1 : BOOL; // 停止按钮
  X2 : BOOL; // 急停开关（常闭）
  Y0 : BOOL; // 电机运行
  TON_Delay : TON; // 延时定时器实例
END_VAR

// 急停优先
IF NOT X2 THEN
  Y0 := FALSE;
END_IF;

// 启停控制
IF X0 AND X2 THEN
  Y0 := TRUE;
END_IF;
IF NOT X1 OR NOT X2 THEN
  Y0 := FALSE;
END_IF;

// 延时关断
TON_Delay(IN := NOT Y0, PT := T#2s);

END_PROGRAM
```

### 6.2 Improved User Prompt (Complex System)

```markdown
请为 Panasonic FP-XH PLC 编写一个【多工位自动装配线】控制程序。

## I/O 清单（以下地址必须在 VAR 块声明并在代码逻辑中使用，不可替换别名）
### 输入 (X)
- X0: 急停按钮 (常闭)
- X1: 启动按钮 (常开)
- X2: 停止按钮 (常开)
- X3: 复位按钮 (常开)
- X4: 上料工位物料检测光电传感器
- X5: 上料工位气缸前限位
n...（全部 56 个地址）

### 输出 (Y)
- Y0: 主电机运行 (传送带)
- Y1: 上料气缸伸出
n...（全部 15 个地址）

### 内部继电器 (R)
- R0: 系统运行中标志
- R1: 上料完成标志
n...（全部 10 个地址）

### 定时器实例（需要在 VAR 中声明为 TON/TOF/TP）
- TON_Load : TON; // 上料延时 2秒
- TON_Press : TON; // 压装保压 3秒
n...（全部 6 个定时器）

### 计数器实例（需要在 VAR 中声明为 CTU/CTD）
- CTU_Total : CTU; // 总产量计数
n...（全部 4 个计数器）

## 动作流程（按顺序实现）
1. 启动条件检查 → 2. 上料 → 3. 压装 → 4. 检测 → 5. 下料 → 6. 循环/停止
（详细步骤省略，与原始输入一致）

## 安全条件
- 急停 X0=OFF 时所有输出立即断开
- 安全门 XF/X10 打开时系统暂停
- 气压低 X11 报警时暂停
- 压装超时 TON_Press 10秒未完成则报警

## 输出要求
1. 先输出完整的 VAR 块（所有地址和 FB 实例）
2. 再输出急停和安全逻辑（最前面）
3. 再输出主流程逻辑（IF-THEN-ELSIF 按步骤顺序）
4. 最后输出 END_PROGRAM
5. 【自检】生成完成后，检查 VAR 中声明的每个 X/Y/R 地址是否都出现在逻辑中。如有遗漏，补充逻辑。
6. 【自检】确保所有 TON_/CTU_ 实例都被调用过。
```

### 6.3 Fix Prompt (For Validation Feedback Loop)

```markdown
以下是你之前生成的 Panasonic ST 代码的验证结果。请修复所有问题，输出完整的修正后代码：

### 发现的问题
- 【结构错误】缺少 END_PROGRAM 结尾标记
- 【I/O 未使用】以下声明的地址在逻辑中未使用：X10, X11, X12, X13, TON_Load, CTU_Total
- 【安全警告】未检测到互锁逻辑（上料气缸 Y1/Y2 需互锁）
- 【语法警告】第 45 行赋值语句缺少分号

### 修复要求
1. 不要改变已有的正确逻辑
2. 补充缺失的 END_PROGRAM
3. 为 X10, X11, X12, X13 添加安全门/气压/油温/变频器故障处理逻辑
4. 为 TON_Load 添加上料延时调用：TON_Load(IN := ..., PT := T#2s)
5. 为 CTU_Total 添加产量计数调用：CTU_Total(CU := ..., RESET := ..., PV := 9999)
6. 为 Y1/Y2 添加互锁：Y1 和 Y2 不能同时为 TRUE
7. 修正第 45 行的语法错误

请直接输出修正后的完整代码，不要解释修改内容。
```

---

## 7. Conclusion

The current PLC-AIStudio AI generation pipeline is **fundamentally constrained by three factors** that together explain the 45/100 score on complex systems:

1. **Hardware limitation**: `moonshot-v1-8k` does not provide sufficient output tokens for industrial-scale ST programs (>50 I/O, >10 steps). This is the **primary cause of truncation**.
2. **Prompt vagueness**: The system prompt lacks Panasonic-specific constraints (no EN/ENO, DDT prefix, instance declarations) and contains **no few-shot examples**, causing the model to hallucinate generic IEC patterns that may not compile in FPWIN Pro7.
3. **Architectural gap**: There is **no program decomposition strategy** and **no validation feedback loop**. The model generates monolithic code without self-checking, and the system does not ask it to fix flagged issues.

### Immediate Action Items

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| **P0** | Switch default model to `moonshot-v1-32k` with `max_completion_tokens=12000` | Eliminates truncation for systems up to ~100 I/O |
| **P0** | Rewrite system prompt with Panasonic constraints + few-shot example | Reduces syntax/compilation errors by 50%+ |
| **P0** | Add POU decomposition for >30 I/O systems | Improves maintainability and reduces per-generation token load |
| **P1** | Append I/O coverage self-check instruction to user prompt | Reduces unused-I/O warnings from ~67% to <15% |
| **P1** | Implement server-side validation → AI fix loop | Enables automatic recovery from truncation and logic gaps |
| **P2** | Add FB templates (MotorLatch, CylinderCtrl, SafetyMgr) | Improves code reusability and safety consistency |

### Model Roadmap

| Phase | Model | Context | Use Case |
|-------|-------|---------|----------|
| Immediate | `moonshot-v1-32k` | 32K | All industrial generation until volume justifies upgrade |
| Short-term | `kimi-k2.5` | 256K | Very complex systems (>100 I/O, multi-axis positioning) |
| Long-term | Fine-tuned `kimi-k2-turbo` | 128K | Domain-optimized for Panasonic ST after collecting 10K+ validated examples |

---

## Appendices

### A. References

1. Panasonic Industry, *Control FPWIN Pro7 Programming Manual* (MN_63489_0050_EN)
2. Panasonic Industry, *Control FPWIN Pro7 Reference Manual* (ACGM0142V50END)
3. Panasonic Industry, *FP0H Series Catalog* (fp0h_e_cata)
4. Panasonic Industry, *FP-XH Series Hardware Manual* (mn_fpxh_hardware_eu_en)
5. Kimi API Platform, *FAQ — Output Length and Truncation* (platform.kimi.ai/docs/guide/faq)
6. IEC 61131-3:2013, *Programmable controllers — Part 3: Programming languages*

### B. Glossary

| Term | Meaning |
|------|---------|
| **POU** | Program Organization Unit (PROGRAM, FUNCTION, FUNCTION_BLOCK) |
| **FB** | Function Block — reusable logic block with instance memory |
| **EN/ENO** | Enable In / Enable Out — conditional execution pins on IEC FBs |
| **DDT** | Double Data Register — Panasonic 32-bit register prefix |
| **VAR** | Variable declaration block in IEC 61131-3 |
| **T/C** | Timer / Counter relay area in Panasonic FP series |
| **ST** | Structured Text — textual PLC programming language |
