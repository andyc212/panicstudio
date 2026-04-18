import { describe, it, expect } from 'vitest';
import { buildPromptFromForm } from './kimiService';

describe('buildPromptFromForm', () => {
  it('includes I/O addresses in prompt', () => {
    const prompt = buildPromptFromForm({
      plcModel: 'FP-XH',
      scenario: '传送带控制',
      ioList: [
        { address: 'X0', type: 'INPUT', name: '启动按钮', description: '绿色按钮' },
        { address: 'Y0', type: 'OUTPUT', name: '电机', description: '传送带电机' },
      ],
      processFlow: [{ description: '按下启动按钮，电机运行' }],
      safetyConditions: [],
      controlModes: ['AUTO'],
    });

    expect(prompt).toContain('X0');
    expect(prompt).toContain('Y0');
    expect(prompt).toContain('启动按钮');
    expect(prompt).toContain('必须使用上述 I/O 地址');
    expect(prompt).toContain('不要使用 StopButton');
  });

  it('includes process flow steps', () => {
    const prompt = buildPromptFromForm({
      plcModel: 'FP-XH',
      scenario: '测试',
      ioList: [],
      processFlow: [
        { description: '步骤1' },
        { description: '步骤2', condition: 'X0=ON' },
      ],
      safetyConditions: [],
      controlModes: [],
    });

    expect(prompt).toContain('1. 步骤1');
    expect(prompt).toContain('2. 步骤2 [条件: X0=ON]');
  });
});
