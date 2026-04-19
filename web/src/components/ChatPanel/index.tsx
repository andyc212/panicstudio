import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useUIStore, useProjectStore, useAuthStore } from '@stores';
import { streamAIGeneration, streamAIChat } from '@services/api/ai';
import { ValidationPanel } from '@components/ValidationPanel';
import { parseFile } from '@services/parser/fileParser';
import type { ParsedFileResult } from '@services/parser/fileParser';
import { validateSTCode, getScoreColor } from '@services/parser/stValidator';
import type { AIMessage } from '@types';
import {
  MessageSquare, ListOrdered, History, Zap, Loader2,
  Upload, FileText, FileSpreadsheet, X, CheckCircle,
  Sparkles, Clock, Copy, RotateCcw, Edit3, FileDown,
  Send, Trash2, Bot, User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const HISTORY_KEY = 'panicstudio-ai-history';

interface HistoryRecord {
  id: string;
  timestamp: string;
  scenario: string;
  code: string;
  model: string;
  validationScore: number;
  ioList: Array<{ address: string; type: 'INPUT' | 'OUTPUT'; dataType: string; name: string; description: string }>;
}

function getHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(record: HistoryRecord) {
  try {
    const history = getHistory();
    history.unshift(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch {
    // ignore
  }
}

function deleteHistory(id: string) {
  try {
    const history = getHistory().filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function ChatPanel() {
  const { t } = useTranslation();
  const { activeChatTab, setActiveChatTab } = useUIStore();

  const tabs = [
    { id: 'guided' as const, label: t('tabs.guided'), icon: <ListOrdered size={14} /> },
    { id: 'chat' as const, label: t('tabs.chat'), icon: <MessageSquare size={14} /> },
    { id: 'history' as const, label: t('tabs.history'), icon: <History size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveChatTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeChatTab === tab.id
                ? 'text-accent border-accent bg-accent/5'
                : 'text-text-secondary border-transparent hover:text-text-primary hover:bg-sidebar-hover'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 relative">
        <div className={activeChatTab === 'guided' ? '' : 'hidden'}>
          <GuidedMode />
        </div>
        <div className={activeChatTab === 'chat' ? '' : 'hidden'}>
          <ChatMode />
        </div>
        <div className={activeChatTab === 'history' ? '' : 'hidden'}>
          <HistoryMode />
        </div>
      </div>
    </div>
  );
}

function GuidedMode() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { currentProject, addPou } = useProjectStore();
  const { setActiveChatTab } = useUIStore();

  // Form state
  const [scenario, setScenario] = useState('');
  const [ioList, setIoList] = useState([{ address: 'X0', type: 'INPUT' as const, dataType: 'BOOL' as const, name: '', description: '' }]);
  const [processSteps, setProcessSteps] = useState([{ description: '' }]);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [safetyConditions, setSafetyConditions] = useState([
    { id: '1', description: 'safety.emergencyStopReset', enabled: true },
    { id: '2', description: 'safety.motorOverload', enabled: true },
    { id: '3', description: 'safety.safetyDoorInterlock', enabled: false },
  ]);
  const [notes, setNotes] = useState('');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; parsed: ParsedFileResult; status: 'parsing' | 'done' | 'error' }>>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // === File Upload Handlers ===
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const uploadItem = { file, parsed: {} as ParsedFileResult, status: 'parsing' as const };
      setUploadedFiles((prev) => [...prev, uploadItem]);

      try {
        const parsed = await parseFile(file);

        // Auto-fill I/O list if parsed
        if (parsed.ioList && parsed.ioList.length > 0) {
          setIoList((prev) => {
            const existing = new Set(prev.map((io) => io.address));
            const newItems = parsed.ioList!.filter((io) => !existing.has(io.address));
            return [...prev, ...newItems.map((io) => ({ ...io, type: io.type as 'INPUT' | 'OUTPUT' }))];
          });
        }

        // Auto-fill process steps if parsed
        if (parsed.processSteps && parsed.processSteps.length > 0) {
          setProcessSteps((prev) => {
            if (prev.length === 1 && prev[0].description === '') {
              return parsed.processSteps!.map((s) => ({ description: s.description }));
            }
            return [...prev, ...parsed.processSteps!.map((s) => ({ description: s.description }))];
          });
        }

        // Auto-fill notes if raw text
        if (parsed.rawText && !parsed.ioList && !parsed.processSteps) {
          setNotes((prev) => prev ? `${prev}\n\n${parsed.rawText}` : parsed.rawText!);
        }

        setUploadedFiles((prev) =>
          prev.map((item) => (item.file === file ? { ...item, parsed, status: 'done' as const } : item))
        );
      } catch (err) {
        setUploadedFiles((prev) =>
          prev.map((item) => (item.file === file ? { ...item, status: 'error' as const } : item))
        );
      }
    }

    // Reset input
    e.target.value = '';
  }, []);

  const removeFile = (file: File) => {
    setUploadedFiles((prev) => prev.filter((item) => item.file !== file));
  };

  // === Form Handlers ===
  const addIO = () => setIoList([...ioList, { address: '', type: 'INPUT', dataType: 'BOOL', name: '', description: '' }]);
  const updateIO = (i: number, field: string, value: string) => {
    const newList = [...ioList];
    (newList[i] as any)[field] = value;
    setIoList(newList);
  };

  const addStep = () => setProcessSteps([...processSteps, { description: '' }]);
  const updateStep = (i: number, value: string) => {
    const newSteps = [...processSteps];
    newSteps[i].description = value;
    setProcessSteps(newSteps);
  };

  const toggleSafety = (id: string) => {
    setSafetyConditions(safetyConditions.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  // === Generate ===
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      setError(t('chatPanel.loginRequired'));
      return;
    }

    setIsGenerating(true);
    setGeneratedCode('');
    setError('');

    try {
      // Build file context from uploaded files
      const fileContext = uploadedFiles
        .filter((f) => f.status === 'done')
        .map((f) => {
          if (f.parsed.rawText) return f.parsed.rawText;
          if (f.parsed.ioList) return `I/O清单:\n${f.parsed.ioList.map((io) => `- ${io.address}: ${io.name} (${io.type})`).join('\n')}`;
          if (f.parsed.processSteps) return `工艺流程:\n${f.parsed.processSteps.map((s) => `${s.order}. ${s.description}`).join('\n')}`;
          return '';
        })
        .filter(Boolean)
        .join('\n\n');

      const formData = {
        plcModel: currentProject?.plcModel || 'FP0R',
        scenario: scenario || '自定义控制',
        ioList: ioList.filter((io) => io.address && io.name),
        processFlow: processSteps.filter((s) => s.description).map((s, i) => ({ id: String(i), order: i, description: s.description })),
        safetyConditions,
        controlModes: ['AUTO'],
        additionalNotes: fileContext ? `${notes}\n\n[上传文件内容]:\n${fileContext}` : notes,
      };

      let code = '';
      let currentStep = 1;
      let usedModel = 'moonshot-v1-8k';
      setGenerationStep(1);
      for await (const chunk of streamAIGeneration(formData as any)) {
        if (chunk.type === 'chunk') {
          code += chunk.content;
          setGeneratedCode(code);
          const newStep = inferGenerationStep(code);
          if (newStep !== currentStep) {
            currentStep = newStep;
            setGenerationStep(newStep);
          }
        } else if (chunk.type === 'error') {
          setError(chunk.error || t('chatPanel.generationFailed'));
        } else if (chunk.type === 'done' && chunk.model) {
          usedModel = chunk.model;
        }
      }

      // Auto-create POU
      if (code) {
        const newPou = {
          id: crypto.randomUUID(),
          name: scenario || 'Generated_Program',
          type: 'PROGRAM' as const,
          language: 'ST' as const,
          varInputs: ioList.filter((io) => io.type === 'INPUT'),
          varOutputs: ioList.filter((io) => io.type === 'OUTPUT'),
          varLocals: [],
          body: code,
          description: `AI generated ${scenario} program`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addPou(newPou);

        // Save to history
        const validation = validateSTCode(code, {
          declaredIO: ioList.filter((io) => io.address).map((io) => ({ address: io.address, name: io.name || io.address, type: io.type as 'INPUT' | 'OUTPUT' })),
          requiredSafetyConditions: safetyConditions.filter((s) => s.enabled).map((s) => t(s.description)),
        });
        saveHistory({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          scenario: scenario || '自定义控制',
          code,
          model: usedModel,
          validationScore: validation.score,
          ioList: ioList.filter((io) => io.address),
        });
      }
    } catch (err: any) {
      setError(err.message || t('chatPanel.generationFailed'));
    } finally {
      setIsGenerating(false);
      setGenerationStep(0);
    }
  }, [isAuthenticated, scenario, ioList, processSteps, safetyConditions, notes, currentProject, uploadedFiles]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
    } catch {
      setError(t('chatPanel.copyFailed'));
    }
  }, [generatedCode]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleRegenerate = useCallback(() => {
    setGeneratedCode('');
    handleGenerate();
  }, [handleGenerate]);

  const handleModifyRequest = useCallback(() => {
    setActiveChatTab('guided');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setActiveChatTab]);

  const handleExportCode = useCallback(() => {
    if (!generatedCode.trim()) return;
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (currentProject?.name || scenario || 'Program')
      .replace(/[^\w\u4e00-\u9fa5]/g, '_')
      .slice(0, 100);
    a.download = `${base}.st`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedCode, currentProject?.name, scenario]);

  return (
    <div className="space-y-3">
      {!isAuthenticated && (
        <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
          {t('chatPanel.loginRequired')}
        </div>
      )}

      {/* File Upload Area */}
      <div className="rounded-lg border border-dashed border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2 flex items-center gap-1">
          <Upload size={12} />
          {t('chatPanel.uploadTitle')}
        </div>
        <p className="text-[10px] text-text-muted mb-2">
          {t('chatPanel.uploadHint')}
        </p>

        <label className="flex items-center justify-center gap-2 w-full py-2 rounded-md bg-sidebar-hover border border-border hover:border-accent hover:bg-sidebar-active transition-colors cursor-pointer">
          <Upload size={14} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">{t('chatPanel.uploadClick')}</span>
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.xls,.txt,.md,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {uploadedFiles.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded bg-sidebar-hover text-[10px]">
                {item.status === 'parsing' && <Loader2 size={10} className="animate-spin text-accent" />}
                {item.status === 'done' && <CheckCircle size={10} className="text-success" />}
                {item.status === 'error' && <X size={10} className="text-error" />}

                {item.file.name.endsWith('.csv') && <FileText size={10} className="text-text-muted" />}
                {(item.file.name.endsWith('.xlsx') || item.file.name.endsWith('.xls')) && <FileSpreadsheet size={10} className="text-text-muted" />}
                {(item.file.name.endsWith('.txt') || item.file.name.endsWith('.md')) && <FileText size={10} className="text-text-muted" />}

                <span className="text-text-secondary truncate flex-1">{item.file.name}</span>

                {item.status === 'done' && (
                  <span className="text-text-muted">
                    {item.parsed.ioList && t('chatPanel.ioParsed', { count: item.parsed.ioList.length }) + ' '}
                    {item.parsed.processSteps && t('chatPanel.stepsParsed', { count: item.parsed.processSteps.length }) + ' '}
                    {item.parsed.rawText && t('chatPanel.read')}
                  </span>
                )}

                <button onClick={() => removeFile(item.file)} className="p-0.5 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 1: Scenario */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">{t('chatPanel.step1')}</div>
        <input
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder={t('chatPanel.scenarioPlaceholder')}
          className="w-full px-2.5 py-1.5 rounded-md bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {/* Step 2: I/O */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">{t('chatPanel.step2')}</div>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {ioList.map((io, i) => (
            <div key={i} className="flex gap-1">
              <input value={io.address} onChange={(e) => updateIO(i, 'address', e.target.value)} placeholder="X0" className="w-12 px-1.5 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
              <select value={io.type} onChange={(e) => updateIO(i, 'type', e.target.value)} className="w-16 px-1 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary">
                <option>INPUT</option>
                <option>OUTPUT</option>
              </select>
              <input value={io.name} onChange={(e) => updateIO(i, 'name', e.target.value)} placeholder={t('chatPanel.ioName')} className="flex-1 px-1.5 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
              <input value={io.description} onChange={(e) => updateIO(i, 'description', e.target.value)} placeholder={t('chatPanel.ioDesc')} className="flex-1 px-1.5 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        <button onClick={addIO} className="mt-1.5 text-[10px] text-accent hover:text-accent-light transition-colors">{t('chatPanel.addIO')}</button>
      </div>

      {/* Step 3: Process */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">{t('chatPanel.step3')}</div>
        <div className="space-y-1">
          {processSteps.slice(0, stepsExpanded ? processSteps.length : 10).map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted w-4">{i + 1}.</span>
              <input value={step.description} onChange={(e) => updateStep(i, e.target.value)} placeholder={t('chatPanel.stepDescPlaceholder')} className="flex-1 px-2 py-1 rounded bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        {processSteps.length > 10 && (
          <button
            onClick={() => setStepsExpanded(!stepsExpanded)}
            className="mt-1 text-[10px] text-text-muted hover:text-text-primary transition-colors"
            type="button"
          >
            {stepsExpanded ? t('chatPanel.collapse') : t('chatPanel.expandRemaining', { count: processSteps.length - 10 })}
          </button>
        )}
        <button onClick={addStep} className="mt-1.5 text-[10px] text-accent hover:text-accent-light transition-colors" type="button">{t('chatPanel.addStep')}</button>
      </div>

      {/* Step 4: Safety */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">{t('chatPanel.step4')}</div>
        <div className="space-y-1">
          {safetyConditions.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
              <input type="checkbox" checked={s.enabled} onChange={() => toggleSafety(s.id)} className="rounded border-border bg-sidebar text-accent focus:ring-accent" />
              {t(s.description)}
            </label>
          ))}
        </div>
      </div>

      {/* Step 5: Notes */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">{t('chatPanel.notes')}</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('chatPanel.notesPlaceholder')} className="w-full px-2 py-1 rounded bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !isAuthenticated}
        className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {t('chatPanel.generating')}
          </>
        ) : (
          <>
            <Zap size={16} />
            {t('chatPanel.generate')}
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-2 rounded bg-error/10 border border-error/20 text-xs text-error">
          {error}
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && generationStep > 0 && (
        <GenerationProgress step={generationStep} />
      )}

      {/* Generated Preview */}
      {generatedCode && (
        <div className="rounded-lg border border-border bg-base overflow-hidden">
          {/* Action bar */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-sidebar-hover border-b border-border">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-secondary font-medium">{t('chatPanel.result')}</span>
              <span className="text-[10px] text-accent ml-1">{t('chatPanel.pouCreated')}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title={t('chatPanel.regenerate')}
              >
                <RotateCcw size={10} />
                {t('chatPanel.regenerate')}
              </button>
              <button
                onClick={handleModifyRequest}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title={t('chatPanel.modify')}
              >
                <Edit3 size={10} />
                {t('chatPanel.modify')}
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title={t('chatPanel.copy')}
              >
                {copied ? <CheckCircle size={10} className="text-success" /> : <Copy size={10} />}
                {copied ? t('chatPanel.copied') : t('chatPanel.copy')}
              </button>
              <button
                onClick={handleExportCode}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title={t('chatPanel.export')}
              >
                <FileDown size={10} />
                {t('chatPanel.export')}
              </button>
            </div>
          </div>
          <pre className="p-2 text-[10px] text-text-secondary overflow-auto max-h-64 font-mono">{generatedCode.slice(0, 800)}{generatedCode.length > 800 ? '...' : ''}</pre>
        </div>
      )}

      {/* Code Validation */}
      {generatedCode && (
        <ValidationPanel
          code={generatedCode}
          codeName={currentProject?.name || scenario}
          plcModel={currentProject?.plcModel}
          declaredIO={ioList.filter((io) => io.address).map((io) => ({ address: io.address, name: io.name || io.address, type: io.type as 'INPUT' | 'OUTPUT' }))}
          requiredSafetyConditions={safetyConditions.filter((s) => s.enabled).map((s) => t(s.description))}
        />
      )}
    </div>
  );
}

/** Best-effort heuristic to infer generation phase from ST code keywords.
 *  Note: AI may output keywords out of order; this is for UI feedback only.
 */
function inferGenerationStep(code: string): 1 | 2 | 3 | 4 {
  const upper = code.toUpperCase();
  if (upper.includes('END_PROGRAM')) return 4;
  if (upper.includes('END_VAR')) return 3;
  if (/\bVAR\b/.test(upper)) return 2;
  return 1;
}

function GenerationProgress({ step }: { step: number }) {
  const { t } = useTranslation();
  const steps = [
    { label: t('chatPanel.progressAnalyze'), desc: t('chatPanel.progressAnalyze') },
    { label: t('chatPanel.progressPlan'), desc: t('chatPanel.progressPlan') },
    { label: t('chatPanel.progressWrite'), desc: t('chatPanel.progressWrite') },
    { label: t('chatPanel.progressVerify'), desc: t('chatPanel.progressVerify') },
  ];

  return (
    <div className="rounded-lg border border-border bg-base overflow-hidden">
      <div className="px-3 py-2 bg-sidebar-hover border-b border-border">
        <div className="flex items-center gap-2">
          <Loader2 size={12} className="text-accent animate-spin" />
          <span className="text-[10px] text-text-secondary font-medium">{t('chatPanel.generatingProgress')}</span>
        </div>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {steps.map((s, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  isDone
                    ? 'bg-success/10 text-success'
                    : isActive
                    ? 'bg-accent/10 text-accent'
                    : 'bg-sidebar-active text-text-muted'
                }`}
              >
                {isDone ? <CheckCircle size={8} /> : stepNum}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-medium ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {s.label}
                </div>
                {isActive && (
                  <div className="text-[9px] text-text-muted">{s.desc}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComingSoon({
  icon,
  title,
  description,
  hint,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-[240px]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sidebar-active border border-border mb-4" aria-hidden="true">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">{description}</p>
          {hint && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/5 border border-accent/10">
              <Sparkles size={10} className="text-accent" aria-hidden="true" />
              <span className="text-[10px] text-accent font-medium">{hint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CHAT_STORAGE_KEY = 'panicstudio-chat-messages';

function loadChatMessages(): AIMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveChatMessages(messages: AIMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch { /* ignore */ }
}

interface ParsedPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseMarkdownContent(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'iec-st', content: match[2].trimEnd() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  if (parts.length === 0 && text) {
    parts.push({ type: 'text', content: text });
  }
  return parts;
}

function ChatMode() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<AIMessage[]>(loadChatMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    saveChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopyCode = useCallback(async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      setError(t('chatPanel.copyFailed'));
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (!isAuthenticated) {
      setError(t('chatPanel.loginRequired'));
      return;
    }

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      let content = '';
      for await (const chunk of streamAIChat(history)) {
        if (chunk.type === 'chunk' && chunk.content) {
          content += chunk.content;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content } : m))
          );
        } else if (chunk.type === 'error') {
          setError(chunk.error || t('chatPanel.generationFailed'));
        }
      }
    } catch (err: any) {
      setError(err.message || t('chatPanel.generationFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isAuthenticated, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = useCallback(() => {
    setMessages([]);
    setError('');
    localStorage.removeItem(CHAT_STORAGE_KEY);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-sidebar-hover shrink-0">
        <div className="flex items-center gap-1.5">
          <Bot size={14} className="text-accent" />
          <span className="text-xs font-medium text-text-primary">{t('chatPanel.chatHeader')}</span>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-secondary hover:text-error hover:bg-error/10 transition-colors"
          title={t('chatPanel.clearChat')}
        >
          <Trash2 size={10} />
          {t('chatPanel.clearChat')}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sidebar-active border border-border mb-3">
              <MessageSquare size={18} className="text-text-muted" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">{t('chatPanel.chatModeTitle')}</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed max-w-[220px]">
              {t('chatPanel.chatModeDesc')}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className="shrink-0 mt-0.5">
              {msg.role === 'user' ? (
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                  <User size={12} className="text-accent" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                  <Bot size={12} className="text-success" />
                </div>
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent/10 text-text-primary border border-accent/20'
                  : 'bg-sidebar-hover text-text-secondary border border-border'
              }`}
            >
              {parseMarkdownContent(msg.content).map((part, idx) =>
                part.type === 'code' ? (
                  <div key={idx} className="my-2 relative group">
                    <div className="flex items-center justify-between px-2 py-1 bg-[#1e1e1e] border border-[#333] border-b-0 rounded-t">
                      <span className="text-[10px] text-text-muted font-mono">
                        {part.language || 'code'}
                      </span>
                      <button
                        onClick={() => handleCopyCode(part.content, `${msg.id}-${idx}`)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-muted hover:text-text-primary hover:bg-sidebar-active transition-colors"
                      >
                        {copiedCodeId === `${msg.id}-${idx}` ? (
                          <CheckCircle size={10} className="text-success" />
                        ) : (
                          <Copy size={10} />
                        )}
                        {copiedCodeId === `${msg.id}-${idx}` ? t('chatPanel.copied') : t('chatPanel.copy')}
                      </button>
                    </div>
                    <pre className="p-2 bg-[#1e1e1e] border border-[#333] rounded-b text-[10px] text-text-secondary overflow-auto max-h-48 font-mono">
                      <code>{part.content}</code>
                    </pre>
                  </div>
                ) : (
                  <div key={idx} className="whitespace-pre-wrap">
                    {part.content}
                  </div>
                )
              )}
              {msg.role === 'assistant' && msg.content === '' && isLoading && (
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-[10px]">{t('chatPanel.aiThinking')}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="p-2 rounded bg-error/10 border border-error/20 text-xs text-error">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3 bg-sidebar-hover">
        {!isAuthenticated && (
          <div className="mb-2 p-2 rounded-lg bg-warning/10 border border-warning/20 text-[10px] text-warning">
            {t('chatPanel.loginRequired')}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chatPanel.chatPlaceholder')}
            rows={2}
            disabled={isLoading || !isAuthenticated}
            className="flex-1 px-3 py-2 rounded-md bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !isAuthenticated}
            className="shrink-0 w-9 h-9 rounded-md bg-accent text-white flex items-center justify-center hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryMode() {
  const { t } = useTranslation();
  const { addPou, selectPou } = useProjectStore();
  const { setActiveChatTab } = useUIStore();
  const [history, setHistory] = useState<HistoryRecord[]>(getHistory);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => setHistory(getHistory());

  const handleLoad = (record: HistoryRecord) => {
    const newPou = {
      id: crypto.randomUUID(),
      name: record.scenario,
      type: 'PROGRAM' as const,
      language: 'ST' as const,
      varInputs: record.ioList.filter((io) => io.type === 'INPUT'),
      varOutputs: record.ioList.filter((io) => io.type === 'OUTPUT'),
      varLocals: [],
      body: record.code,
      description: `从历史记录加载: ${record.scenario}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addPou(newPou);
    selectPou(newPou.id);
    setActiveChatTab('guided');
  };

  const handleDelete = (id: string) => {
    deleteHistory(id);
    refresh();
    setConfirmDelete(null);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-[240px]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sidebar-active border border-border mb-4" aria-hidden="true">
              <Clock size={20} className="text-text-muted" />
            </div>
            <h3 className="text-sm font-medium text-text-primary mb-1">{t('chatPanel.noHistory')}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{t('chatPanel.noHistoryHint')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-xs text-text-secondary">{t('chatPanel.historyCount', { count: history.length })}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {history.map((record) => (
          <div
            key={record.id}
            className="rounded-lg border border-border bg-base p-3 hover:border-accent/40 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => handleLoad(record)}
                className="flex-1 text-left min-w-0"
                title={t('chatPanel.loadToEditor')}
              >
                <div className="text-xs font-medium text-text-primary truncate">{record.scenario}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-text-muted">{new Date(record.timestamp).toLocaleString('zh-CN')}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded bg-sidebar-active text-text-muted">{record.model}</span>
                  <span
                    className="text-[10px] px-1 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: `${getScoreColor(record.validationScore)}20`,
                      color: getScoreColor(record.validationScore),
                    }}
                  >
                    {record.validationScore}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {confirmDelete === record.id ? (
                  <>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-error/10 text-error hover:bg-error/20 transition-colors"
                    >
                      {t('common.confirm')}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-sidebar-active text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(record.id)}
                    className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                    title={t('common.delete')}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
