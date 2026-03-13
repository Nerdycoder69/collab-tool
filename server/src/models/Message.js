import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      maxlength: 2000,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index for fetching messages in a board, sorted by time
messageSchema.index({ board: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
