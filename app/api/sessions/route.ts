import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import FlowSession from '@/models/FlowSession';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';

// GET: Retrieve all flow sessions for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const sessions = await FlowSession.find({ userId: auth.userId })
      .sort({ startTime: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return successResponse({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return errorResponse('Failed to retrieve sessions');
  }
}

// POST: Create a new flow session
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { startTime, endTime, duration, qualityScore, triggers, breakers, metrics, interventions, notes } = body;

    if (!startTime) {
      return errorResponse('startTime is required', 400);
    }

    await connectDB();

    const session = await FlowSession.create({
      userId: auth.userId,
      startTime,
      endTime,
      duration: duration || 0,
      qualityScore: qualityScore || 0,
      triggers: triggers || [],
      breakers: breakers || [],
      metrics: metrics || {
        avgTypingSpeed: 0,
        tabSwitches: 0,
        mouseActivity: 0,
        fatigueLevel: 0,
      },
      interventions: interventions || [],
      notes,
    });

    return successResponse({ session }, 201);
  } catch (error) {
    console.error('Create session error:', error);
    return errorResponse('Failed to create session');
  }
}
