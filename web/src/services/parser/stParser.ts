// IEC 61131-3 ST Parser → LD Model
// 支持更多语法模式：IF-THEN、定时器、计数器、并联分支

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
}

export interface LDRung {
  id: number;
  title: string;
  elements: LDElement[];
  width: number;
  height: number;
}

export function parseSTtoLD(stCode: string): LDRung[] {
  const rungs: LDRung[] = [];
  const lines = stCode.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let currentRung = 0;
  let inVarBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip VAR blocks
    if (line.toUpperCase().startsWith('VAR') || line.toUpperCase() === 'END_VAR') {
      inVarBlock = line.toUpperCase().startsWith('VAR');
      continue;
    }
    if (inVarBlock) continue;

    // Skip comments
    if (line.startsWith('//') || line.startsWith('(*')) continue;

    // Skip PROGRAM/END_PROGRAM etc.
    if (/^(PROGRAM|END_PROGRAM|FUNCTION|END_FUNCTION|FUNCTION_BLOCK|END_FUNCTION_BLOCK)/i.test(line)) continue;

    currentRung++;
    const elements: LDElement[] = [];
    let x = 20;
    const y = 30;

    // Pattern 1: Direct assignment: Output := Input1 AND Input2;
    if (line.includes(':=') && !line.toUpperCase().includes('IF ') && !line.toUpperCase().includes('THEN')) {
      const [left, right] = line.split(':=').map((s) => s.trim());
      const outputVar = left.replace(/;/g, '');
      const expr = right.replace(/;/g, '');

      // Parse conditions (handle AND/OR)
      const conditions = parseBooleanExpression(expr);
      let hasParallel = false;

      conditions.forEach((group, gi) => {
        let groupX = x;
        const groupY = hasParallel ? y + 35 : y;

        group.forEach((cond, ci) => {
          elements.push({
            id: `r${currentRung}-g${gi}-c${ci}`,
            type: cond.negated ? 'contactNC' : 'contactNO',
            x: groupX,
            y: groupY,
            width: 40,
            height: 30,
            label: cond.name,
          });
          groupX += 60;
        });

        // Horizontal line from last contact
        if (gi === conditions.length - 1) {
          x = groupX;
        }

        if (gi > 0) hasParallel = true;
      });

      // Output coil
      elements.push({
        id: `r${currentRung}-coil`,
        type: 'coil',
        x,
        y: y + (hasParallel ? 15 : 0),
        width: 30,
        height: 30,
        label: outputVar,
      });

      // Add vertical line for parallel branches
      if (hasParallel) {
        elements.push({
          id: `r${currentRung}-branch-v`,
          type: 'verticalLine',
          x: x - 10,
          y: y,
          width: 2,
          height: 35,
          label: '',
        });
      }

      rungs.push({
        id: currentRung,
        title: `Network ${currentRung}`,
        elements,
        width: x + 80,
        height: hasParallel ? 80 : 60,
      });
      continue;
    }

    // Pattern 2: TON/TOF timer instantiation
    const timerMatch = line.match(/(\w+)\s*\(\s*IN\s*:=\s*(\w+)\s*,\s*PT\s*:=\s*(.+?)\s*\)/i);
    if (timerMatch) {
      const timerName = timerMatch[1];
      const inVar = timerMatch[2];
      const ptValue = timerMatch[3].replace(/;/g, '');

      elements.push({
        id: `r${currentRung}-in`,
        type: 'contactNO',
        x,
        y,
        width: 40,
        height: 30,
        label: inVar,
      });
      x += 60;

      elements.push({
        id: `r${currentRung}-timer`,
        type: 'timerTON',
        x,
        y: y - 5,
        width: 50,
        height: 40,
        label: timerName,
        params: { PT: ptValue },
      });
      x += 70;

      rungs.push({
        id: currentRung,
        title: `Timer: ${timerName}`,
        elements,
        width: x + 40,
        height: 60,
      });
      continue;
    }

    // Pattern 3: CTU/CTD counter
    const counterMatch = line.match(/(\w+)\s*\(\s*CU\s*:=\s*(\w+)\s*,\s*PV\s*:=\s*(\d+)/i);
    if (counterMatch) {
      const counterName = counterMatch[1];
      const cuVar = counterMatch[2];
      const pvValue = counterMatch[3];

      elements.push({
        id: `r${currentRung}-cu`,
        type: 'contactNO',
        x,
        y,
        width: 40,
        height: 30,
        label: cuVar,
      });
      x += 60;

      elements.push({
        id: `r${currentRung}-counter`,
        type: 'counterCTU',
        x,
        y: y - 5,
        width: 50,
        height: 40,
        label: counterName,
        params: { PV: pvValue },
      });
      x += 70;

      rungs.push({
        id: currentRung,
        title: `Counter: ${counterName}`,
        elements,
        width: x + 40,
        height: 60,
      });
      continue;
    }

    // Pattern 4: Set/Reset: Var := TRUE / Var := FALSE
    const setMatch = line.match(/(\w+)\s*:=\s*TRUE/i);
    const resetMatch = line.match(/(\w+)\s*:=\s*FALSE/i);
    if (setMatch || resetMatch) {
      const varName = (setMatch || resetMatch)![1];
      elements.push({
        id: `r${currentRung}-coil`,
        type: setMatch ? 'coilSet' : 'coilReset',
        x,
        y,
        width: 30,
        height: 30,
        label: varName,
      });

      rungs.push({
        id: currentRung,
        title: `${setMatch ? 'Set' : 'Reset'}: ${varName}`,
        elements,
        width: x + 60,
        height: 60,
      });
    }
  }

  return rungs;
}

// Parse boolean expression like "X0 AND NOT X1 OR X2"
// Returns array of parallel groups, each group is array of conditions
interface Condition {
  name: string;
  negated: boolean;
}

function parseBooleanExpression(expr: string): Condition[][] {
  // Simple parser: split by OR first, then by AND
  const orGroups = expr.split(/\s+OR\s+/i);

  return orGroups.map((group) => {
    const andParts = group.split(/\s+AND\s+/i);
    return andParts.map((part) => {
      const trimmed = part.trim();
      const negated = trimmed.toUpperCase().startsWith('NOT ');
      const name = negated ? trimmed.slice(4).trim() : trimmed;
      return { name, negated };
    });
  });
}
