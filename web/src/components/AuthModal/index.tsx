import { useState } from 'react';
import { useAuthStore } from '@stores';
import { login, register } from '@services/api/auth';
import { X, Eye, EyeOff, Zap } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login: loginStore } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const response = await login({ email, password });
        localStorage.setItem('panicstudio-token', response.token);
        loginStore(response.user, response.token);
        onClose();
      } else {
        const response = await register({ email, password, name: name || undefined });
        localStorage.setItem('panicstudio-token', response.token);
        loginStore(response.user, response.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-base-light shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-accent" />
            <span className="font-semibold text-text-primary">{mode === 'login' ? '登录' : '注册'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">昵称（可选）</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
                className="w-full px-3 py-2 rounded-lg bg-base border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-text-secondary mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-3 py-2 rounded-lg bg-base border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少6位' : '你的密码'}
                required
                minLength={6}
                className="w-full px-3 py-2 pr-10 rounded-lg bg-base border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-error/10 border border-error/20 text-xs text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-text-secondary">
          {mode === 'login' ? (
            <>
              还没有账号？{' '}
              <button onClick={() => { setMode('register'); setError(''); }} className="text-accent hover:text-accent-light transition-colors">
                立即注册
              </button>
            </>
          ) : (
            <>
              已有账号？{' '}
              <button onClick={() => { setMode('login'); setError(''); }} className="text-accent hover:text-accent-light transition-colors">
                直接登录
              </button>
            </>
          )}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-sidebar-hover text-center">
          <p className="text-[11px] text-text-secondary">免费版每月 50 次 AI 生成额度</p>
          <p className="text-[10px] text-text-muted mt-0.5">注册即可开始使用</p>
        </div>
      </div>
    </div>
  );
}
