import { useState, useEffect } from 'react';
import { X, Globe, Info, Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@stores';
import { APP_VERSION, APP_BUILD_DATE, IS_PRODUCTION } from '@/config/version';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useUIStore();
  const [selectedLang, setSelectedLang] = useState(i18n.language === 'zh' ? 'zh' : 'en');
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>(theme);

  // Reset selectedLang when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLang(i18n.language === 'zh' ? 'zh' : 'en');
      setSelectedTheme(theme);
    }
  }, [isOpen, i18n.language, theme]);

  if (!isOpen) return null;

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  const handleConfirm = () => {
    i18n.changeLanguage(selectedLang);
    try {
      localStorage.setItem('panicstudio-language', selectedLang);
    } catch {
      // ignore
    }
    setTheme(selectedTheme);
    onClose();
  };

  const handleCancel = () => {
    setSelectedLang(i18n.language === 'zh' ? 'zh' : 'en');
    setSelectedTheme(theme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancel}>
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{t('settings.title')}</h2>
          <button
            onClick={handleCancel}
            className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors"
            aria-label={t('settings.close')}
            type="button"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {selectedTheme === 'dark' ? <Moon size={14} className="text-text-muted" /> : <Sun size={14} className="text-text-muted" />}
              <span className="text-xs font-medium text-text-secondary">{t('settings.theme')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedTheme('dark')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
                  selectedTheme === 'dark'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-sidebar-hover text-text-secondary hover:border-accent/40 hover:text-text-primary'
                }`}
                type="button"
              >
                <Moon size={14} />
                <span>{t('settings.dark')}</span>
              </button>
              <button
                onClick={() => setSelectedTheme('light')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
                  selectedTheme === 'light'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-sidebar-hover text-text-secondary hover:border-accent/40 hover:text-text-primary'
                }`}
                type="button"
              >
                <Sun size={14} />
                <span>{t('settings.light')}</span>
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-text-muted" />
              <span className="text-xs font-medium text-text-secondary">{t('settings.language')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
                    selectedLang === lang.code
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-sidebar-hover text-text-secondary hover:border-accent/40 hover:text-text-primary'
                  }`}
                  type="button"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* About */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <Info size={10} />
            <span className="font-medium">{t('settings.about')}</span>
          </div>
          <div className="rounded-md bg-sidebar-hover border border-border p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">{t('settings.version')}</span>
              <span className="text-text-secondary font-medium">v{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">{t('settings.buildTime')}</span>
              <span className="text-text-secondary">{new Date(APP_BUILD_DATE).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">{t('settings.environment')}</span>
              <span className="text-text-secondary">
                {IS_PRODUCTION ? `🟢 ${t('settings.production')}` : `🟠 ${t('settings.preview')}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">{t('settings.deployUrl')}</span>
              <span className="text-text-secondary truncate max-w-[140px]" title={window.location.href}>
                {window.location.href}
              </span>
            </div>
          </div>
          <p className="text-[9px] text-text-muted leading-relaxed">
            {t('settings.rollbackHint')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar-hover transition-colors"
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 rounded-md text-xs bg-accent text-white hover:bg-accent-dark transition-colors"
            type="button"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
