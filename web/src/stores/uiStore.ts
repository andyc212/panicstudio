import { create } from 'zustand';

interface UIState {
  // 侧边栏折叠状态
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  // 面板尺寸
  leftPanelWidth: number;
  rightPanelWidth: number;
  // 编辑器分栏比例
  editorSplitRatio: number; // 0.5 ~ 0.8
  // 主题
  theme: 'dark' | 'light';
  // 当前激活的 Tab
  activeChatTab: 'guided' | 'chat' | 'history';
  // Onboarding 状态
  onboardingCompleted: boolean;
  // 操作
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setEditorSplitRatio: (ratio: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveChatTab: (tab: 'guided' | 'chat' | 'history') => void;
  completeOnboarding: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  leftPanelWidth: 300,
  rightPanelWidth: 260,
  editorSplitRatio: 0.6,
  theme: 'dark',
  activeChatTab: 'guided',
  onboardingCompleted: false,

  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  setEditorSplitRatio: (ratio) => set({ editorSplitRatio: ratio }),
  setTheme: (theme) => set({ theme }),
  setActiveChatTab: (tab) => set({ activeChatTab: tab }),
  completeOnboarding: () => set({ onboardingCompleted: true }),
}));
