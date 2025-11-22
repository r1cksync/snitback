import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Media from '@/models/Media';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';
import { getSignedUploadUrl, generateS3Key } from '@/lib/s3';

// GET: Retrieve signed upload URL
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    const contentType = searchParams.get('contentType');
    const type = searchParams.get('type') || 'snapshot';

    if (!filename || !contentType) {
      return errorResponse('filename and contentType are required', 400);
    }

    const s3Key = generateS3Key(auth.userId, type, filename);
    const uploadUrl = await getSignedUploadUrl(s3Key, contentType);

    return successResponse({ uploadUrl, s3Key });
  } catch (error) {
    console.error('Get upload URL error:', error);
    return errorResponse('Failed to generate upload URL');
  }
}

// POST: Save media metadata after upload
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { sessionId, type, s3Key, s3Url, filename, mimeType, size, metadata } = body;

    if (!type || !s3Key || !s3Url || !filename || !mimeType || !size) {
      return errorResponse('Missing required fields', 400);
    }

    await connectDB();

    const media = await Media.create({
      userId: auth.userId,
      sessionId,
      type,
      s3Key,
      s3Url,
      filename,
      mimeType,
      size,
      metadata,
    });

    return successResponse({ media }, 201);
  } catch (error) {
    console.error('Create media error:', error);
    return errorResponse('Failed to save media');
  }
}
