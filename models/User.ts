import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  image?: string;
  
  // Personal Information
  age?: number;
  dateOfBirth?: Date;
  gender?: string;
  phoneNumber?: string;
  
  // Professional Information
  occupation?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  yearsOfExperience?: number;
  
  // Educational Background
  educationLevel?: string;
  fieldOfStudy?: string;
  institution?: string;
  
  // Interests and Goals
  primaryGoals?: string[];
  focusAreas?: string[];
  hobbies?: string[];
  learningInterests?: string[];
  
  // Work Preferences
  preferredWorkingHours?: string;
  workEnvironment?: string;
  productivityChallenges?: string[];
  
  // Additional Context
  timezone?: string;
  country?: string;
  city?: string;
  bio?: string;
  
  // Spotify Integration
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyTokenExpiry?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    
    // Personal Information
    age: { type: Number },
    dateOfBirth: { type: Date },
    gender: { type: String },
    phoneNumber: { type: String },
    
    // Professional Information
    occupation: { type: String },
    company: { type: String },
    jobTitle: { type: String },
    industry: { type: String },
    yearsOfExperience: { type: Number },
    
    // Educational Background
    educationLevel: { type: String },
    fieldOfStudy: { type: String },
    institution: { type: String },
    
    // Interests and Goals
    primaryGoals: [{ type: String }],
    focusAreas: [{ type: String }],
    hobbies: [{ type: String }],
    learningInterests: [{ type: String }],
    
    // Work Preferences
    preferredWorkingHours: { type: String },
    workEnvironment: { type: String },
    productivityChallenges: [{ type: String }],
    
    // Additional Context
    timezone: { type: String },
    country: { type: String },
    city: { type: String },
    bio: { type: String },
    
    // Spotify Integration
    spotifyAccessToken: { type: String },
    spotifyRefreshToken: { type: String },
    spotifyTokenExpiry: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Remove the duplicate index line
// UserSchema.index({ email: 1 }); // <-- Remove this

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
