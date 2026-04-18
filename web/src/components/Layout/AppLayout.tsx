import { useUIStore } from '@stores';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

interface AppLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function AppLayout({ leftPanel, centerPanel, rightPanel }: AppLayoutProps) {
  const {
    leftPanelCollapsed,
    rightPanelCollapsed,
    leftPanelWidth,
    rightPanelWidth,
    toggleLeftPanel,
    toggleRightPanel,
  } = useUIStore(
    useShallow((s) => ({
      leftPanelCollapsed: s.leftPanelCollapsed,
      rightPanelCollapsed: s.rightPanelCollapsed,
      leftPanelWidth: s.leftPanelWidth,
      rightPanelWidth: s.rightPanelWidth,
      toggleLeftPanel: s.toggleLeftPanel,
      toggleRightPanel: s.toggleRightPanel,
    }))
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-base text-text-primary overflow-hidden">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 主工作区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板：AI 助手 */}
        {!leftPanelCollapsed && (
          <aside
            className="shrink-0 border-r border-border bg-sidebar flex flex-col relative group"
            style={{ width: leftPanelWidth }}
          >
            <button
              type="button"
              onClick={toggleLeftPanel}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-2 rounded bg-sidebar-hover border border-border text-text-muted hover:text-text-primary"
              title="折叠左侧面板"
              aria-label="折叠左侧面板"
            >
              <PanelLeftClose size={14} />
            </button>
            {leftPanel}
          </aside>
        )}

        {/* 左侧面板折叠后的触发条 */}
        {leftPanelCollapsed && (
          <button
            type="button"
            onClick={toggleLeftPanel}
            className="w-8 shrink-0 bg-sidebar border-r border-border hover:bg-sidebar-hover flex items-center justify-center transition-colors cursor-pointer"
            title="展开左侧面板"
            aria-label="展开左侧面板"
          >
            <PanelLeftOpen size={14} className="text-text-muted" />
          </button>
        )}

        {/* 中央工作区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {centerPanel}
        </main>

        {/* 右侧面板折叠后的触发条 */}
        {rightPanelCollapsed && (
          <button
            type="button"
            onClick={toggleRightPanel}
            className="w-8 shrink-0 bg-sidebar border-l border-border hover:bg-sidebar-hover flex items-center justify-center transition-colors cursor-pointer"
            title="展开右侧面板"
            aria-label="展开右侧面板"
          >
            <PanelRightOpen size={14} className="text-text-muted" />
          </button>
        )}

        {/* 右侧面板：项目导航 */}
        {!rightPanelCollapsed && (
          <aside
            className="shrink-0 border-l border-border bg-sidebar flex flex-col relative group"
            style={{ width: rightPanelWidth }}
          >
            <button
              type="button"
              onClick={toggleRightPanel}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-2 rounded bg-sidebar-hover border border-border text-text-muted hover:text-text-primary"
              title="折叠右侧面板"
              aria-label="折叠右侧面板"
            >
              <PanelRightClose size={14} />
            </button>
            {rightPanel}
          </aside>
        )}
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  );
}
