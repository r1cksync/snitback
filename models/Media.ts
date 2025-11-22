import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedia extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  type: 'snapshot' | 'audio' | 'video' | 'document';
  s3Key: string;
  s3Url: string;
  filename: string;
  mimeType: string;
  size: number; // in bytes
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'FlowSession',
    },
    type: {
      type: String,
      enum: ['snapshot', 'audio', 'video', 'document'],
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    s3Url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

MediaSchema.index({ userId: 1, createdAt: -1 });

const Media: Model<IMedia> = mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);

export default Media;
