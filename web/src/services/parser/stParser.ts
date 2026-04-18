// IEC 61131-3 ST Parser → LD Model
// 支持：直接赋值、IF-THEN-ELSE、定时器、计数器、并联分支

export type LDElementType =
  | 'leftRail'
  | 'rightRail'
  | 'contactNO'
  | 'contactNC'
  | 'coil'
  | 'coilSet'
  | 'coilReset'
  | 'timerTON'
  | 'timerTOF'
  | 'counterCTU'
  | 'horizontalLine'
  | 'verticalLine'
  | 'branch'
  | 'comment';

export interface LDElement {
  id: string;
  type: LDElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  address?: string;
  params?: Record<string, string>;
  sourceLine?: number;
}

export interface LDRung {
  id: number;
  title: string;
  elements: LDElement[];
  width: number;
  height: number;
  sourceLine?: number;
}

interface Condition {
  name: string;
  negated: boolean;
}

export function parseSTtoLD(stCode: string): LDRung[] {
  const rungs: LDRung[] = [];
  const rawLines = stCode.split('\n');
  const lines = rawLines.map((l, idx) => ({ text: l.trim(), lineNumber: idx + 1 })).filter((l) => l.text.length > 0);

  let currentRung = 0;
  let inVarBlock = false;

  // IF-THEN tracking
  let ifCondition: string | null = null;
  let ifOutputs: Array<{ var: string; value: string }> = [];
  let inIfBlock = false;
  let ifLineStart = -1;
  let ifLineNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text;
    const lineNumber = lines[i].lineNumber;

    // Skip VAR blocks
    if (line.toUpperCase().startsWith('VAR') || line.toUpperCase() === 'END_VAR') {
      inVarBlock = line.toUpperCase().startsWith('VAR');
      continue;
    }
    if (inVarBlock) continue;

    // Skip comments and structural keywords
    if (line.startsWith('//') || line.startsWith('(*')) continue;
    if (/^(PROGRAM|END_PROGRAM|FUNCTION|END_FUNCTION|FUNCTION_BLOCK|END_FUNCTION_BLOCK)/i.test(line)) continue;

    // === IF detection ===
    const ifMatch = line.match(/^IF\s+(.+?)\s+THEN$/i);
    if (ifMatch) {
      ifCondition = ifMatch[1].trim();
      ifOutputs = [];
      inIfBlock = true;
      ifLineStart = i;
      ifLineNumber = lineNumber;
      continue;
    }

    // === ELSIF: flush previous, start new ===
    const elsifMatch = line.match(/^ELSIF\s+(.+?)\s+THEN$/i);
    if (elsifMatch && inIfBlock) {
      if (ifCondition && ifOutputs.length > 0) {
        currentRung++;
        rungs.push(...buildRungFromConditions(currentRung, ifCondition, ifOutputs, false, undefined, ifLineNumber));
      }
      ifCondition = elsifMatch[1].trim();
      ifOutputs = [];
      ifLineNumber = lineNumber;
      continue;
    }

    // === ELSE: flush previous, negate for else branch ===
    if (/^ELSE$/i.test(line) && inIfBlock) {
      if (ifCondition && ifOutputs.length > 0) {
        currentRung++;
        rungs.push(...buildRungFromConditions(currentRung, ifCondition, ifOutputs, false, undefined, ifLineNumber));
      }
      // ELSE = negation of all previous conditions in this IF block
      ifCondition = '__ELSE__';
      ifOutputs = [];
      ifLineNumber = lineNumber;
      continue;
    }

    // === END_IF: flush remaining ===
    if (/^END_IF;?$/i.test(line) && inIfBlock) {
      if (ifOutputs.length > 0) {
        currentRung++;
        const isElse = ifCondition === '__ELSE__';
        const cond = isElse && ifLineStart >= 0
          ? extractIfCondition(rawLines, ifLineStart) || 'TRUE'
          : (ifCondition || 'TRUE');
        rungs.push(...buildRungFromConditions(currentRung, cond, ifOutputs, isElse, undefined, ifLineNumber));
      }
      ifCondition = null;
      ifOutputs = [];
      inIfBlock = false;
      ifLineStart = -1;
      continue;
    }

    // === Inside IF block: collect assignments ===
    if (inIfBlock && line.includes(':=')) {
      const [left, right] = line.split(':=').map((s) => s.trim());
      const varName = left.replace(/;/g, '');
      const value = right.replace(/;/g, '');
      ifOutputs.push({ var: varName, value });
      continue;
    }

    // === Direct assignment (outside IF) ===
    if (line.includes(':=') && !line.toUpperCase().includes('IF ')) {
      // Skip timer/counter patterns that also contain ':='
      if (/\w+\s*\(\s*(IN|CU)\s*:=\s*.+\)/i.test(line)) {
        // Let timer/counter patterns handle below
      } else {
        currentRung++;
        const [left, right] = line.split(':=').map((s) => s.trim());
        const outputVar = left.replace(/;/g, '');
        const expr = right.replace(/;/g, '');

        // Self-latch pattern: Y0 := X0 OR Y0
        const isSelfLatch = new RegExp(`\\b${escapeRegex(outputVar)}\\b`, 'i').test(expr);
        let conditions = parseBooleanExpression(expr, isSelfLatch ? undefined : outputVar);

        if (isSelfLatch && conditions.length > 0) {
          // Add self-contact as parallel branch
          conditions = [...conditions, [{ name: outputVar, negated: false }]];
        }

        rungs.push(...buildRungFromConditions(currentRung, null, [{ var: outputVar, value: expr }], false, conditions, lineNumber));
        continue;
      }
    }

    // === Timer instantiation ===
    const timerMatch = line.match(/(\w+)\s*\(\s*IN\s*:=\s*(\w+)\s*,\s*PT\s*:=\s*(.+?)\s*\)/i);
    if (timerMatch) {
      currentRung++;
      const timerName = timerMatch[1];
      const inVar = timerMatch[2];
      const ptValue = timerMatch[3].replace(/;/g, '');

      rungs.push(buildTimerRung(currentRung, inVar, timerName, ptValue, lineNumber));
      continue;
    }

    // === Counter ===
    const counterMatch = line.match(/(\w+)\s*\(\s*CU\s*:=\s*(\w+)\s*,\s*PV\s*:=\s*(\d+)/i);
    if (counterMatch) {
      currentRung++;
      const counterName = counterMatch[1];
      const cuVar = counterMatch[2];
      const pvValue = counterMatch[3];

      rungs.push(buildCounterRung(currentRung, cuVar, counterName, pvValue, lineNumber));
      continue;
    }

    // === Set/Reset single line ===
    const setMatch = line.match(/^(\w+)\s*:=\s*TRUE/i);
    const resetMatch = line.match(/^(\w+)\s*:=\s*FALSE/i);
    if ((setMatch || resetMatch) && !inIfBlock) {
      currentRung++;
      const varName = (setMatch || resetMatch)![1];
      rungs.push({
        id: currentRung,
        title: `${setMatch ? 'Set' : 'Reset'}: ${varName}`,
        elements: [{
          id: `r${currentRung}-coil`,
          type: setMatch ? 'coilSet' : 'coilReset',
          x: 35, y: 30, width: 30, height: 30,
          label: varName,
          sourceLine: lineNumber,
        }],
        width: 140, height: 60,
        sourceLine: lineNumber,
      });
    }
  }

  return rungs;
}

// Extract original IF condition from lines (for ELSE branch negation)
function extractIfCondition(lines: string[], startIdx: number): string | null {
  const line = lines[startIdx].trim();
  const m = line.match(/^IF\s+(.+?)\s+THEN$/i);
  return m ? m[1].trim() : null;
}

function buildRungFromConditions(
  rungId: number,
  condition: string | null,
  outputs: Array<{ var: string; value: string }>,
  negateCondition: boolean,
  prebuiltConditions?: Condition[][],
  sourceLine?: number,
): LDRung[] {
  const rungs: LDRung[] = [];

  let conditions: Condition[][];
  if (prebuiltConditions) {
    conditions = prebuiltConditions;
  } else if (condition && condition !== '__ELSE__') {
    conditions = parseBooleanExpression(condition);
    if (negateCondition) {
      // Negate all contacts in the condition
      conditions = conditions.map((group) =>
        group.map((c) => ({ ...c, negated: !c.negated }))
      );
    }
  } else {
    conditions = [];
  }

  outputs.forEach((output, oi) => {
    const elements: LDElement[] = [];
    let x = 35; // Start after left rail
    const y = 30;
    let hasParallel = false;

    // Build contact chain from conditions
    let branchEndX = 35;
    if (conditions.length > 0) {
      conditions.forEach((group, gi) => {
        let groupX = x;
        const groupY = gi > 0 ? 50 : 30;

        group.forEach((cond, ci) => {
          elements.push({
            id: `r${rungId}-${oi}-g${gi}-c${ci}`,
            type: cond.negated ? 'contactNC' : 'contactNO',
            x: groupX, y: groupY, width: 40, height: 30,
            label: cond.name,
          });
          groupX += 60;
        });

        if (gi === conditions.length - 1) x = groupX;
        if (gi > 0) hasParallel = true;
      });

      // Parallel branch: horizontal lines for shorter branches + vertical join
      const maxContacts = Math.max(...conditions.map(g => g.length));
      branchEndX = 35 + maxContacts * 60 - 10;

      conditions.forEach((group, gi) => {
        const groupEndX = 35 + group.length * 60 - 10;
        if (groupEndX < branchEndX) {
          const groupY = gi > 0 ? 50 : 30;
          elements.push({
            id: `r${rungId}-${oi}-h${gi}`,
            type: 'horizontalLine',
            x: groupEndX,
            y: groupY + 15,
            width: branchEndX - groupEndX,
            height: 1,
            label: '',
          });
        }
      });

      if (hasParallel) {
        elements.push({
          id: `r${rungId}-${oi}-v1`,
          type: 'verticalLine',
          x: branchEndX, y: 30, width: 2, height: 35, label: '',
        });
      }
    }

    // Determine coil type
    let coilType: LDElementType = 'coil';
    const val = output.value.toUpperCase();
    if (val === 'TRUE') coilType = 'coilSet';
    else if (val === 'FALSE') coilType = 'coilReset';

    const coilX = hasParallel ? branchEndX + 10 : x;

    elements.push({
      id: `r${rungId}-${oi}-coil`,
      type: coilType,
      x: coilX,
      y: 30,
      width: 30, height: 30,
      label: output.var,
    });

    rungs.push({
      id: rungId + oi,
      title: `Network ${rungId + oi}`,
      elements: elements.map((el) => ({ ...el, sourceLine })),
      width: coilX + 90,
      height: hasParallel ? 80 : 60,
      sourceLine,
    });
  });

  return rungs;
}

function buildTimerRung(rungId: number, inVar: string, timerName: string, ptValue: string, sourceLine?: number): LDRung {
  return {
    id: rungId,
    title: `Timer: ${timerName}`,
    elements: [
      { id: `r${rungId}-in`, type: 'contactNO', x: 35, y: 30, width: 40, height: 30, label: inVar, sourceLine },
      { id: `r${rungId}-timer`, type: 'timerTON', x: 95, y: 25, width: 50, height: 40, label: timerName, params: { PT: ptValue }, sourceLine },
    ],
    width: 205,
    height: 60,
    sourceLine,
  };
}

function buildCounterRung(rungId: number, cuVar: string, counterName: string, pvValue: string, sourceLine?: number): LDRung {
  return {
    id: rungId,
    title: `Counter: ${counterName}`,
    elements: [
      { id: `r${rungId}-cu`, type: 'contactNO', x: 35, y: 30, width: 40, height: 30, label: cuVar, sourceLine },
      { id: `r${rungId}-cnt`, type: 'counterCTU', x: 95, y: 25, width: 50, height: 40, label: counterName, params: { PV: pvValue }, sourceLine },
    ],
    width: 205,
    height: 60,
    sourceLine,
  };
}

// Parse boolean expression like "X0 AND NOT X1 OR X2"
// Returns array of parallel groups, each group is array of AND conditions
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseBooleanExpression(expr: string, excludeVar?: string): Condition[][] {
  // Remove the excluded variable (for self-latch patterns)
  let cleanExpr = expr;
  if (excludeVar) {
    cleanExpr = cleanExpr.replace(new RegExp(`\\b${escapeRegex(excludeVar)}\\b`, 'gi'), '').trim();
    cleanExpr = cleanExpr.replace(/\s+AND\s+AND\s+/gi, ' AND ').replace(/\s+OR\s+OR\s+/gi, ' OR ');
    cleanExpr = cleanExpr.replace(/^AND\s+|\s+AND$/gi, '').replace(/^OR\s+|\s+OR$/gi, '').trim();
  }

  if (!cleanExpr) return [];

  const orGroups = cleanExpr.split(/\s+OR\s+/i);

  return orGroups.map((group) => {
    const andParts = group.split(/\s+AND\s+/i);
    return andParts.map((part) => {
      const trimmed = part.trim();
      const negated = trimmed.toUpperCase().startsWith('NOT ');
      const name = negated ? trimmed.slice(4).trim() : trimmed;
      return { name, negated };
    }).filter((c) => c.name && c.name !== 'TRUE');
  }).filter((g) => g.length > 0);
}
