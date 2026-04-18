// 文件解析服务：CSV/Excel/TXT → 结构化数据

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedIOEntry {
  address: string;
  type: 'INPUT' | 'OUTPUT' | 'INOUT';
  dataType: string;
  name: string;
  description: string;
}

export interface ParsedProcessStep {
  order: number;
  description: string;
  condition?: string;
  delayMs?: number;
}

export interface ParsedFileResult {
  ioList?: ParsedIOEntry[];
  processSteps?: ParsedProcessStep[];
  rawText?: string;
  fileType: string;
}

/**
 * 解析 CSV 文件 → I/O 清单
 * 期望格式：地址,类型,数据类型,名称,说明
 */
export function parseCSVFile(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const ioList: ParsedIOEntry[] = [];
        const processSteps: ParsedProcessStep[] = [];

        results.data.forEach((row: any, index: number) => {
          // 检测是否是 I/O 行（包含地址字段）
          if (row['地址'] || row['address'] || row['Address']) {
            const address = row['地址'] || row['address'] || row['Address'] || '';
            const type = (row['类型'] || row['type'] || row['Type'] || 'INPUT').toUpperCase();
            const dataType = row['数据类型'] || row['dataType'] || row['DataType'] || 'BOOL';
            const name = row['名称'] || row['name'] || row['Name'] || '';
            const description = row['说明'] || row['description'] || row['Description'] || '';

            if (address && name) {
              ioList.push({
                address,
                type: ['INPUT', 'OUTPUT', 'INOUT'].includes(type) ? type as any : 'INPUT',
                dataType,
                name,
                description,
              });
            }
          }

          // 检测是否是步骤行（包含描述字段）
          if (row['步骤'] || row['Step'] || row['描述'] || row['Description']) {
            const description = row['描述'] || row['Description'] || row['步骤'] || row['Step'] || '';
            const condition = row['条件'] || row['Condition'] || '';
            const delayStr = row['延时'] || row['Delay'] || '';

            if (description) {
              processSteps.push({
                order: index + 1,
                description,
                condition: condition || undefined,
                delayMs: delayStr ? parseDuration(delayStr) : undefined,
              });
            }
          }
        });

        resolve({
          ioList: ioList.length > 0 ? ioList : undefined,
          processSteps: processSteps.length > 0 ? processSteps : undefined,
          fileType: 'csv',
        });
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * 解析 Excel 文件 → I/O 清单或步骤
 */
export function parseExcelFile(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        const ioList: ParsedIOEntry[] = [];
        const processSteps: ParsedProcessStep[] = [];

        // 检测表头行
        let headerRow = -1;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i];
          if (row && (row.includes('地址') || row.includes('address') || row.includes('Address'))) {
            headerRow = i;
            break;
          }
        }

        if (headerRow >= 0) {
          const headers = jsonData[headerRow].map((h: string) => String(h).toLowerCase().trim());
          const addrIdx = headers.findIndex((h: string) => h.includes('地址') || h.includes('address'));
          const typeIdx = headers.findIndex((h: string) => h.includes('类型') || h.includes('type'));
          const dataTypeIdx = headers.findIndex((h: string) => h.includes('数据') || h.includes('datatype'));
          const nameIdx = headers.findIndex((h: string) => h.includes('名称') || h.includes('name'));
          const descIdx = headers.findIndex((h: string) => h.includes('说明') || h.includes('description'));

          for (let i = headerRow + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const address = addrIdx >= 0 ? String(row[addrIdx] || '') : '';
            const type = typeIdx >= 0 ? String(row[typeIdx] || 'INPUT').toUpperCase() : 'INPUT';
            const dataType = dataTypeIdx >= 0 ? String(row[dataTypeIdx] || 'BOOL') : 'BOOL';
            const name = nameIdx >= 0 ? String(row[nameIdx] || '') : '';
            const description = descIdx >= 0 ? String(row[descIdx] || '') : '';

            if (address && name) {
              ioList.push({
                address,
                type: ['INPUT', 'OUTPUT', 'INOUT'].includes(type) ? type as any : 'INPUT',
                dataType,
                name,
                description,
              });
            }
          }
        }

        // 如果没有找到 I/O 格式，尝试作为步骤列表解析
        if (ioList.length === 0) {
          jsonData.forEach((row, index) => {
            if (row && row[0]) {
              const text = String(row[0]).trim();
              if (text && text.length > 3) {
                processSteps.push({
                  order: index + 1,
                  description: text,
                });
              }
            }
          });
        }

        resolve({
          ioList: ioList.length > 0 ? ioList : undefined,
          processSteps: processSteps.length > 0 ? processSteps : undefined,
          fileType: 'excel',
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析文本文件 → 原始文本（直接传给 AI）
 */
export function parseTextFile(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      // 尝试从文本中提取步骤
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const processSteps: ParsedProcessStep[] = [];

      lines.forEach((line, index) => {
        // 检测是否是步骤描述（以数字开头或包含动作关键词）
        const isStep = /^\d+[\.、\)]/.test(line) ||
          /(启动|停止|前进|后退|延时|等待|检测|判断)/.test(line);

        if (isStep || line.length > 5) {
          processSteps.push({
            order: index + 1,
            description: line.replace(/^\d+[\.、\)]\s*/, ''),
          });
        }
      });

      resolve({
        rawText: text,
        processSteps: processSteps.length > 0 ? processSteps : undefined,
        fileType: 'text',
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * 根据文件类型自动选择解析器
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    return parseCSVFile(file);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseExcelFile(file);
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return parseTextFile(file);
  }

  // 默认作为文本处理
  return parseTextFile(file);
}

/**
 * 解析延时字符串 → 毫秒
 * 支持：1s, 2s, 500ms, T#1s, T#500ms
 */
function parseDuration(str: string): number | undefined {
  const clean = str.toString().trim().toLowerCase();
  const match = clean.match(/(\d+(?:\.\d+)?)\s*(s|ms|秒|毫秒)/);
  if (!match) return undefined;

  const value = parseFloat(match[1]);
  const unit = match[2];

  if (unit === 'ms' || unit === '毫秒') return value;
  if (unit === 's' || unit === '秒') return value * 1000;
  return undefined;
}
