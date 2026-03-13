import { Router } from 'express';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/workspaces/:workspaceId/boards
router.get(
  '/:workspaceId/boards',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    try {
      const boards = await Board.find({
        workspace: req.params.workspaceId,
      }).populate('createdBy', 'name email avatar');
      res.json({ boards });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/workspaces/:workspaceId/boards
router.post(
  '/:workspaceId/boards',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Board title is required' });
      }

      const board = await Board.create({
        title,
        workspace: req.params.workspaceId,
        createdBy: req.user._id,
        columns: [
          { title: 'To Do', order: 0 },
          { title: 'In Progress', order: 1 },
          { title: 'Done', order: 2 },
        ],
      });

      res.status(201).json({ board });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// GET /api/workspaces/:workspaceId/boards/:boardId
router.get(
  '/:workspaceId/boards/:boardId',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    try {
      const board = await Board.findOne({
        _id: req.params.boardId,
        workspace: req.params.workspaceId,
      }).populate('createdBy', 'name email avatar');

      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }

      const cards = await Card.find({ board: board._id })
        .populate('assignees', 'name email avatar')
        .populate('createdBy', 'name email avatar')
        .populate('comments.author', 'name email avatar')
        .sort({ column: 1, order: 1 });

      res.json({ board, cards });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/workspaces/:workspaceId/boards/:boardId
router.patch(
  '/:workspaceId/boards/:boardId',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const { title, columns } = req.body;
      const board = await Board.findOne({
        _id: req.params.boardId,
        workspace: req.params.workspaceId,
      });

      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }

      if (title) board.title = title;
      if (columns) board.columns = columns;
      await board.save();
      res.json({ board });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE /api/workspaces/:workspaceId/boards/:boardId
router.delete(
  '/:workspaceId/boards/:boardId',
  authorize('owner'),
  async (req, res) => {
    try {
      const board = await Board.findOneAndDelete({
        _id: req.params.boardId,
        workspace: req.params.workspaceId,
      });

      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }

      // Cascade delete all cards on this board
      await Card.deleteMany({ board: board._id });
      res.json({ message: 'Board deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
