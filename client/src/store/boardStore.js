import { create } from 'zustand';
import { produce } from 'immer';
import { api } from '../utils/api.js';

export const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoard: null,
  cards: [],
  onlineUsers: [],
  loading: false,
  error: null,

  fetchBoards: async (workspaceId) => {
    set({ loading: true });
    try {
      const { boards } = await api.getBoards(workspaceId);
      set({ boards, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchBoard: async (workspaceId, boardId) => {
    set({ loading: true });
    try {
      const { board, cards } = await api.getBoard(workspaceId, boardId);
      set({ currentBoard: board, cards, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createBoard: async (workspaceId, title) => {
    try {
      const { board } = await api.createBoard(workspaceId, { title });
      set((state) => ({ boards: [...state.boards, board] }));
      return board;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  // ── Optimistic card creation ──
  createCard: async (workspaceId, boardId, cardData) => {
    // Optimistic: add a temporary card immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticCard = {
      _id: tempId,
      ...cardData,
      board: boardId,
      comments: [],
      createdAt: new Date().toISOString(),
    };

    set(
      produce((state) => {
        state.cards.push(optimisticCard);
      })
    );

    try {
      const { card } = await api.createCard(workspaceId, boardId, cardData);
      // Replace optimistic card with real one
      set(
        produce((state) => {
          const idx = state.cards.findIndex((c) => c._id === tempId);
          if (idx !== -1) state.cards[idx] = card;
        })
      );
      return card;
    } catch (err) {
      // Rollback on failure
      set(
        produce((state) => {
          state.cards = state.cards.filter((c) => c._id !== tempId);
        })
      );
      set({ error: err.message });
      throw err;
    }
  },

  // ── Optimistic card update ──
  updateCard: async (workspaceId, boardId, cardId, updates) => {
    // Snapshot for rollback
    const prevCards = get().cards;

    // Optimistic update
    set(
      produce((state) => {
        const card = state.cards.find((c) => c._id === cardId);
        if (card) Object.assign(card, updates);
      })
    );

    try {
      const { card } = await api.updateCard(
        workspaceId,
        boardId,
        cardId,
        updates
      );
      set(
        produce((state) => {
          const idx = state.cards.findIndex((c) => c._id === cardId);
          if (idx !== -1) state.cards[idx] = card;
        })
      );
      return card;
    } catch (err) {
      // Rollback
      set({ cards: prevCards, error: err.message });
      throw err;
    }
  },

  // ── Optimistic card move (drag & drop between columns) ──
  moveCard: async (workspaceId, boardId, cardId, column, order) => {
    const prevCards = get().cards;

    // Optimistic move
    set(
      produce((state) => {
        const card = state.cards.find((c) => c._id === cardId);
        if (card) {
          card.column = column;
          card.order = order;
        }
      })
    );

    try {
      const { card } = await api.moveCard(workspaceId, boardId, cardId, {
        column,
        order,
      });
      set(
        produce((state) => {
          const idx = state.cards.findIndex((c) => c._id === cardId);
          if (idx !== -1) state.cards[idx] = card;
        })
      );
      return card;
    } catch (err) {
      set({ cards: prevCards, error: err.message });
      throw err;
    }
  },

  // ── Optimistic card delete ──
  deleteCard: async (workspaceId, boardId, cardId) => {
    const prevCards = get().cards;

    set(
      produce((state) => {
        state.cards = state.cards.filter((c) => c._id !== cardId);
      })
    );

    try {
      await api.deleteCard(workspaceId, boardId, cardId);
    } catch (err) {
      set({ cards: prevCards, error: err.message });
      throw err;
    }
  },

  // ── Remote events from Socket.io ──
  handleRemoteCardCreated: (data) => {
    set(
      produce((state) => {
        if (!state.cards.find((c) => c._id === data.card._id)) {
          state.cards.push(data.card);
        }
      })
    );
  },

  handleRemoteCardUpdated: (data) => {
    set(
      produce((state) => {
        const idx = state.cards.findIndex((c) => c._id === data.card._id);
        if (idx !== -1) state.cards[idx] = data.card;
      })
    );
  },

  handleRemoteCardMoved: (data) => {
    set(
      produce((state) => {
        const idx = state.cards.findIndex((c) => c._id === data.card._id);
        if (idx !== -1) state.cards[idx] = data.card;
      })
    );
  },

  handleRemoteCardDeleted: (data) => {
    set(
      produce((state) => {
        state.cards = state.cards.filter((c) => c._id !== data.cardId);
      })
    );
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  clearBoard: () =>
    set({ currentBoard: null, cards: [], onlineUsers: [], loading: false }),
}));
