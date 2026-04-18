import { useMemo, useState } from 'react';
import { validateSTCode, getScoreColor, getScoreLabel, downloadValidationLog } from '@services/parser/stValidator';
import type { ValidationIssue, ValidationResult } from '@services/parser/stValidator';
import { AlertCircle, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface ValidationPanelProps {
  code: string;
  codeName?: string;
  plcModel?: string;
  declaredIO?: Array<{ address: string; name: string; type: 'INPUT' | 'OUTPUT' }>;
  requiredSafetyConditions?: string[];
}

export function ValidationPanel({ code, codeName, plcModel, declaredIO, requiredSafetyConditions }: ValidationPanelProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const result = useMemo(() => {
    if (!code || code.length < 10) return null;
    return validateSTCode(code, {
      declaredIO,
      requiredSafetyConditions,
    });
  }, [code, declaredIO, requiredSafetyConditions]);

  if (!result) return null;

  const toggleIssue = (id: string) => {
    const newSet = new Set(expandedIssues);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIssues(newSet);
  };

  const handleExport = () => {
    downloadValidationLog(result, exportFormat, {
      codeName: codeName || 'Generated_Program',
      codeLength: code.length,
      plcModel,
    });
    setShowExportMenu(false);
  };

  const scoreColor = getScoreColor(result.score);
  const scoreLabel = getScoreLabel(result.score);

  return (
    <div className="rounded-lg border border-border bg-base overflow-hidden mt-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-sidebar-hover hover:bg-sidebar-active transition-colors"
      >
        <div className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle size={14} className="text-success" />
          ) : (
            <AlertCircle size={14} className="text-error" />
          )}
          <span className="text-xs font-medium text-text-primary">代码验证</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
          >
            {result.score}分 · {scoreLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {result.summary.errors > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/10 text-error">
              {result.summary.errors} 错误
            </span>
          )}
          {result.summary.warnings > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
              {result.summary.warnings} 警告
            </span>
          )}
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sidebar-active text-text-muted hover:text-text-primary transition-colors"
              title="导出验证日志"
            >
              <Download size={12} />
              <span className="text-[10px]">导出</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-md border border-border bg-base shadow-lg overflow-hidden">
                <div className="px-2 py-1 text-[10px] text-text-muted border-b border-border/50">格式</div>
                <button
                  onClick={(e) => { e.stopPropagation(); setExportFormat('json'); }}
                  className={`w-full px-2 py-1 text-[11px] text-left transition-colors ${exportFormat === 'json' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-sidebar-hover'}`}
                >
                  JSON
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setExportFormat('csv'); }}
                  className={`w-full px-2 py-1 text-[11px] text-left transition-colors ${exportFormat === 'csv' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-sidebar-hover'}`}
                >
                  CSV
                </button>
                <div className="border-t border-border/50 px-2 py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(); }}
                    className="w-full py-1 rounded bg-accent/10 text-accent text-[11px] hover:bg-accent/20 transition-colors"
                  >
                    下载
                  </button>
                </div>
              </div>
            )}
          </div>
          {isExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>
      </button>

      {/* Issues List */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto">
          {result.issues.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-1 text-success" />
              <p className="text-xs text-text-secondary">代码检查通过，未发现明显问题</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {result.issues.map((issue) => (
                <IssueItem
                  key={issue.id}
                  issue={issue}
                  isExpanded={expandedIssues.has(issue.id)}
                  onToggle={() => toggleIssue(issue.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueItem({ issue, isExpanded, onToggle }: { issue: ValidationIssue; isExpanded: boolean; onToggle: () => void }) {
  const iconMap = {
    error: <AlertCircle size={13} className="text-error shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />,
    info: <Info size={13} className="text-info shrink-0 mt-0.5" />,
  };

  const categoryLabels: Record<string, string> = {
    syntax: '语法',
    io: 'I/O',
    safety: '安全',
    structure: '结构',
  };

  return (
    <div className="px-3 py-2 hover:bg-sidebar-hover/50 transition-colors">
      <button onClick={onToggle} className="w-full flex items-start gap-2 text-left">
        {iconMap[issue.severity]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1 rounded bg-sidebar-active text-text-muted">
              {categoryLabels[issue.category] || issue.category}
            </span>
            {issue.line && (
              <span className="text-[10px] text-text-muted">第 {issue.line} 行</span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5">{issue.message}</p>
          {isExpanded && issue.suggestion && (
            <p className="text-[10px] text-text-muted mt-1 pl-2 border-l-2 border-accent/30">
              建议：{issue.suggestion}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
