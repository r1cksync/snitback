import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserSettings from '@/models/UserSettings';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';

// GET: Retrieve user settings
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    await connectDB();

    let settings = await UserSettings.findOne({ userId: auth.userId }).lean();

    // Create default settings if they don't exist
    if (!settings) {
      settings = await UserSettings.create({ userId: auth.userId });
    }

    return successResponse({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return errorResponse('Failed to retrieve settings');
  }
}

// PATCH: Update user settings
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();

    await connectDB();

    const settings = await UserSettings.findOneAndUpdate(
      { userId: auth.userId },
      { $set: body },
      { new: true, upsert: true }
    ).lean();

    return successResponse({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse('Failed to update settings');
  }
}
