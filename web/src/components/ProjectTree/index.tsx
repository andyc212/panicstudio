import { useProjectStore } from '@stores';
import { Folder, FileCode, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function ProjectTree() {
  const { currentProject, selectedPouId, selectPou } = useProjectStore();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex flex-col h-full">
      {/* 项目树头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-base-light">
        <span className="text-xs font-medium text-text-secondary">项目</span>
        <button className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {/* 项目内容 */}
      <div className="flex-1 overflow-y-auto p-2">
        {currentProject ? (
          <div>
            {/* 项目名称 */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-text-primary">
              <Folder size={14} className="text-accent" />
              <span className="text-xs font-medium">{currentProject.name}</span>
            </div>

            {/* POU 列表 */}
            <div className="ml-4 mt-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="text-[11px]">POUs</span>
              </button>

              {expanded && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {currentProject.poUs.map((pou: import('@types').POU) => (
                    <button
                      key={pou.id}
                      onClick={() => selectPou(pou.id)}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                        selectedPouId === pou.id
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-hover'
                      }`}
                    >
                      <FileCode size={12} />
                      <span className="truncate">{pou.name}</span>
                      <span className="text-[9px] ml-auto opacity-50">{pou.language}</span>
                    </button>
                  ))}
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
    </div>
  );
}
