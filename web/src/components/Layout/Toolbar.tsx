import { useState } from 'react';
import { Zap, FolderOpen, Save, Download, Settings, User, Menu, LogOut } from 'lucide-react';
import { useUIStore, useAuthStore, useProjectStore } from '@stores';
import { AuthModal } from '@components/AuthModal';

export function Toolbar() {
  const { toggleLeftPanel, toggleRightPanel } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <header className="h-toolbar flex items-center justify-between px-3 bg-base-light border-b border-border select-none shrink-0">
        {/* 左侧：Logo + 面板切换 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLeftPanel}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
            title="切换 AI 面板"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-1.5 ml-1">
            <Zap size={20} className="text-accent" />
            <span className="font-semibold text-text-primary text-sm tracking-tight">
              PanicStudio
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
              BETA
            </span>
          </div>
        </div>

        {/* 中间：核心操作 */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={<FolderOpen size={16} />} label="打开" />
          <ToolbarButton icon={<Save size={16} />} label="保存" />
          <div className="w-px h-5 bg-border mx-1" />
          <ExportButton />
        </div>

        {/* 右侧：设置 + 用户 */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={<Settings size={16} />} label="设置" />
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
            title="切换项目面板"
          >
            <Menu size={18} />
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-[11px] px-2 py-1 rounded-md bg-accent/10 text-accent font-medium">
                {user.membership}
              </span>
              <span className="text-xs text-text-secondary max-w-[80px] truncate">
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                title="退出登录"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
            >
              <User size={16} />
              <span className="text-xs">登录</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

function ToolbarButton({
  icon,
  label,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'accent';
}) {
  const baseClasses =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors';
  const variantClasses =
    variant === 'accent'
      ? 'bg-accent/10 text-accent hover:bg-accent/20'
      : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-hover';

  return (
    <button className={`${baseClasses} ${variantClasses}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ExportButton() {
  const { currentProject, selectedPouId } = useProjectStore();
  const selectedPou = currentProject?.poUs.find((p: import('@types').POU) => p.id === selectedPouId);

  const handleExport = () => {
    if (!selectedPou) return;

    const content = selectedPou.body || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPou.name}.st`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!selectedPou}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download size={16} />
      <span>导出 .st</span>
    </button>
  );
}
