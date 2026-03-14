import { create } from 'zustand';

// Command pattern: each command stores execute + undo data
// so we can replay backwards (undo) or forwards (redo).

export const useUndoStore = create((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxHistory: 30,

  // Push a command onto the undo stack (clears redo)
  push: (command) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-state.maxHistory + 1), command],
      redoStack: [],
    }));
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  undo: async () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    const command = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, command],
    });

    try {
      await command.undo();
    } catch (err) {
      console.error('Undo failed:', err);
      // Re-push on failure
      set((state) => ({
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      }));
    }
  },

  redo: async () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    const command = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, command],
    });

    try {
      await command.execute();
    } catch (err) {
      console.error('Redo failed:', err);
      set((state) => ({
        redoStack: [...state.redoStack, command],
        undoStack: state.undoStack.slice(0, -1),
      }));
    }
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));

// Command factory helpers
export function createMoveCardCommand({ api, workspaceId, boardId, cardId, fromColumn, fromOrder, toColumn, toOrder, boardStore, socket }) {
  return {
    type: 'move-card',
    description: 'Move card',
    execute: async () => {
      const card = await boardStore.getState().moveCard(workspaceId, boardId, cardId, toColumn, toOrder);
      if (socket) socket.emit('card:moved', { boardId, card, fromColumn });
      return card;
    },
    undo: async () => {
      const card = await boardStore.getState().moveCard(workspaceId, boardId, cardId, fromColumn, fromOrder);
      if (socket) socket.emit('card:moved', { boardId, card, fromColumn: toColumn });
      return card;
    },
  };
}

export function createUpdateCardCommand({ api, workspaceId, boardId, cardId, prevData, newData, boardStore, socket }) {
  return {
    type: 'update-card',
    description: `Update card`,
    execute: async () => {
      const card = await boardStore.getState().updateCard(workspaceId, boardId, cardId, newData);
      if (socket) socket.emit('card:updated', { boardId, card });
      return card;
    },
    undo: async () => {
      const card = await boardStore.getState().updateCard(workspaceId, boardId, cardId, prevData);
      if (socket) socket.emit('card:updated', { boardId, card });
      return card;
    },
  };
}

export function createCardCommand({ api, workspaceId, boardId, cardData, boardStore, socket }) {
  let createdCardId = null;
  return {
    type: 'create-card',
    description: 'Create card',
    execute: async () => {
      const card = await boardStore.getState().createCard(workspaceId, boardId, cardData);
      createdCardId = card._id;
      if (socket) socket.emit('card:created', { boardId, card });
      return card;
    },
    undo: async () => {
      if (createdCardId) {
        await boardStore.getState().deleteCard(workspaceId, boardId, createdCardId);
        if (socket) socket.emit('card:deleted', { boardId, cardId: createdCardId });
      }
    },
  };
}

export function createDeleteCardCommand({ api, workspaceId, boardId, card, boardStore, socket }) {
  return {
    type: 'delete-card',
    description: `Delete "${card.title}"`,
    execute: async () => {
      await boardStore.getState().deleteCard(workspaceId, boardId, card._id);
      if (socket) socket.emit('card:deleted', { boardId, cardId: card._id, cardTitle: card.title });
    },
    undo: async () => {
      const restored = await boardStore.getState().createCard(workspaceId, boardId, {
        title: card.title,
        description: card.description,
        column: card.column,
        labels: card.labels,
        assignees: card.assignees?.map((a) => a._id || a),
        dueDate: card.dueDate,
      });
      if (socket) socket.emit('card:created', { boardId, card: restored });
    },
  };
}
