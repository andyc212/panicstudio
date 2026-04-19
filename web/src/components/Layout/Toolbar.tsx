import { useState } from 'react';
import { Zap, FolderOpen, Save, Download, Settings, User, Menu, LogOut, Sun, Moon } from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, IS_PRODUCTION } from '@/config/version';
import { useTranslation } from 'react-i18next';
import { useUIStore, useAuthStore, useProjectStore } from '@stores';
import { AuthModal } from '@components/AuthModal';
import { SettingsModal } from '@components/Settings';

export function Toolbar() {
  const { t } = useTranslation();
  const { toggleLeftPanel, toggleRightPanel, theme, setTheme } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="h-toolbar flex items-center justify-between px-3 bg-base-light border-b border-border select-none shrink-0">
        {/* 左侧：Logo + 面板切换 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLeftPanel}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
            title={t('toolbar.toggleLeft')}
            aria-label={t('toolbar.toggleLeft')}
            type="button"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-1.5 ml-1 group relative">
            <Zap size={20} className="text-accent" />
            <span className="font-semibold text-text-primary text-sm tracking-tight">
              PLC-AIStudio
            </span>
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              type="button"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
              BETA
            </span>
            <span className="text-[10px] text-text-muted">
              v{APP_VERSION}
            </span>
            {/* Version Tooltip */}
            <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50">
              <div className="rounded-md border border-border bg-base shadow-lg px-3 py-2 whitespace-nowrap">
                <div className="text-[10px] text-text-secondary">
                  Build: {new Date(APP_BUILD_DATE).toLocaleString()}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {IS_PRODUCTION ? '🟢 Production' : '🟠 Preview'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 中间：核心操作 */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={<FolderOpen size={16} />} label={t('toolbar.open')} />
          <ToolbarButton icon={<Save size={16} />} label={t('toolbar.save')} />
          <div className="w-px h-5 bg-border mx-1" />
          <ExportButton />
        </div>

        {/* 右侧：设置 + 用户 */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={<Settings size={16} />} label={t('toolbar.settings')} onClick={() => setShowSettings(true)} />
          <div className="w-px h-5 bg-border mx-1" />
          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
            title={t('toolbar.toggleRight')}
            aria-label={t('toolbar.toggleRight')}
            type="button"
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
                title={t('toolbar.logout')}
                aria-label={t('toolbar.logout')}
                type="button"
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
              <span className="text-xs">{t('auth.login')}</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

function ToolbarButton({
  icon,
  label,
  variant = 'default',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'accent';
  onClick?: () => void;
}) {
  const baseClasses =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors';
  const variantClasses =
    variant === 'accent'
      ? 'bg-accent/10 text-accent hover:bg-accent/20'
      : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-hover';

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses}`} type="button">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ExportButton() {
  const { t } = useTranslation();
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
      type="button"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download size={16} />
      <span>{t('toolbar.exportSt')}</span>
    </button>
  );
}
