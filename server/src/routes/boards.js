import { Router } from 'express';
import crypto from 'crypto';
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

// Board templates
const BOARD_TEMPLATES = {
  kanban: {
    name: 'Kanban',
    description: 'Simple kanban workflow',
    columns: [
      { title: 'Backlog', order: 0 },
      { title: 'To Do', order: 1 },
      { title: 'In Progress', order: 2 },
      { title: 'Review', order: 3 },
      { title: 'Done', order: 4 },
    ],
  },
  sprint: {
    name: 'Sprint Board',
    description: 'Agile sprint planning',
    columns: [
      { title: 'Sprint Backlog', order: 0 },
      { title: 'In Development', order: 1 },
      { title: 'Code Review', order: 2 },
      { title: 'QA Testing', order: 3 },
      { title: 'Ready to Deploy', order: 4 },
      { title: 'Done', order: 5 },
    ],
  },
  roadmap: {
    name: 'Roadmap',
    description: 'Product roadmap planning',
    columns: [
      { title: 'Ideas', order: 0 },
      { title: 'Planned', order: 1 },
      { title: 'In Progress', order: 2 },
      { title: 'Launched', order: 3 },
    ],
  },
  basic: {
    name: 'Basic',
    description: 'Simple three-column board',
    columns: [
      { title: 'To Do', order: 0 },
      { title: 'In Progress', order: 1 },
      { title: 'Done', order: 2 },
    ],
  },
};

// GET /api/workspaces/:workspaceId/boards/templates
router.get(
  '/:workspaceId/boards/templates',
  authorize('owner', 'editor', 'viewer'),
  (req, res) => {
    const templates = Object.entries(BOARD_TEMPLATES).map(([key, t]) => ({
      id: key,
      name: t.name,
      description: t.description,
      columnCount: t.columns.length,
      columns: t.columns.map((c) => c.title),
    }));
    res.json({ templates });
  }
);

// POST /api/workspaces/:workspaceId/boards
router.post(
  '/:workspaceId/boards',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const { title, template } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Board title is required' });
      }

      const tmpl = BOARD_TEMPLATES[template] || BOARD_TEMPLATES.basic;

      // Generate a random AES-256 key for E2E message encryption
      const encryptionKey = crypto.randomBytes(32).toString('base64');

      const board = await Board.create({
        title,
        workspace: req.params.workspaceId,
        createdBy: req.user._id,
        columns: tmpl.columns,
        encryptionKey,
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

      // Backfill encryption key for boards created before E2E was added
      if (!board.encryptionKey) {
        board.encryptionKey = crypto.randomBytes(32).toString('base64');
        await board.save();
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
