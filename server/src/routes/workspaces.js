import { Router } from 'express';
import Workspace from '../models/Workspace.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

// GET /api/workspaces — list workspaces the user is a member of
router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
    }).populate('members.user', 'name email avatar');

    res.json({ workspaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspaces — create a new workspace
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = await Workspace.create({
      name,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    await workspace.populate('members.user', 'name email avatar');
    res.status(201).json({ workspace });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/workspaces/:workspaceId
router.get(
  '/:workspaceId',
  authorize('owner', 'editor', 'viewer'),
  async (req, res) => {
    await req.workspace.populate('members.user', 'name email avatar');
    res.json({ workspace: req.workspace });
  }
);

// PATCH /api/workspaces/:workspaceId — update workspace details (owner only)
router.patch(
  '/:workspaceId',
  authorize('owner'),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      if (name) req.workspace.name = name;
      if (description !== undefined) req.workspace.description = description;
      await req.workspace.save();
      await req.workspace.populate('members.user', 'name email avatar');
      res.json({ workspace: req.workspace });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// POST /api/workspaces/:workspaceId/members — invite a member (owner only)
router.post(
  '/:workspaceId/members',
  authorize('owner'),
  async (req, res) => {
    try {
      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({ error: 'userId and role are required' });
      }

      if (!['editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Role must be editor or viewer' });
      }

      const alreadyMember = req.workspace.members.some(
        (m) => m.user.toString() === userId
      );
      if (alreadyMember) {
        return res.status(409).json({ error: 'User is already a member' });
      }

      req.workspace.members.push({ user: userId, role });
      await req.workspace.save();
      await req.workspace.populate('members.user', 'name email avatar');
      res.json({ workspace: req.workspace });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE /api/workspaces/:workspaceId/members/:userId — remove a member (owner only)
router.delete(
  '/:workspaceId/members/:userId',
  authorize('owner'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (userId === req.user._id.toString()) {
        return res.status(400).json({ error: 'Cannot remove yourself as owner' });
      }

      req.workspace.members = req.workspace.members.filter(
        (m) => m.user.toString() !== userId
      );
      await req.workspace.save();
      res.json({ workspace: req.workspace });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
