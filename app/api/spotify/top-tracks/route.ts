import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { refreshSpotifyTokenSafe, spotifyApiCall, createSpotifyFallbackResponse } from '@/lib/spotify-utils';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getValidAccessToken(user: any) {
  if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
    throw new Error('Spotify not connected');
  }

  // Check if token is expired
  if (user.spotifyTokenExpiry && new Date() >= new Date(user.spotifyTokenExpiry)) {
    const tokens = await refreshSpotifyTokenSafe(
      user.spotifyRefreshToken,
      SPOTIFY_CLIENT_ID!,
      SPOTIFY_CLIENT_SECRET!
    );
    
    // Update user with new tokens
    await User.findByIdAndUpdate(user._id, {
      $set: {
        spotifyAccessToken: tokens.access_token,
        spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  }

  return user.spotifyAccessToken;
}

// GET /api/spotify/top-tracks - Get user's top tracks
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const accessToken = await getValidAccessToken(user);

    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get('time_range') || 'medium_term';
    const limit = searchParams.get('limit') || '20';

    try {
      const data = await spotifyApiCall(
        `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
        accessToken
      );
      
      return NextResponse.json(data);
    } catch (apiError: any) {
      // Return fallback data for API errors
      const fallbackData = createSpotifyFallbackResponse(
        apiError.message || 'Unable to load your top tracks right now'
      );
      
      return NextResponse.json(fallbackData);
    }
  } catch (error: any) {
    console.error('Error in top-tracks route:', error);
    
    // Return fallback data instead of error
    const fallbackData = createSpotifyFallbackResponse(
      'Spotify data temporarily unavailable',
      { error: error.message }
    );
    
    return NextResponse.json(fallbackData);
  }
}
