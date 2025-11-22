import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  notifications: {
    enabled: boolean;
    interventions: boolean;
    dailySummary: boolean;
  };
  flowDetection: {
    sensitivity: 'low' | 'medium' | 'high';
    minDuration: number; // minimum seconds to consider as flow
  };
  interventionPreferences: {
    breathing: boolean;
    eyeRest: boolean;
    posture: boolean;
    hydration: boolean;
  };
  workSchedule: {
    startTime?: string; // HH:mm format
    endTime?: string;
    workDays: number[]; // 0-6, Sunday = 0
  };
  distractionSites: string[];
  privacy: {
    localProcessing: boolean;
    shareAnalytics: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    notifications: {
      enabled: { type: Boolean, default: true },
      interventions: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true },
    },
    flowDetection: {
      sensitivity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      minDuration: { type: Number, default: 300 }, // 5 minutes
    },
    interventionPreferences: {
      breathing: { type: Boolean, default: true },
      eyeRest: { type: Boolean, default: true },
      posture: { type: Boolean, default: true },
      hydration: { type: Boolean, default: true },
    },
    workSchedule: {
      startTime: String,
      endTime: String,
      workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon-Fri
    },
    distractionSites: [String],
    privacy: {
      localProcessing: { type: Boolean, default: true },
      shareAnalytics: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings || mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);

export default UserSettings;
