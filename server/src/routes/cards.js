import { Router } from 'express';
import Card from '../models/Card.js';
import Board from '../models/Board.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// POST /api/workspaces/:workspaceId/boards/:boardId/cards
router.post(
  '/:workspaceId/boards/:boardId/cards',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const { title, description, column, assignees, labels, dueDate } =
        req.body;

      if (!title || !column) {
        return res
          .status(400)
          .json({ error: 'Title and column are required' });
      }

      // Determine order — place at end of column
      const lastCard = await Card.findOne({
        board: req.params.boardId,
        column,
      }).sort({ order: -1 });

      const card = await Card.create({
        title,
        description,
        board: req.params.boardId,
        column,
        order: lastCard ? lastCard.order + 1 : 0,
        assignees: assignees || [],
        labels: labels || [],
        dueDate,
        createdBy: req.user._id,
      });

      await card.populate('assignees', 'name email avatar');
      await card.populate('createdBy', 'name email avatar');

      res.status(201).json({ card });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// PATCH /api/workspaces/:workspaceId/boards/:boardId/cards/:cardId
router.patch(
  '/:workspaceId/boards/:boardId/cards/:cardId',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const allowedUpdates = [
        'title',
        'description',
        'column',
        'order',
        'assignees',
        'labels',
        'dueDate',
      ];

      const card = await Card.findOne({
        _id: req.params.cardId,
        board: req.params.boardId,
      });

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          card[key] = req.body[key];
        }
      }

      await card.save();
      await card.populate('assignees', 'name email avatar');
      await card.populate('createdBy', 'name email avatar');
      await card.populate('comments.author', 'name email avatar');

      res.json({ card });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// POST /api/workspaces/:workspaceId/boards/:boardId/cards/:cardId/comments
router.post(
  '/:workspaceId/boards/:boardId/cards/:cardId/comments',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Comment text is required' });
      }

      const card = await Card.findOne({
        _id: req.params.cardId,
        board: req.params.boardId,
      });

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      card.comments.push({ text, author: req.user._id });
      await card.save();
      await card.populate('comments.author', 'name email avatar');

      res.status(201).json({ card });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE /api/workspaces/:workspaceId/boards/:boardId/cards/:cardId
router.delete(
  '/:workspaceId/boards/:boardId/cards/:cardId',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const card = await Card.findOneAndDelete({
        _id: req.params.cardId,
        board: req.params.boardId,
      });

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      res.json({ message: 'Card deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PATCH /api/workspaces/:workspaceId/boards/:boardId/cards/:cardId/move
router.patch(
  '/:workspaceId/boards/:boardId/cards/:cardId/move',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const { column, order } = req.body;

      if (column === undefined || order === undefined) {
        return res
          .status(400)
          .json({ error: 'Column and order are required' });
      }

      const card = await Card.findOne({
        _id: req.params.cardId,
        board: req.params.boardId,
      });

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      const oldColumn = card.column;
      const oldOrder = card.order;

      // Reorder cards in the destination column
      if (oldColumn.toString() === column.toString()) {
        // Same column — shift cards between old and new position
        if (order > oldOrder) {
          await Card.updateMany(
            {
              board: req.params.boardId,
              column,
              order: { $gt: oldOrder, $lte: order },
            },
            { $inc: { order: -1 } }
          );
        } else if (order < oldOrder) {
          await Card.updateMany(
            {
              board: req.params.boardId,
              column,
              order: { $gte: order, $lt: oldOrder },
            },
            { $inc: { order: 1 } }
          );
        }
      } else {
        // Different column — shift old column up, shift new column down
        await Card.updateMany(
          {
            board: req.params.boardId,
            column: oldColumn,
            order: { $gt: oldOrder },
          },
          { $inc: { order: -1 } }
        );
        await Card.updateMany(
          {
            board: req.params.boardId,
            column,
            order: { $gte: order },
          },
          { $inc: { order: 1 } }
        );
      }

      card.column = column;
      card.order = order;
      await card.save();

      await card.populate('assignees', 'name email avatar');
      await card.populate('createdBy', 'name email avatar');

      res.json({ card });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
