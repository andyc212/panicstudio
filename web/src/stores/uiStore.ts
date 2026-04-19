import { create } from 'zustand';

interface UIState {
  // 侧边栏折叠状态
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  // 面板尺寸
  leftPanelWidth: number;
  rightPanelWidth: number;
  // 编辑器分栏比例
  editorSplitRatio: number; // 0.2 ~ 0.85
  // 右侧面板分栏比例
  rightPanelSplitRatio: number; // 0.3 ~ 0.8
  // 主题
  theme: 'dark' | 'light';
  // 当前激活的 Tab
  activeChatTab: 'guided' | 'chat' | 'history';
  // Onboarding 状态
  onboardingCompleted: boolean;
  // 编辑器跳转目标
  editorJumpTarget: { line: number; timestamp: number } | null;
  // 操作
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setEditorSplitRatio: (ratio: number) => void;
  setRightPanelSplitRatio: (ratio: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveChatTab: (tab: 'guided' | 'chat' | 'history') => void;
  completeOnboarding: () => void;
  jumpToLine: (line: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  leftPanelWidth: 300,
  rightPanelWidth: 260,
  editorSplitRatio: 0.6,
  rightPanelSplitRatio: 0.67,
  theme: (() => {
    try {
      const saved = localStorage.getItem('panicstudio-theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  })(),
  activeChatTab: 'guided',
  onboardingCompleted: false,
  editorJumpTarget: null,

  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  setEditorSplitRatio: (ratio) => set({ editorSplitRatio: ratio }),
  setRightPanelSplitRatio: (ratio) => set({ rightPanelSplitRatio: ratio }),
  setTheme: (theme) => {
    try {
      localStorage.setItem('panicstudio-theme', theme);
    } catch {
      // ignore
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  setActiveChatTab: (tab) => set({ activeChatTab: tab }),
  completeOnboarding: () => set({ onboardingCompleted: true }),
  jumpToLine: (line) => set({ editorJumpTarget: { line, timestamp: Date.now() } }),
}));
