import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useUIStore, useProjectStore, useAuthStore } from '@stores';
import { streamAIGeneration } from '@services/api/ai';
import { ValidationPanel } from '@components/ValidationPanel';
import { parseFile } from '@services/parser/fileParser';
import type { ParsedFileResult } from '@services/parser/fileParser';
import {
  MessageSquare, ListOrdered, History, Zap, Loader2,
  Upload, FileText, FileSpreadsheet, X, CheckCircle,
  Sparkles, Clock, Copy, RotateCcw, Edit3, FileDown,
} from 'lucide-react';

export function ChatPanel() {
  const { activeChatTab, setActiveChatTab } = useUIStore();

  const tabs = [
    { id: 'guided' as const, label: '引导生成', icon: <ListOrdered size={14} /> },
    { id: 'chat' as const, label: '自由对话', icon: <MessageSquare size={14} /> },
    { id: 'history' as const, label: '历史', icon: <History size={14} /> },
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
  const { user, isAuthenticated } = useAuthStore();
  const { currentProject, addPou } = useProjectStore();

  // Form state
  const [scenario, setScenario] = useState('');
  const [ioList, setIoList] = useState([{ address: 'X0', type: 'INPUT' as const, dataType: 'BOOL' as const, name: '', description: '' }]);
  const [processSteps, setProcessSteps] = useState([{ description: '' }]);
  const [safetyConditions, setSafetyConditions] = useState([
    { id: '1', description: '急停复位后才能重启', enabled: true },
    { id: '2', description: '电机过载保护', enabled: true },
    { id: '3', description: '安全门联锁', enabled: false },
  ]);
  const [notes, setNotes] = useState('');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; parsed: ParsedFileResult; status: 'parsing' | 'done' | 'error' }>>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
      setError('请先登录');
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
      for await (const chunk of streamAIGeneration(formData as any)) {
        if (chunk.type === 'chunk') {
          code += chunk.content;
          setGeneratedCode(code);
        } else if (chunk.type === 'error') {
          setError(chunk.error || '生成失败');
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
      }
    } catch (err: any) {
      setError(err.message || '生成失败');
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, scenario, ioList, processSteps, safetyConditions, notes, currentProject, uploadedFiles]);

  const handleInsertToEditor = () => {
    // Already auto-created POU
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore
    }
  };

  const handleRegenerate = () => {
    setGeneratedCode('');
    handleGenerate();
  };

  const handleModifyRequest = () => {
    setActiveChatTab('guided');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {!isAuthenticated && (
        <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
          ⚠️ 请先登录以使用 AI 生成功能
        </div>
      )}

      {/* File Upload Area */}
      <div className="rounded-lg border border-dashed border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2 flex items-center gap-1">
          <Upload size={12} />
          上传配置文件（可选）
        </div>
        <p className="text-[10px] text-text-muted mb-2">
          支持 CSV / Excel（I/O清单）、TXT / Word（工艺流程）、自动解析填充表单
        </p>

        <label className="flex items-center justify-center gap-2 w-full py-2 rounded-md bg-sidebar-hover border border-border hover:border-accent hover:bg-sidebar-active transition-colors cursor-pointer">
          <Upload size={14} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">点击上传文件</span>
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
                    {item.parsed.ioList && `${item.parsed.ioList.length} I/O `}
                    {item.parsed.processSteps && `${item.parsed.processSteps.length} 步骤 `}
                    {item.parsed.rawText && '已读取'}
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
        <div className="text-xs font-medium text-accent mb-2">Step 1: 控制场景</div>
        <input
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="例如：电机启停控制"
          className="w-full px-2.5 py-1.5 rounded-md bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {/* Step 2: I/O */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">Step 2: I/O 配置</div>
        <div className="space-y-1.5 max-h-32 overflow-y-auto">
          {ioList.map((io, i) => (
            <div key={i} className="flex gap-1">
              <input value={io.address} onChange={(e) => updateIO(i, 'address', e.target.value)} placeholder="X0" className="w-12 px-1.5 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
              <select value={io.type} onChange={(e) => updateIO(i, 'type', e.target.value)} className="w-16 px-1 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary">
                <option>INPUT</option>
                <option>OUTPUT</option>
              </select>
              <input value={io.name} onChange={(e) => updateIO(i, 'name', e.target.value)} placeholder="变量名" className="flex-1 px-1.5 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
              <input value={io.description} onChange={(e) => updateIO(i, 'description', e.target.value)} placeholder="说明" className="flex-1 px-1.5 py-1 rounded bg-sidebar-hover border border-border text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        <button onClick={addIO} className="mt-1.5 text-[10px] text-accent hover:text-accent-light transition-colors">+ 添加 I/O</button>
      </div>

      {/* Step 3: Process */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">Step 3: 动作流程</div>
        <div className="space-y-1">
          {processSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted w-4">{i + 1}.</span>
              <input value={step.description} onChange={(e) => updateStep(i, e.target.value)} placeholder="动作描述" className="flex-1 px-2 py-1 rounded bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
          ))}
        </div>
        <button onClick={addStep} className="mt-1.5 text-[10px] text-accent hover:text-accent-light transition-colors">+ 添加步骤</button>
      </div>

      {/* Step 4: Safety */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">Step 4: 安全条件</div>
        <div className="space-y-1">
          {safetyConditions.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
              <input type="checkbox" checked={s.enabled} onChange={() => toggleSafety(s.id)} className="rounded border-border bg-sidebar text-accent focus:ring-accent" />
              {s.description}
            </label>
          ))}
        </div>
      </div>

      {/* Step 5: Notes */}
      <div className="rounded-lg border border-border bg-base p-3">
        <div className="text-xs font-medium text-accent mb-2">补充说明（可选）</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="其他特殊要求..." className="w-full px-2 py-1 rounded bg-sidebar-hover border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" />
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
            生成中...
          </>
        ) : (
          <>
            <Zap size={16} />
            生成 PLC 程序
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="p-2 rounded bg-error/10 border border-error/20 text-xs text-error">
          {error}
        </div>
      )}

      {/* Generated Preview */}
      {generatedCode && (
        <div className="rounded-lg border border-border bg-base overflow-hidden">
          {/* Action bar */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-sidebar-hover border-b border-border">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-secondary font-medium">生成结果</span>
              <span className="text-[10px] text-accent ml-1">已自动创建 POU</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title="重新生成"
              >
                <RotateCcw size={10} />
                重新生成
              </button>
              <button
                onClick={handleModifyRequest}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title="修改需求"
              >
                <Edit3 size={10} />
                修改需求
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title="复制代码"
              >
                {copied ? <CheckCircle size={10} className="text-success" /> : <Copy size={10} />}
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${(currentProject?.name || scenario || 'Program').replace(/[^\w\u4e00-\u9fa5]/g, '_')}.st`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-secondary hover:text-text-primary hover:bg-sidebar-active transition-colors"
                title="导出 .st 文件"
              >
                <FileDown size={10} />
                导出
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
          requiredSafetyConditions={safetyConditions.filter((s) => s.enabled).map((s) => s.description)}
        />
      )}
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

function ChatMode() {
  return (
    <ComingSoon
      icon={<MessageSquare size={20} className="text-text-muted" />}
      title="自由对话模式"
      description="通过自然语言直接描述需求，AI 将实时理解并生成对应的 PLC 程序。无需填写表单，像与工程师对话一样简单。"
      hint="预计近期上线"
    />
  );
}

function HistoryMode() {
  return (
    <ComingSoon
      icon={<Clock size={20} className="text-text-muted" />}
      title="生成历史"
      description="查看和管理所有 AI 生成记录，支持版本对比、回滚到任意历史版本，以及批量导出。"
      hint="预计近期上线"
    />
  );
}
