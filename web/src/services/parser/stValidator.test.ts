import { describe, it, expect } from 'vitest';
import { validateSTCode } from './stValidator';

describe('validateSTCode', () => {
  it('does not flag X0 as undeclared when it is in declaredIO', () => {
    const code = `PROGRAM Test
VAR
  X0 : BOOL;
END_VAR
IF X0 THEN
  Y0 := TRUE;
END_IF;`;
    const result = validateSTCode(code, {
      declaredIO: [
        { address: 'X0', name: '启动', type: 'INPUT' },
        { address: 'Y0', name: '电机', type: 'OUTPUT' },
      ],
    });
    const undeclaredX0 = result.issues.find((i) => i.message.includes('X0') && i.message.includes('未声明'));
    expect(undeclaredX0).toBeUndefined();
  });

  it('does not match THEN, TRUE, FALSE, RUNFLAG as addresses', () => {
    const code = `PROGRAM Test
VAR
  X0 : BOOL;
END_VAR
IF X0 AND TRUE THEN
  RunFlag := FALSE;
END_IF;`;
    const result = validateSTCode(code, {
      declaredIO: [{ address: 'X0', name: '启动', type: 'INPUT' }],
    });
    expect(result.issues.some((i) => i.message.includes('THEN'))).toBe(false);
    expect(result.issues.some((i) => i.message.includes('TRUE'))).toBe(false);
    expect(result.issues.some((i) => i.message.includes('FALSE'))).toBe(false);
    expect(result.issues.some((i) => i.message.includes('RUNFLAG'))).toBe(false);
  });

  it('flags actually undeclared addresses like X4', () => {
    const code = `PROGRAM Test
VAR
  X0 : BOOL;
END_VAR
Y0 := X0 AND X4;`;
    const result = validateSTCode(code, {
      declaredIO: [{ address: 'X0', name: '启动', type: 'INPUT' }],
    });
    expect(result.issues.some((i) => i.message.includes('X4'))).toBe(true);
    expect(result.issues.some((i) => i.message.includes('Y0'))).toBe(true);
  });
});
