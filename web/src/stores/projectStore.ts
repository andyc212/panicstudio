import { create } from 'zustand';
import type { PLCProject, POU, IOEntry } from '@types';

interface ProjectState {
  // 当前项目
  currentProject: PLCProject | null;
  // 当前选中的 POU
  selectedPouId: string | null;
  // 是否有未保存的更改
  hasUnsavedChanges: boolean;
  // 最近打开的项目列表
  recentProjects: { id: string; name: string; openedAt: string }[];

  // 操作
  setCurrentProject: (project: PLCProject | null) => void;
  selectPou: (pouId: string) => void;
  updatePouBody: (pouId: string, body: string) => void;
  updatePouVars: (pouId: string, vars: { inputs?: IOEntry[]; outputs?: IOEntry[]; locals?: IOEntry[] }) => void;
  addPou: (pou: POU) => void;
  removePou: (pouId: string) => void;
  markAsSaved: () => void;
  markAsUnsaved: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  selectedPouId: null,
  hasUnsavedChanges: false,
  recentProjects: [],

  setCurrentProject: (project) => set({ currentProject: project, selectedPouId: project?.poUs[0]?.id ?? null, hasUnsavedChanges: false }),

  selectPou: (pouId) => set({ selectedPouId: pouId }),

  updatePouBody: (pouId, body) =>
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          poUs: state.currentProject.poUs.map((p) =>
            p.id === pouId ? { ...p, body, updatedAt: new Date().toISOString() } : p
          ),
        },
        hasUnsavedChanges: true,
      };
    }),

  updatePouVars: (pouId, vars) =>
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          poUs: state.currentProject.poUs.map((p) =>
            p.id === pouId
              ? {
                  ...p,
                  varInputs: vars.inputs ?? p.varInputs,
                  varOutputs: vars.outputs ?? p.varOutputs,
                  varLocals: vars.locals ?? p.varLocals,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        },
        hasUnsavedChanges: true,
      };
    }),

  addPou: (pou) =>
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          poUs: [...state.currentProject.poUs, pou],
        },
        hasUnsavedChanges: true,
      };
    }),

  removePou: (pouId) =>
    set((state) => {
      if (!state.currentProject) return state;
      const newPoUs = state.currentProject.poUs.filter((p) => p.id !== pouId);
      return {
        currentProject: { ...state.currentProject, poUs: newPoUs },
        selectedPouId: state.selectedPouId === pouId ? newPoUs[0]?.id ?? null : state.selectedPouId,
        hasUnsavedChanges: true,
      };
    }),

  markAsSaved: () => set({ hasUnsavedChanges: false }),
  markAsUnsaved: () => set({ hasUnsavedChanges: true }),
}));
