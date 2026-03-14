import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Board from '../models/Board.js';
import Message from '../models/Message.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';

// Track online users per workspace: Map<workspaceId, Map<socketId, user>>
const workspacePresence = new Map();

// Track which user is on which socket for notifications
const userSockets = new Map(); // userId -> Set<socketId>

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

    // Track user socket for notifications
    const userId = socket.user._id.toString();
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

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
      // Broadcast that this user is viewing the board
      socket.to(`board:${boardId}`).emit('presence:viewing', {
        user: { _id: socket.user._id, name: socket.user.name, avatar: socket.user.avatar },
        viewing: { type: 'board', id: boardId },
      });
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('presence:left', {
        user: { _id: socket.user._id },
      });
    });

    // ── Presence: what the user is looking at ──
    socket.on('presence:focus', (data) => {
      // data: { boardId, viewing: { type: 'card'|'column'|'board', id, title } }
      socket.to(`board:${data.boardId}`).emit('presence:viewing', {
        user: { _id: socket.user._id, name: socket.user.name, avatar: socket.user.avatar },
        viewing: data.viewing,
      });
    });

    // ── Card events — broadcast to all other users on the board ──
    socket.on('card:created', async (data) => {
      socket.to(`board:${data.boardId}`).emit('card:created', data);

      // Log activity
      try {
        const board = await Board.findById(data.boardId);
        if (board) {
          const activity = await Activity.create({
            workspace: board.workspace,
            board: board._id,
            card: data.card?._id,
            user: socket.user._id,
            action: 'card:created',
            details: { cardTitle: data.card?.title, boardTitle: board.title },
          });
          await activity.populate('user', 'name email avatar');
          io.to(`workspace:${board.workspace}`).emit('activity:new', { activity });
        }
      } catch (err) {
        console.error('Activity log error:', err.message);
      }
    });

    socket.on('card:updated', async (data) => {
      socket.to(`board:${data.boardId}`).emit('card:updated', data);

      try {
        const board = await Board.findById(data.boardId);
        if (board) {
          const activity = await Activity.create({
            workspace: board.workspace,
            board: board._id,
            card: data.card?._id,
            user: socket.user._id,
            action: 'card:updated',
            details: { cardTitle: data.card?.title, boardTitle: board.title },
          });
          await activity.populate('user', 'name email avatar');
          io.to(`workspace:${board.workspace}`).emit('activity:new', { activity });
        }
      } catch (err) {
        console.error('Activity log error:', err.message);
      }
    });

    socket.on('card:moved', async (data) => {
      socket.to(`board:${data.boardId}`).emit('card:moved', data);

      try {
        const board = await Board.findById(data.boardId);
        if (board) {
          const fromCol = board.columns.find(
            (c) => c._id.toString() === data.fromColumn?.toString()
          );
          const toCol = board.columns.find(
            (c) => c._id.toString() === data.card?.column?.toString()
          );
          const activity = await Activity.create({
            workspace: board.workspace,
            board: board._id,
            card: data.card?._id,
            user: socket.user._id,
            action: 'card:moved',
            details: {
              cardTitle: data.card?.title,
              fromColumn: fromCol?.title || 'Unknown',
              toColumn: toCol?.title || 'Unknown',
              boardTitle: board.title,
            },
          });
          await activity.populate('user', 'name email avatar');
          io.to(`workspace:${board.workspace}`).emit('activity:new', { activity });
        }
      } catch (err) {
        console.error('Activity log error:', err.message);
      }
    });

    socket.on('card:deleted', async (data) => {
      socket.to(`board:${data.boardId}`).emit('card:deleted', data);

      try {
        const board = await Board.findById(data.boardId);
        if (board) {
          const activity = await Activity.create({
            workspace: board.workspace,
            board: board._id,
            user: socket.user._id,
            action: 'card:deleted',
            details: { cardTitle: data.cardTitle || 'Untitled', boardTitle: board.title },
          });
          await activity.populate('user', 'name email avatar');
          io.to(`workspace:${board.workspace}`).emit('activity:new', { activity });
        }
      } catch (err) {
        console.error('Activity log error:', err.message);
      }
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

    // ── Chat messages ──
    socket.on('chat:send', async (data) => {
      try {
        const { boardId, text } = data;
        if (!boardId || !text?.trim()) return;

        const message = await Message.create({
          board: boardId,
          author: socket.user._id,
          text: text.trim(),
        });

        await message.populate('author', 'name email avatar');

        // Broadcast to everyone in the board room (including sender)
        io.to(`board:${boardId}`).emit('chat:message', { message });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('chat:typing', (data) => {
      socket.to(`board:${data.boardId}`).emit('chat:typing', {
        user: {
          _id: socket.user._id,
          name: socket.user.name,
        },
      });
    });

    // ── Comment with @mentions ──
    socket.on('card:commented', async (data) => {
      const { boardId, cardId, comment, mentions } = data;

      try {
        const board = await Board.findById(boardId);
        if (!board) return;

        // Log activity
        const activity = await Activity.create({
          workspace: board.workspace,
          board: board._id,
          card: cardId,
          user: socket.user._id,
          action: 'card:commented',
          details: {
            cardTitle: data.cardTitle || '',
            commentText: comment?.text?.substring(0, 100),
            boardTitle: board.title,
          },
        });
        await activity.populate('user', 'name email avatar');
        io.to(`workspace:${board.workspace}`).emit('activity:new', { activity });

        // Broadcast card update to board
        socket.to(`board:${boardId}`).emit('card:updated', data);

        // Create notifications for @mentions
        if (mentions && mentions.length > 0) {
          const mentionedUsers = await User.find({
            name: { $in: mentions },
          });

          for (const mentionedUser of mentionedUsers) {
            if (mentionedUser._id.toString() === socket.user._id.toString()) continue;

            const notification = await Notification.create({
              recipient: mentionedUser._id,
              sender: socket.user._id,
              type: 'mention',
              workspace: board.workspace,
              board: board._id,
              card: cardId,
              message: `${socket.user.name} mentioned you in a comment on "${data.cardTitle || 'a card'}"`,
            });

            await notification.populate('sender', 'name email avatar');

            // Send real-time notification to mentioned user
            const targetSockets = userSockets.get(mentionedUser._id.toString());
            if (targetSockets) {
              for (const sid of targetSockets) {
                io.to(sid).emit('notification:new', { notification });
              }
            }
          }
        }
      } catch (err) {
        console.error('Comment activity error:', err.message);
      }
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

      // Remove from user sockets tracking
      const uid = socket.user._id.toString();
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(uid);
      }

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
