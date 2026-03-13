import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';

// Track online users per workspace: Map<workspaceId, Set<{socketId, user}>>
const workspacePresence = new Map();

export function setupSocket(io) {
  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.id})`);

    // ── Join a workspace room ──
    socket.on('workspace:join', async (workspaceId) => {
      try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace || !workspace.getMemberRole(socket.user._id)) {
          return socket.emit('error', { message: 'Access denied' });
        }

        socket.join(`workspace:${workspaceId}`);

        // Track presence
        if (!workspacePresence.has(workspaceId)) {
          workspacePresence.set(workspaceId, new Map());
        }
        workspacePresence.get(workspaceId).set(socket.id, {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        });

        // Broadcast updated presence to workspace
        io.to(`workspace:${workspaceId}`).emit('workspace:presence', {
          users: Array.from(workspacePresence.get(workspaceId).values()),
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Leave a workspace room ──
    socket.on('workspace:leave', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      removePresence(socket, workspaceId, io);
    });

    // ── Join a board room (for card-level real-time updates) ──
    socket.on('board:join', (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    // ── Card events — broadcast to all other users on the board ──
    socket.on('card:created', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:created', data);
    });

    socket.on('card:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:updated', data);
    });

    socket.on('card:moved', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:moved', data);
    });

    socket.on('card:deleted', (data) => {
      socket.to(`board:${data.boardId}`).emit('card:deleted', data);
    });

    // ── Board events ──
    socket.on('board:created', (data) => {
      socket
        .to(`workspace:${data.workspaceId}`)
        .emit('board:created', data);
    });

    socket.on('board:updated', (data) => {
      socket.to(`board:${data.boardId}`).emit('board:updated', data);
    });

    // ── Cursor / typing indicators ──
    socket.on('cursor:move', (data) => {
      socket.to(`board:${data.boardId}`).emit('cursor:move', {
        ...data,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name} (${socket.id})`);
      // Clean up presence from all workspaces
      for (const [workspaceId] of workspacePresence) {
        removePresence(socket, workspaceId, io);
      }
    });
  });
}

function removePresence(socket, workspaceId, io) {
  const presence = workspacePresence.get(workspaceId);
  if (presence) {
    presence.delete(socket.id);
    if (presence.size === 0) {
      workspacePresence.delete(workspaceId);
    } else {
      io.to(`workspace:${workspaceId}`).emit('workspace:presence', {
        users: Array.from(presence.values()),
      });
    }
  }
}
