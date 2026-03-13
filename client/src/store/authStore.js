import { create } from 'zustand';
import { api } from '../utils/api.js';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const { user } = await api.getMe();
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const { user, token } = await api.login({ email, password });
      localStorage.setItem('token', token);
      set({ user, token, error: null });
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ error: null });
    try {
      const { user, token } = await api.register({ name, email, password });
      localStorage.setItem('token', token);
      set({ user, token, error: null });
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
