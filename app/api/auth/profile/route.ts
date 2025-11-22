import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// Helper to get email from request (either from session or authorization header)
async function getUserEmail(req: NextRequest): Promise<string | null> {
  // Try to get from NextAuth session first
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return session.user.email;
  }
  
  // Fallback to Authorization header (for frontend proxy)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

// GET /api/auth/profile - Get current user's profile
export async function GET(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
    
    if (!email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    
    const user = await User.findOne({ email }).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/profile - Update current user's profile
export async function PATCH(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
    
    if (!email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    
    // Remove fields that shouldn't be updated this way
    delete body.email;
    delete body.password;
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    await connectDB();
    
    const user = await User.findOneAndUpdate(
      { email },
      { $set: body },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

