import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Card title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    column: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    labels: [
      {
        text: { type: String, maxlength: 30 },
        color: { type: String, maxlength: 20 },
      },
    ],
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [commentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fetching cards within a board efficiently, sorted by column and order
cardSchema.index({ board: 1, column: 1, order: 1 });
cardSchema.index({ board: 1 });
cardSchema.index({ assignees: 1 });

export default mongoose.model('Card', cardSchema);
