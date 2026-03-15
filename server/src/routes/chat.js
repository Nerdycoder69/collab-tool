import { Router } from 'express';
import Message from '../models/Message.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/workspaces/:workspaceId/boards/:boardId/messages — fetch chat history
router.get(
  '/:workspaceId/boards/:boardId/messages',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    try {
      const { before } = req.query;
      const query = { board: req.params.boardId };

      // Cursor-based pagination — fetch messages older than `before`
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('author', 'name email avatar');

      // Return in chronological order (still encrypted — client decrypts)
      res.json({ messages: messages.reverse() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/workspaces/:workspaceId/boards/:boardId/messages — send encrypted message
router.post(
  '/:workspaceId/boards/:boardId/messages',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    try {
      const { ciphertext, iv } = req.body;

      if (!ciphertext || !iv) {
        return res.status(400).json({ error: 'Encrypted message data is required' });
      }

      const message = await Message.create({
        board: req.params.boardId,
        author: req.user._id,
        ciphertext,
        iv,
      });

      await message.populate('author', 'name email avatar');
      res.status(201).json({ message });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
