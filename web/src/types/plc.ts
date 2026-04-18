// IEC 61131-3 PLC 相关类型定义
// 这是前后端共享的核心接口契约，后续阶段不可随意变更

export type PLCModel =
  | 'FP0R'
  | 'FPΣ'
  | 'FP7'
  | 'FP-XH'
  | 'FP-X'
  | 'FP-X0'
  | 'FP0H'
  | 'FP2'
  | 'FP2SH'
  | 'FP10SH'
  | 'OTHER';

export type IOType = 'INPUT' | 'OUTPUT' | 'INOUT';

export type IODataType =
  | 'BOOL'
  | 'INT'
  | 'DINT'
  | 'REAL'
  | 'WORD'
  | 'DWORD'
  | 'TIME'
  | 'STRING';

export interface IOEntry {
  id: string;
  address: string;      // e.g. "X0", "Y0", "DT100"
  type: IOType;
  dataType: IODataType;
  name: string;         // 变量名
  description: string;  // 说明
}

export type ControlMode = 'MANUAL' | 'AUTO' | 'STEP' | 'CONTINUOUS';

export interface ProcessStep {
  id: string;
  order: number;
  description: string;
  condition?: string;
  delayMs?: number;
}

export interface SafetyCondition {
  id: string;
  description: string;
  enabled: boolean;
  ioRef?: string;       // 关联的 IO 地址
}

export interface POU {
  id: string;
  name: string;
  type: 'PROGRAM' | 'FUNCTION_BLOCK' | 'FUNCTION';
  language: 'ST' | 'LD' | 'FBD' | 'SFC' | 'IL';
  varInputs: IOEntry[];
  varOutputs: IOEntry[];
  varLocals: IOEntry[];
  body: string;         // ST 代码或 LD XML
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PLCProject {
  id: string;
  name: string;
  plcModel: PLCModel;
  description: string;
  poUs: POU[];
  globalVars: IOEntry[];
  createdAt: string;
  updatedAt: string;
}

// AI 生成请求表单数据
export interface AIGenerationForm {
  plcModel: PLCModel;
  scenario: string;           // 场景类型：电机/传送带/气动/自定义
  customScenarioName?: string;
  ioList: IOEntry[];
  processFlow: ProcessStep[];
  safetyConditions: SafetyCondition[];
  controlModes: ControlMode[];
  additionalNotes: string;
}

// LD 梯形图内部模型
export type LDNodeType =
  | 'CONTACT_NO'
  | 'CONTACT_NC'
  | 'COIL'
  | 'COIL_SET'
  | 'COIL_RESET'
  | 'TIMER'
  | 'COUNTER'
  | 'FUNCTION_BLOCK'
  | 'COMMENT';

export interface LDNode {
  id: string;
  type: LDNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  address?: string;
  negated?: boolean;
  params?: Record<string, string>;
}

export interface LDConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  points: { x: number; y: number }[];
}

export interface LadderNetwork {
  id: string;
  title: string;
  nodes: LDNode[];
  connections: LDConnection[];
  rowCount: number;
  colCount: number;
}
