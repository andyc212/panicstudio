import { describe, it, expect } from 'vitest';
import { parseSTtoLD } from './stParser';

describe('parseSTtoLD', () => {
  it('parses direct assignment', () => {
    const code = 'Y0 := X0 AND NOT X1;';
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements).toHaveLength(3);
    expect(rungs[0].elements[0].type).toBe('contactNO');
    expect(rungs[0].elements[0].label).toBe('X0');
    expect(rungs[0].elements[1].type).toBe('contactNC');
    expect(rungs[0].elements[1].label).toBe('X1');
    expect(rungs[0].elements[2].type).toBe('coil');
    expect(rungs[0].elements[2].label).toBe('Y0');
  });

  it('parses IF-THEN with single condition', () => {
    const code = `IF X0 THEN
  Y0 := TRUE;
END_IF;`;
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements[0].type).toBe('contactNO');
    expect(rungs[0].elements[0].label).toBe('X0');
    expect(rungs[0].elements[1].type).toBe('coilSet');
    expect(rungs[0].elements[1].label).toBe('Y0');
  });

  it('parses IF-THEN with AND condition', () => {
    const code = `IF X0 AND NOT X1 THEN
  Y0 := TRUE;
END_IF;`;
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements).toHaveLength(3);
    expect(rungs[0].elements[0].label).toBe('X0');
    expect(rungs[0].elements[1].label).toBe('X1');
    expect(rungs[0].elements[1].type).toBe('contactNC');
    expect(rungs[0].elements[2].label).toBe('Y0');
  });

  it('parses IF-THEN with OR parallel branches', () => {
    const code = `IF X0 OR X1 THEN
  Y0 := TRUE;
END_IF;`;
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements.some((e) => e.type === 'verticalLine')).toBe(true);
  });

  it('parses timer TON', () => {
    const code = 'Timer1(IN := X0, PT := T#5s);';
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements[0].type).toBe('contactNO');
    expect(rungs[0].elements[0].label).toBe('X0');
    expect(rungs[0].elements[1].type).toBe('timerTON');
    expect(rungs[0].elements[1].label).toBe('Timer1');
    expect(rungs[0].elements[1].params?.PT).toBe('T#5s');
  });

  it('parses counter CTU', () => {
    const code = 'Counter1(CU := X0, PV := 10);';
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements[1].type).toBe('counterCTU');
    expect(rungs[0].elements[1].params?.PV).toBe('10');
  });

  it('parses self-latching circuit', () => {
    const code = 'Y0 := X0 OR Y0;';
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements.some((e) => e.type === 'verticalLine')).toBe(true);
  });

  it('parses ELSE branch', () => {
    const code = `IF X0 THEN
  Y0 := TRUE;
ELSE
  Y0 := FALSE;
END_IF;`;
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(2);
    expect(rungs[0].elements.some((e) => e.label === 'X0' && e.type === 'contactNO')).toBe(true);
    expect(rungs[1].elements.some((e) => e.label === 'X0' && e.type === 'contactNC')).toBe(true);
  });

  it('ignores VAR blocks', () => {
    const code = `VAR
  X0 : BOOL;
END_VAR
Y0 := X0;`;
    const rungs = parseSTtoLD(code);
    expect(rungs.length).toBe(1);
    expect(rungs[0].elements[0].label).toBe('X0');
  });
});
