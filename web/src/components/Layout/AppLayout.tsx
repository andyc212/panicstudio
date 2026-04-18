import { useUIStore } from '@stores';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';

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
  } = useUIStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-base text-text-primary overflow-hidden">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 主工作区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板：AI 助手 */}
        {!leftPanelCollapsed && (
          <aside
            className="shrink-0 border-r border-border bg-sidebar flex flex-col"
            style={{ width: leftPanelWidth }}
          >
            {leftPanel}
          </aside>
        )}

        {/* 左侧面板折叠后的触发条 */}
        {leftPanelCollapsed && (
          <div className="w-1 shrink-0 bg-border hover:bg-accent cursor-pointer transition-colors" />
        )}

        {/* 中央工作区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {centerPanel}
        </main>

        {/* 右侧面板折叠后的触发条 */}
        {rightPanelCollapsed && (
          <div className="w-1 shrink-0 bg-border hover:bg-accent cursor-pointer transition-colors" />
        )}

        {/* 右侧面板：项目导航 */}
        {!rightPanelCollapsed && (
          <aside
            className="shrink-0 border-l border-border bg-sidebar flex flex-col"
            style={{ width: rightPanelWidth }}
          >
            {rightPanel}
          </aside>
        )}
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  );
}
