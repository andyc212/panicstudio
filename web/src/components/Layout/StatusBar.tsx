import { Circle, Wifi, Cpu } from 'lucide-react';
import { useAuthStore } from '@stores';

export function StatusBar() {
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
        <span>未命名项目</span>
        <span className="text-border">|</span>
        <span>未保存更改</span>
      </div>

      {/* 右侧：网络 + 会员 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Wifi size={10} />
          <span>已连接</span>
        </div>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1">
            <span className="text-accent font-medium">{user.membership}</span>
            <span>
              ({user.aiQuotaTotal - user.aiQuotaUsed} / {user.aiQuotaTotal})
            </span>
          </div>
        ) : (
          <span>访客模式</span>
        )}
      </div>
    </footer>
  );
}
