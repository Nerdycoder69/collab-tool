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
    // Encrypted message fields (E2E encrypted on client)
    ciphertext: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fetching messages in a board, sorted by time
messageSchema.index({ board: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
