import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useProjectStore, useUIStore } from '@stores';
import { Search, Command, FileCode, Hash, Zap, X, PanelLeft, PanelRight } from 'lucide-react';

interface PaletteItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  type: 'command' | 'pou' | 'var';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentProject, selectPou } = useProjectStore();
  const { toggleLeftPanel, toggleRightPanel } = useUIStore();

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const all: PaletteItem[] = [];
    const q = query.trim().toLowerCase();
    const mode = q.startsWith('>') ? 'command' : q.startsWith('@') ? 'pou' : q.startsWith('#') ? 'var' : 'all';
    const search = q.replace(/^[>#@]/, '').trim();

    // Commands
    const commands: PaletteItem[] = [
      {
        id: 'cmd-toggle-left',
        label: '切换左侧面板',
        subtitle: '折叠 / 展开 AI 面板',
        icon: <PanelLeft size={14} />,
        action: () => { toggleLeftPanel(); setOpen(false); },
        type: 'command',
      },
      {
        id: 'cmd-toggle-right',
        label: '切换右侧面板',
        subtitle: '折叠 / 展开项目面板',
        icon: <PanelRight size={14} />,
        action: () => { toggleRightPanel(); setOpen(false); },
        type: 'command',
      },
      {
        id: 'cmd-export-project',
        label: '导出项目',
        subtitle: '将所有 POU 打包为 .zip',
        icon: <Zap size={14} />,
        action: () => {
          alert('导出功能开发中');
          setOpen(false);
        },
        type: 'command',
      },
    ];

    if (mode === 'command' || mode === 'all') {
      all.push(...commands.filter((c) =>
        search === '' || c.label.toLowerCase().includes(search) || (c.subtitle && c.subtitle.toLowerCase().includes(search))
      ));
    }

    // POUs
    if (currentProject && (mode === 'pou' || mode === 'all')) {
      currentProject.poUs.forEach((pou) => {
        if (search === '' || pou.name.toLowerCase().includes(search)) {
          all.push({
            id: `pou-${pou.id}`,
            label: pou.name,
            subtitle: `${pou.type} \u00b7 ${pou.language}`,
            icon: <FileCode size={14} />,
            action: () => { selectPou(pou.id); setOpen(false); },
            type: 'pou',
          });
        }
      });
    }

    // Variables
    if (currentProject && (mode === 'var' || mode === 'all')) {
      currentProject.poUs.forEach((pou) => {
        [...pou.varInputs, ...pou.varOutputs, ...pou.varLocals].forEach((v) => {
          if (search === '' || v.name.toLowerCase().includes(search) || v.address?.toLowerCase().includes(search)) {
            all.push({
              id: `var-${pou.id}-${v.name}`,
              label: v.name,
              subtitle: `${v.address || '无地址'} \u00b7 ${pou.name}`,
              icon: <Hash size={14} />,
              action: () => { selectPou(pou.id); setOpen(false); },
              type: 'var',
            });
          }
        });
      });
    }

    return all;
  }, [query, currentProject, toggleLeftPanel, toggleRightPanel, selectPou]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) item.action();
    }
  }, [items, selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-base shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search size={16} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索命令、POU、变量…  (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-sidebar-hover text-text-muted"
            type="button"
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        {/* Hints */}
        {!query && (
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border/50 bg-sidebar-hover/50">
            <span className="text-[10px] text-text-muted">前缀过滤:</span>
            <span className="text-[10px] text-text-secondary"><kbd className="px-1 rounded bg-sidebar-active">@</kbd> POU</span>
            <span className="text-[10px] text-text-secondary"><kbd className="px-1 rounded bg-sidebar-active">#</kbd> 变量</span>
            <span className="text-[10px] text-text-secondary"><kbd className="px-1 rounded bg-sidebar-active">&gt;</kbd> 命令</span>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-text-muted text-sm">
              未找到结果
            </div>
          ) : (
            <div className="py-1">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    index === selectedIndex ? 'bg-sidebar-hover' : ''
                  }`}
                  type="button"
                >
                  <span className="text-text-muted shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-primary truncate">{item.label}</div>
                    {item.subtitle && (
                      <div className="text-[10px] text-text-muted truncate">{item.subtitle}</div>
                    )}
                  </div>
                  {item.type === 'command' && (
                    <Command size={10} className="text-text-muted shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-sidebar-hover/50">
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <span>{items.length} 结果</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <span><kbd className="px-1 rounded bg-sidebar-active">↑↓</kbd> 选择</span>
            <span><kbd className="px-1 rounded bg-sidebar-active">Enter</kbd> 确认</span>
            <span><kbd className="px-1 rounded bg-sidebar-active">Esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}
