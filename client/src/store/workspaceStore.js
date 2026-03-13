import { create } from 'zustand';
import { api } from '../utils/api.js';

export const useWorkspaceStore = create((set) => ({
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const { workspaces } = await api.getWorkspaces();
      set({ workspaces, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchWorkspace: async (id) => {
    set({ loading: true });
    try {
      const { workspace } = await api.getWorkspace(id);
      set({ currentWorkspace: workspace, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createWorkspace: async (name, description) => {
    try {
      const { workspace } = await api.createWorkspace({ name, description });
      set((state) => ({ workspaces: [...state.workspaces, workspace] }));
      return workspace;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },
}));
