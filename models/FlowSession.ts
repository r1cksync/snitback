import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFlowSession extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  qualityScore: number; // 0-100
  focusScore: number; // 0-100 (alias for qualityScore for compatibility)
  triggers: string[];
  breakers: string[];
  metrics: {
    avgTypingSpeed: number;
    tabSwitches: number;
    mouseActivity: number;
    fatigueLevel: number;
  };
  language?: string; // Programming language
  distractions: number; // Number of distraction events
  codeMetrics?: {
    linesOfCode: number;
    charactersTyped: number;
    complexityScore: number;
    errorsFixed: number;
  };
  interventions: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlowSessionSchema = new Schema<IFlowSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    focusScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    triggers: [String],
    breakers: [String],
    metrics: {
      avgTypingSpeed: { type: Number, default: 0 },
      tabSwitches: { type: Number, default: 0 },
      mouseActivity: { type: Number, default: 0 },
      fatigueLevel: { type: Number, default: 0 },
    },
    language: {
      type: String,
      default: 'javascript',
    },
    distractions: {
      type: Number,
      default: 0,
    },
    codeMetrics: {
      linesOfCode: { type: Number, default: 0 },
      charactersTyped: { type: Number, default: 0 },
      complexityScore: { type: Number, default: 0 },
      errorsFixed: { type: Number, default: 0 },
    },
    interventions: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

FlowSessionSchema.index({ userId: 1, startTime: -1 });
FlowSessionSchema.index({ userId: 1, createdAt: -1 });

const FlowSession: Model<IFlowSession> =
  mongoose.models.FlowSession || mongoose.model<IFlowSession>('FlowSession', FlowSessionSchema);

export default FlowSession;
