import { Router } from 'express';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import Workspace from '../models/Workspace.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/search?q=keyword
router.get('/', async (req, res) => {
  try {
    const { q, workspaceId } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    // Find workspaces the user is a member of
    const memberFilter = { 'members.user': req.user._id };
    if (workspaceId) {
      memberFilter._id = workspaceId;
    }
    const userWorkspaces = await Workspace.find(memberFilter).select('_id');
    const workspaceIds = userWorkspaces.map((ws) => ws._id);

    // Search boards
    const boards = await Board.find({
      workspace: { $in: workspaceIds },
      title: searchRegex,
    })
      .populate('workspace', 'name')
      .select('title workspace columns')
      .limit(10)
      .lean();

    // Search cards
    const boardsInWorkspaces = await Board.find({
      workspace: { $in: workspaceIds },
    }).select('_id workspace title');

    const boardIds = boardsInWorkspaces.map((b) => b._id);
    const boardMap = Object.fromEntries(
      boardsInWorkspaces.map((b) => [b._id.toString(), b])
    );

    const cards = await Card.find({
      board: { $in: boardIds },
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { 'labels.text': searchRegex },
      ],
    })
      .populate('assignees', 'name email avatar')
      .select('title description board column labels')
      .limit(20)
      .lean();

    // Enrich cards with board info
    const enrichedCards = cards.map((card) => ({
      ...card,
      boardInfo: boardMap[card.board.toString()],
    }));

    res.json({ boards, cards: enrichedCards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
