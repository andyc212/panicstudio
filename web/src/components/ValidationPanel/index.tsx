import { useMemo, useState } from 'react';
import { useUIStore } from '@stores';
import { validateSTCode, getScoreColor, getScoreLabel, downloadValidationLog } from '@services/parser/stValidator';
import type { ValidationIssue, ValidationResult } from '@services/parser/stValidator';
import { AlertCircle, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, Download, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ValidationPanelProps {
  code: string;
  codeName?: string;
  plcModel?: string;
  declaredIO?: Array<{ address: string; name: string; type: 'INPUT' | 'OUTPUT' }>;
  requiredSafetyConditions?: string[];
}

export function ValidationPanel({ code, codeName, plcModel, declaredIO, requiredSafetyConditions }: ValidationPanelProps) {
  const { t } = useTranslation();
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
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
          <span className="text-xs font-medium text-text-primary">{t('validation.title')}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
          >
            {result.score} · {scoreLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {result.summary.errors > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/10 text-error">
              {result.summary.errors} {t('validation.errors')}
            </span>
          )}
          {result.summary.warnings > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
              {result.summary.warnings} {t('validation.warnings')}
            </span>
          )}
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(!showExportMenu); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sidebar-active text-text-muted hover:text-text-primary transition-colors"
              title={t('validation.exportLog')}
            >
              <Download size={12} />
              <span className="text-[10px]">{t('validation.exportLog')}</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-md border border-border bg-base shadow-lg overflow-hidden">
                <div className="px-2 py-1 text-[10px] text-text-muted border-b border-border/50">{t('validation.format')}</div>
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
                    {t('validation.download')}
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isExpanded) setIsExpanded(true); setIsMaximized(!isMaximized); }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sidebar-active text-text-muted hover:text-text-primary transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
            type="button"
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          {isExpanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </div>
      </button>

      {/* Dimensions */}
      {isExpanded && result.dimensions && (
        <div className="px-3 py-2 border-b border-border/50 bg-sidebar-hover/30">
          <div className="text-[10px] text-text-muted mb-1.5">{t('validation.dimensions')}</div>
          <div className="space-y-1.5">
            {result.dimensions.map((dim) => (
              <div key={dim.name} className="flex items-center gap-2">
                <span className="text-[10px] text-text-secondary w-20 shrink-0">{t(`validation.dim${dim.name.charAt(0).toUpperCase() + dim.name.slice(1)}` as any) || dim.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-sidebar-active overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${dim.score}%`,
                      backgroundColor: getScoreColor(dim.score),
                    }}
                  />
                </div>
                <span className="text-[10px] text-text-muted w-6 text-right">{dim.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues List */}
      {isExpanded && !isMaximized && (
        <div className="max-h-48 overflow-y-auto">
          {result.issues.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <CheckCircle size={24} className="mx-auto mb-1 text-success" />
              <p className="text-xs text-text-secondary">{t('validation.passed')}</p>
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

      {/* Maximized Modal */}
      {isMaximized && isExpanded && (
        <div className="fixed inset-4 z-50 rounded-lg border border-border bg-base shadow-2xl flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-sidebar-hover border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {result.passed ? (
                <CheckCircle size={16} className="text-success" />
              ) : (
                <AlertCircle size={16} className="text-error" />
              )}
              <span className="text-sm font-medium text-text-primary">{t('validation.title')}</span>
              <span
                className="text-xs px-2 py-0.5 rounded font-bold"
                style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
              >
                {result.score} · {scoreLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result.summary.errors > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-error/10 text-error">
                  {result.summary.errors} {t('validation.errors')}
                </span>
              )}
              {result.summary.warnings > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">
                  {result.summary.warnings} {t('validation.warnings')}
                </span>
              )}
              <button
                onClick={() => setIsMaximized(false)}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-sidebar-active text-text-muted hover:text-text-primary transition-colors"
                type="button"
              >
                <Minimize2 size={14} />
                <span className="text-xs">Restore</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Dimensions */}
            {result.dimensions && (
              <div className="rounded-lg border border-border/50 bg-sidebar-hover/30 p-3">
                <div className="text-xs text-text-muted mb-2">{t('validation.dimensions')}</div>
                <div className="space-y-2">
                  {result.dimensions.map((dim) => (
                    <div key={dim.name} className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary w-24 shrink-0">{t(`validation.dim${dim.name.charAt(0).toUpperCase() + dim.name.slice(1)}` as any) || dim.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-sidebar-active overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${dim.score}%`,
                            backgroundColor: getScoreColor(dim.score),
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-8 text-right">{dim.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {result.issues.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <CheckCircle size={32} className="mx-auto mb-2 text-success" />
                  <p className="text-sm text-text-secondary">{t('validation.passed')}</p>
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
          </div>
        </div>
      )}

      {/* Backdrop for maximized modal */}
      {isMaximized && isExpanded && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsMaximized(false)} />
      )}
    </div>
  );
}

function IssueItem({ issue, isExpanded, onToggle }: { issue: ValidationIssue; isExpanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const jumpToLine = useUIStore((s) => s.jumpToLine);
  const iconMap = {
    error: <AlertCircle size={13} className="text-error shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />,
    info: <Info size={13} className="text-info shrink-0 mt-0.5" />,
  };

  const categoryLabels: Record<string, string> = {
    syntax: t('validation.categories.syntax'),
    io: t('validation.categories.io'),
    safety: t('validation.categories.safety'),
    structure: t('validation.categories.structure'),
  };

  return (
    <div className="px-3 py-2 hover:bg-sidebar-hover/50 transition-colors">
      <div className="flex items-start gap-2">
        <button onClick={onToggle} className="flex-1 flex items-start gap-2 text-left" type="button">
          {iconMap[issue.severity]}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1 rounded bg-sidebar-active text-text-muted">
                {categoryLabels[issue.category] || issue.category}
              </span>
              {issue.line && (
                <span className="text-[10px] text-text-muted">{t('validation.jumpToLine', { line: issue.line })}</span>
              )}
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">{issue.message}</p>
            {isExpanded && issue.suggestion && (
              <p className="text-[10px] text-text-muted mt-1 pl-2 border-l-2 border-accent/30">
                {t('validation.suggestion')}：{issue.suggestion}
              </p>
            )}
          </div>
        </button>
        {issue.line && (
          <button
            onClick={() => jumpToLine(issue.line!)}
            className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-accent hover:text-accent-light hover:underline transition-colors mt-0.5"
            title={t('validation.jumpToLine', { line: issue.line })}
            type="button"
          >
            <ArrowRight size={9} />
          </button>
        )}
      </div>
    </div>
  );
}
