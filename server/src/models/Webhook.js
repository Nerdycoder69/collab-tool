import mongoose from 'mongoose';

const webhookSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    event: {
      type: String,
      required: true,
      enum: ['card:moved:done', 'card:created', 'card:deleted'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    secret: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

webhookSchema.index({ workspace: 1, enabled: 1 });
webhookSchema.index({ board: 1, event: 1, enabled: 1 });

export default mongoose.model('Webhook', webhookSchema);
