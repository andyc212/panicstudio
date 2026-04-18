import { useProjectStore } from '@stores';
import { validateSTCode } from '@services/parser/stValidator';
import {
  Folder, FileCode, Plus, ChevronRight, ChevronDown,
  Copy, Trash2, Edit3, MoreVertical, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { POU } from '@types';

const typeLabels: Record<string, string> = {
  PROGRAM: '程序',
  FUNCTION_BLOCK: '功能块',
  FUNCTION: '函数',
};

const typeOrder = ['PROGRAM', 'FUNCTION_BLOCK', 'FUNCTION'];

export function ProjectTree() {
  const {
    currentProject,
    selectedPouId,
    selectPou,
    removePou,
    renamePou,
    duplicatePou,
  } = useProjectStore();
  const [expanded, setExpanded] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    pouId: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const handleRename = useCallback((pouId: string, name: string) => {
    renamePou(pouId, name);
    setEditingId(null);
  }, [renamePou]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pouId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, pouId });
  }, []);

  const grouped = currentProject
    ? typeOrder.reduce<Record<string, POU[]>>((acc, type) => {
        acc[type] = currentProject.poUs.filter((p) => p.type === type);
        return acc;
      }, {})
    : {};

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-base-light">
        <span className="text-xs font-medium text-text-secondary">项目</span>
        <button
          className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors"
          aria-label="新建 POU"
          type="button"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {currentProject ? (
          <div>
            {/* Project name */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-text-primary">
              <Folder size={14} className="text-accent" />
              <span className="text-xs font-medium truncate">{currentProject.name}</span>
            </div>

            {/* POU groups */}
            <div className="ml-4 mt-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
                type="button"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="text-[11px]">POUs</span>
                <span className="text-[10px] text-text-muted ml-1">
                  {currentProject.poUs.length}
                </span>
              </button>

              {expanded && (
                <div className="mt-0.5 space-y-1">
                  {typeOrder.map((type) => {
                    const items = grouped[type];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={type}>
                        <div className="px-2 py-0.5 text-[10px] text-text-muted uppercase tracking-wider">
                          {typeLabels[type] || type}
                        </div>
                        <div className="ml-2 space-y-0.5">
                          {items.map((pou) => (
                            <PouItem
                              key={pou.id}
                              pou={pou}
                              isSelected={selectedPouId === pou.id}
                              isEditing={editingId === pou.id}
                              editName={editName}
                              onSelect={() => selectPou(pou.id)}
                              onContextMenu={(e) => handleContextMenu(e, pou.id)}
                              onStartEdit={() => {
                                setEditingId(pou.id);
                                setEditName(pou.name);
                              }}
                              onEditNameChange={setEditName}
                              onFinishEdit={() => handleRename(pou.id, editName)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-text-muted text-xs mt-4">
            <p>暂无项目</p>
            <p className="text-[10px] mt-1">点击上方 + 新建项目</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-36 rounded-md border border-border bg-base shadow-lg overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem
            icon={<Edit3 size={12} />}
            label="重命名"
            onClick={() => {
              const pou = currentProject?.poUs.find((p) => p.id === contextMenu.pouId);
              if (pou) {
                setEditingId(pou.id);
                setEditName(pou.name);
              }
              setContextMenu(null);
            }}
          />
          <ContextMenuItem
            icon={<Copy size={12} />}
            label="复制"
            onClick={() => {
              duplicatePou(contextMenu.pouId);
              setContextMenu(null);
            }}
          />
          <div className="border-t border-border/50" />
          <ContextMenuItem
            icon={<Trash2 size={12} className="text-error" />}
            label="删除"
            danger
            onClick={() => {
              removePou(contextMenu.pouId);
              setContextMenu(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

function PouItem({
  pou,
  isSelected,
  isEditing,
  editName,
  onSelect,
  onContextMenu,
  onStartEdit,
  onEditNameChange,
  onFinishEdit,
}: {
  pou: POU;
  isSelected: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onStartEdit: () => void;
  onEditNameChange: (v: string) => void;
  onFinishEdit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const validation = validateSTCode(pou.body || '');
  const lineCount = (pou.body || '').split('\n').length;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      onContextMenu={onContextMenu}
      className={`group flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
        isSelected
          ? 'bg-accent/10 text-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-hover'
      }`}
    >
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
        type="button"
      >
        <FileCode size={12} />
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={onFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFinishEdit();
              if (e.key === 'Escape') onStartEdit();
            }}
            className="w-full bg-transparent border border-accent/30 rounded px-1 py-0 text-[11px] outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{pou.name}</span>
        )}
      </button>

      {/* Badges */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] text-text-muted">{lineCount}L</span>
        {validation.passed ? (
          <CheckCircle size={10} className="text-success" />
        ) : (
          <AlertTriangle size={10} className="text-warning" />
        )}
      </div>
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] transition-colors ${
        danger
          ? 'text-error hover:bg-error/10'
          : 'text-text-secondary hover:bg-sidebar-hover'
      }`}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
