import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Intervention from '@/models/Intervention';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';

// GET: Retrieve all interventions for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const sessionId = searchParams.get('sessionId');

    const query: any = { userId: auth.userId };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const interventions = await Intervention.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return successResponse({ interventions });
  } catch (error) {
    console.error('Get interventions error:', error);
    return errorResponse('Failed to retrieve interventions');
  }
}

// POST: Create a new intervention
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { sessionId, type, duration, completed, effectiveness } = body;

    if (!type) {
      return errorResponse('type is required', 400);
    }

    await connectDB();

    const intervention = await Intervention.create({
      userId: auth.userId,
      sessionId,
      type,
      timestamp: new Date(),
      duration: duration || 60,
      completed: completed || false,
      effectiveness,
    });

    return successResponse({ intervention }, 201);
  } catch (error) {
    console.error('Create intervention error:', error);
    return errorResponse('Failed to create intervention');
  }
}

// PATCH: Update intervention (mark as completed, add effectiveness rating)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { id, completed, effectiveness } = body;

    if (!id) {
      return errorResponse('id is required', 400);
    }

    await connectDB();

    const intervention = await Intervention.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      { $set: { completed, effectiveness } },
      { new: true }
    ).lean();

    if (!intervention) {
      return errorResponse('Intervention not found', 404);
    }

    return successResponse({ intervention });
  } catch (error) {
    console.error('Update intervention error:', error);
    return errorResponse('Failed to update intervention');
  }
}
