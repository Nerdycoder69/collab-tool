import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
    },
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'card:created',
        'card:updated',
        'card:moved',
        'card:deleted',
        'card:commented',
        'board:created',
        'board:updated',
        'board:deleted',
        'member:invited',
      ],
    },
    details: {
      cardTitle: String,
      fromColumn: String,
      toColumn: String,
      boardTitle: String,
      memberName: String,
      commentText: String,
    },
  },
  { timestamps: true }
);

activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ board: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
