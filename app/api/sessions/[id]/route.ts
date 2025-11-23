import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import FlowSession from '@/models/FlowSession';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';

// GET: Retrieve a specific session
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    await connectDB();

    const session = await FlowSession.findOne({
      _id: params.id,
      userId: auth.userId,
    }).lean();

    if (!session) {
      return errorResponse('Session not found', 404);
    }

    return successResponse({ session });
  } catch (error) {
    console.error('Get session error:', error);
    return errorResponse('Failed to retrieve session');
  }
}

// PATCH: Update a specific session
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();

    // Sync focusScore and qualityScore
    if (body.qualityScore !== undefined && body.focusScore === undefined) {
      body.focusScore = body.qualityScore;
    } else if (body.focusScore !== undefined && body.qualityScore === undefined) {
      body.qualityScore = body.focusScore;
    }

    await connectDB();

    const session = await FlowSession.findOneAndUpdate(
      { _id: params.id, userId: auth.userId },
      { $set: body },
      { new: true }
    ).lean();

    if (!session) {
      return errorResponse('Session not found', 404);
    }

    return successResponse({ session });
  } catch (error) {
    console.error('Update session error:', error);
    return errorResponse('Failed to update session');
  }
}

// DELETE: Delete a specific session
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    await connectDB();

    const session = await FlowSession.findOneAndDelete({
      _id: params.id,
      userId: auth.userId,
    });

    if (!session) {
      return errorResponse('Session not found', 404);
    }

    return successResponse({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    return errorResponse('Failed to delete session');
  }
}
