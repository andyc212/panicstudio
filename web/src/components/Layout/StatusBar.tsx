import { Circle, Wifi, Cpu, Edit3, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useProjectStore } from '@stores';
import { useState } from 'react';

function LanguageToggle() {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    try {
      localStorage.setItem('panicstudio-language', newLang);
    } catch {
      // ignore
    }
  };
  return (
    <button
      onClick={toggleLanguage}
      className="text-[11px] px-1.5 py-0.5 rounded border border-border hover:bg-sidebar-hover transition-colors"
      type="button"
    >
      {i18n.language === 'zh' ? 'EN' : '中'}
    </button>
  );
}

export function StatusBar() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { currentProject, renameProject, hasUnsavedChanges } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const handleStartEdit = () => {
    if (!currentProject) return;
    setEditName(currentProject.name);
    setIsEditing(true);
  };

  const handleConfirm = () => {
    renameProject(editName.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <footer className="h-statusbar flex items-center justify-between px-3 bg-base-light border-t border-border text-[11px] text-text-muted select-none shrink-0">
      {/* 左侧：PLC 状态 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Circle size={8} className="fill-error text-error" />
          <span>Offline</span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu size={10} />
          <span>FP-XH</span>
        </div>
      </div>

      {/* 中间：项目信息 */}
      <div className="flex items-center gap-3">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="px-1.5 py-0.5 rounded bg-sidebar-hover border border-border text-[11px] text-text-primary focus:outline-none focus:border-accent w-32"
            />
            <button onClick={handleConfirm} className="p-0.5 rounded hover:bg-success/10 text-success transition-colors">
              <Check size={10} />
            </button>
            <button onClick={handleCancel} className="p-0.5 rounded hover:bg-error/10 text-error transition-colors">
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1 hover:text-text-primary transition-colors group"
            title={t('projectTree.rename')}
            type="button"
          >
            <span>{currentProject?.name || t('statusBar.unnamedProject')}</span>
            <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        {hasUnsavedChanges && (
          <>
            <span className="text-border">|</span>
            <span>{t('statusBar.unsaved')}</span>
          </>
        )}
      </div>

      {/* 右侧：网络 + 会员 */}
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div className="flex items-center gap-1">
          <Wifi size={10} />
          <span>{t('statusBar.connected')}</span>
        </div>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1">
            <span className="text-accent font-medium">{user.membership}</span>
            <span>
              ({user.aiQuotaTotal - user.aiQuotaUsed} / {user.aiQuotaTotal})
            </span>
          </div>
        ) : (
          <span>{t('statusBar.guest')}</span>
        )}
      </div>
    </footer>
  );
}
