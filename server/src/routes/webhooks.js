import { Router } from 'express';
import Webhook from '../models/Webhook.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/workspaces/:workspaceId/webhooks
router.get(
  '/:workspaceId/webhooks',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const webhooks = await Webhook.find({ workspace: req.params.workspaceId })
        .populate('board', 'title')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      res.json({ webhooks });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/workspaces/:workspaceId/webhooks
router.post(
  '/:workspaceId/webhooks',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const { name, url, event, board, secret } = req.body;

      if (!name || !url || !event) {
        return res.status(400).json({ error: 'name, url, and event are required' });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL' });
      }

      const webhook = await Webhook.create({
        workspace: req.params.workspaceId,
        board: board || undefined,
        name,
        url,
        event,
        secret: secret || undefined,
        createdBy: req.user._id,
      });

      await webhook.populate('board', 'title');
      await webhook.populate('createdBy', 'name email');

      res.status(201).json({ webhook });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// PATCH /api/workspaces/:workspaceId/webhooks/:webhookId
router.patch(
  '/:workspaceId/webhooks/:webhookId',
  authorize('owner', 'editor'),
  async (req, res) => {
    try {
      const webhook = await Webhook.findOne({
        _id: req.params.webhookId,
        workspace: req.params.workspaceId,
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const allowed = ['name', 'url', 'event', 'board', 'enabled', 'secret'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) webhook[key] = req.body[key];
      }

      await webhook.save();
      await webhook.populate('board', 'title');
      res.json({ webhook });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE /api/workspaces/:workspaceId/webhooks/:webhookId
router.delete(
  '/:workspaceId/webhooks/:webhookId',
  authorize('owner'),
  async (req, res) => {
    try {
      const webhook = await Webhook.findOneAndDelete({
        _id: req.params.webhookId,
        workspace: req.params.workspaceId,
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      res.json({ message: 'Webhook deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
