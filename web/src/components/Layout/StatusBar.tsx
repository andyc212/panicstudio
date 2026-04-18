import { Circle, Wifi, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@stores';

function LanguageToggle() {
  const { i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('panicstudio-language', newLang);
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
        <span>{t('statusBar.unnamedProject')}</span>
        <span className="text-border">|</span>
        <span>{t('statusBar.unsaved')}</span>
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
