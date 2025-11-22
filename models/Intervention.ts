import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIntervention extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  type: 'breathing' | 'eye-rest' | 'posture' | 'hydration' | 'break';
  timestamp: Date;
  duration: number; // in seconds
  completed: boolean;
  effectiveness?: number; // 0-10 rating
  createdAt: Date;
  updatedAt: Date;
}

const InterventionSchema = new Schema<IIntervention>(
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
      enum: ['breathing', 'eye-rest', 'posture', 'hydration', 'break'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    duration: {
      type: Number,
      default: 60,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    effectiveness: {
      type: Number,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

InterventionSchema.index({ userId: 1, timestamp: -1 });

const Intervention: Model<IIntervention> =
  mongoose.models.Intervention || mongoose.model<IIntervention>('Intervention', InterventionSchema);

export default Intervention;
