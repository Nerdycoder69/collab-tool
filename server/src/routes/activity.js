import { Router } from 'express';
import Activity from '../models/Activity.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/workspaces/:workspaceId/activity
router.get(
  '/:workspaceId/activity',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    try {
      const { boardId, limit = 50, before } = req.query;
      const query = { workspace: req.params.workspaceId };
      if (boardId) query.board = boardId;
      if (before) query.createdAt = { $lt: new Date(before) };

      const activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('user', 'name email avatar')
        .populate('board', 'title')
        .lean();

      res.json({ activities });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
