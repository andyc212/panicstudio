// IEC 61131-3 ST 代码验证器
// 自动检查 AI 生成代码的健康度

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: 'syntax' | 'io' | 'safety' | 'structure';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface ValidationContext {
  declaredIO: Array<{ address: string; name: string; type: 'INPUT' | 'OUTPUT' }>;
  plcModel?: string;
  requiredSafetyConditions?: string[];
}

export function validateSTCode(code: string, context?: ValidationContext): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = code.split('\n');

  // === 1. 结构检查 ===
  const hasProgramBlock = /\bPROGRAM\s+\w+/i.test(code);
  const hasEndProgram = /\bEND_PROGRAM\b/i.test(code);
  const hasVarBlock = /\bVAR\b/i.test(code);
  const hasEndVar = /\bEND_VAR\b/i.test(code);

  if (!hasProgramBlock) {
    issues.push({
      id: 'struct-1',
      severity: 'error',
      category: 'structure',
      message: '缺少 PROGRAM 程序块声明',
      suggestion: '在代码开头添加 PROGRAM ProgramName',
    });
  }

  if (!hasEndProgram) {
    issues.push({
      id: 'struct-2',
      severity: 'error',
      category: 'structure',
      message: '缺少 END_PROGRAM 结束标记',
      suggestion: '在代码末尾添加 END_PROGRAM',
    });
  }

  if (!hasVarBlock) {
    issues.push({
      id: 'struct-3',
      severity: 'warning',
      category: 'structure',
      message: '缺少 VAR 变量声明块',
      suggestion: '建议声明所有使用的变量，如 VAR_INPUT / VAR_OUTPUT',
    });
  }

  if (hasVarBlock && !hasEndVar) {
    issues.push({
      id: 'struct-4',
      severity: 'error',
      category: 'structure',
      message: 'VAR 块缺少 END_VAR 关闭标记',
      suggestion: '在变量声明后添加 END_VAR',
    });
  }

  // === 2. 语法检查 ===
  let parenCount = 0;
  let bracketCount = 0;

  lines.forEach((line, idx) => {
    // 跳过注释和空行
    const codeLine = line.replace(/\/\/.*$/, '').replace(/\(\*.*?\*\)/g, '').trim();
    if (!codeLine) return;

    for (const char of codeLine) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }

    // 检查未闭合的字符串
    const singleQuotes = (codeLine.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      issues.push({
        id: `syntax-${idx}`,
        severity: 'error',
        category: 'syntax',
        message: `第 ${idx + 1} 行：字符串引号未闭合`,
        line: idx + 1,
        suggestion: '检查字符串常量的引号配对',
      });
    }

    // 检查赋值语句是否有分号
    if (codeLine.includes(':=') && !codeLine.endsWith(';')) {
      issues.push({
        id: `syntax-semi-${idx}`,
        severity: 'warning',
        category: 'syntax',
        message: `第 ${idx + 1} 行：赋值语句可能缺少分号`,
        line: idx + 1,
        suggestion: 'IEC 61131-3 语句通常以分号结束',
      });
    }
  });

  if (parenCount !== 0) {
    issues.push({
      id: 'syntax-paren',
      severity: 'error',
      category: 'syntax',
      message: `括号未闭合（多出 ${parenCount > 0 ? parenCount : -parenCount} 个）`,
      suggestion: '检查所有圆括号的配对',
    });
  }

  if (bracketCount !== 0) {
    issues.push({
      id: 'syntax-bracket',
      severity: 'error',
      category: 'syntax',
      message: `方括号未闭合（多出 ${bracketCount > 0 ? bracketCount : -bracketCount} 个）`,
      suggestion: '检查所有方括号的配对',
    });
  }

  // === 3. I/O 地址检查 ===
  if (context?.declaredIO && context.declaredIO.length > 0) {
    const declaredAddresses = new Set(context.declaredIO.map((io) => io.address.toUpperCase()));
    const usedAddresses = new Set<string>();

    // 提取代码中使用的地址（X0, Y1, DT100 等）
    // 要求：XYRDT 开头，后面至少跟一个数字，避免匹配 THEN、TRUE、RUNFLAG 等关键字
    const addressRegex = /\b([XYRDT]\d+\w*)\b/gi;
    let match;
    while ((match = addressRegex.exec(code)) !== null) {
      usedAddresses.add(match[1].toUpperCase());
    }

    usedAddresses.forEach((addr) => {
      if (!declaredAddresses.has(addr)) {
        issues.push({
          id: `io-${addr}`,
          severity: 'warning',
          category: 'io',
          message: `使用了未声明的地址 ${addr}`,
          suggestion: `在 I/O 清单中添加 ${addr} 的定义`,
        });
      }
    });

    // 检查声明的 I/O 是否被使用
    context.declaredIO.forEach((io) => {
      if (!usedAddresses.has(io.address.toUpperCase())) {
        issues.push({
          id: `io-unused-${io.address}`,
          severity: 'info',
          category: 'io',
          message: `声明的地址 ${io.address} (${io.name}) 在代码中未使用`,
          suggestion: '确认是否需要此 I/O，或在逻辑中使用它',
        });
      }
    });
  }

  // === 4. 安全条件检查 ===
  if (context?.requiredSafetyConditions) {
    const codeLower = code.toLowerCase();

    // 检查急停逻辑
    const hasEStop = /e_stop|estop|emergency|急停/i.test(code);
    if (!hasEStop && context.requiredSafetyConditions.some((c) => c.includes('急停'))) {
      issues.push({
        id: 'safety-estop',
        severity: 'error',
        category: 'safety',
        message: '未检测到急停（E-Stop）逻辑',
        suggestion: '添加急停输入检测，急停触发时切断所有输出',
      });
    }

    // 检查互锁逻辑
    const hasInterlock = /interlock|互锁|互鎖/i.test(code) ||
      (codeLower.includes('and not') && codeLower.includes('or not'));
    if (!hasInterlock && context.requiredSafetyConditions.some((c) => c.includes('互锁'))) {
      issues.push({
        id: 'safety-interlock',
        severity: 'warning',
        category: 'safety',
        message: '未检测到互锁逻辑',
        suggestion: '对于正反转、气缸等场景，添加互锁防止同时动作',
      });
    }

    // 检查复位逻辑
    const hasReset = /reset|复位|復位|fault.*false/i.test(code);
    if (!hasReset && context.requiredSafetyConditions.some((c) => c.includes('复位'))) {
      issues.push({
        id: 'safety-reset',
        severity: 'warning',
        category: 'safety',
        message: '未检测到故障复位逻辑',
        suggestion: '故障后需要明确的复位条件才能重新启动',
      });
    }
  }

  // === 5. 常见陷阱检查 ===
  // 检查是否有未初始化的定时器/计数器
  const timerMatches = code.matchAll(/(\w+)\s*\(\s*IN\s*:=/gi);
  for (const tm of timerMatches) {
    const timerName = tm[1];
    if (!new RegExp(`\\b${timerName}\\b.*Q\\b`, 'i').test(code)) {
      issues.push({
        id: `trap-timer-${timerName}`,
        severity: 'info',
        category: 'structure',
        message: `定时器 ${timerName} 的输出 Q 可能未被使用`,
        suggestion: '确认是否需要使用定时器的完成信号',
      });
    }
  }

  // 计算分数
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;

  let score = 100;
  score -= errors * 25;
  score -= warnings * 10;
  score -= infos * 2;
  score = Math.max(0, Math.min(100, score));

  return {
    passed: errors === 0,
    score,
    issues,
    summary: { errors, warnings, infos },
  };
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e'; // green
  if (score >= 70) return '#eab308'; // yellow
  return '#ef4444'; // red
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return '优秀';
  if (score >= 70) return '可用';
  if (score >= 50) return '需检查';
  return '有错误';
}
