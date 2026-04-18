# SKILL: 电机控制

## 场景描述

电机控制是工业自动化中最基础、最常见的控制场景。本 SKILL 涵盖单电机启停、正反转控制、星三角降压启动等典型应用。

## 适用 Panasonic PLC 型号

- FP-XH / FP-X / FP0R / FP7

## 标准 I/O 配置

| 地址 | 类型 | 名称 | 说明 |
|------|------|------|------|
| X0 | INPUT | Start_PB | 启动按钮（常开）|
| X1 | INPUT | Stop_PB | 停止按钮（常闭）|
| X2 | INPUT | E_Stop | 急停（常闭）|
| X3 | INPUT | Overload | 热继电器（常闭）|
| Y0 | OUTPUT | Motor_KM | 电机接触器 |
| Y1 | OUTPUT | Run_Lamp | 运行指示灯 |

## 典型动作流程

1. 按下启动按钮（X0）→ 电机启动（Y0）并自锁
2. 松开启动按钮 → 电机保持运行（自锁逻辑）
3. 按下停止按钮（X1）→ 电机停止
4. 急停触发（X2）→ 电机立即停止并报警
5. 过载保护（X3）→ 电机停止，需复位后才能重启

## AI Prompt 模板

```
请为 Panasonic FP-XH 编写电机启停控制程序。

I/O 配置：
- X0: 启动按钮（常开）
- X1: 停止按钮（常闭）
- X2: 急停（常闭）
- X3: 热继电器过载（常闭）
- Y0: 电机接触器
- Y1: 运行指示灯

动作要求：
1. 按下启动按钮，电机启动并自锁保持
2. 按下停止按钮，电机立即停止
3. 急停触发时立即停止并报警灯闪烁
4. 过载保护触发后必须复位才能重新启动
5. 添加启动/停止/故障状态指示灯

请生成完整可编译的 ST 代码，包含 VAR 声明块。
```

## 生成的 ST 代码示例

```iec-st
PROGRAM Motor_Control
VAR_INPUT
  Start_PB  : BOOL;  (* X0 *)
  Stop_PB   : BOOL;  (* X1, NC *)
  E_Stop    : BOOL;  (* X2, NC *)
  Overload  : BOOL;  (* X3, NC *)
END_VAR

VAR_OUTPUT
  Motor_KM  : BOOL;  (* Y0 *)
  Run_Lamp  : BOOL;  (* Y1 *)
  Alarm_Lamp: BOOL;  (* Y2 *)
END_VAR

VAR
  Fault     : BOOL;
END_VAR

(* Main Logic *)
IF NOT E_Stop OR NOT Overload THEN
  Fault := TRUE;
  Motor_KM := FALSE;
ELSIF Start_PB AND NOT Fault THEN
  Motor_KM := TRUE;
END_IF;

IF Stop_PB THEN
  Motor_KM := FALSE;
END_IF;

(* Self-holding latch *)
IF Motor_KM AND NOT Fault THEN
  Motor_KM := TRUE;
END_IF;

(* Status outputs *)
Run_Lamp := Motor_KM;
Alarm_Lamp := Fault;

END_PROGRAM
```

## AI 常见错误与检查要点

| 检查项 | 说明 |
|--------|------|
| ✅ 急停逻辑 | 急停必须是 **常闭触点**（NC），急停触发时断开 |
| ✅ 自锁电路 | 启动按钮并联 Motor_KM 触点实现自锁 |
| ✅ 故障复位 | 故障后必须有明确的复位条件，不能自动重启 |
| ✅ 停止按钮 | 必须是常闭触点（NC），串联在控制回路中 |
| ⚠️ 地址范围 | 确认 X/Y 地址在 PLC 实际 I/O 范围内 |

## 扩展场景

- **正反转控制**：添加互锁逻辑（正转时禁止反转）
- **星三角启动**：添加定时器切换星形→三角形
- **变频控制**：添加模拟量输出控制变频器频率
