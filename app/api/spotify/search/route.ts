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

  if (user.spotifyTokenExpiry && new Date() >= new Date(user.spotifyTokenExpiry)) {
    const tokens = await refreshSpotifyTokenSafe(
      user.spotifyRefreshToken,
      SPOTIFY_CLIENT_ID!,
      SPOTIFY_CLIENT_SECRET!
    );
    
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

// GET /api/spotify/search - Search for tracks
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
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'track';
    const limit = searchParams.get('limit') || '10';

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      );
    }

    try {
      const data = await spotifyApiCall(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`,
        accessToken
      );
      
      return NextResponse.json(data);
    } catch (apiError: any) {
      // Return fallback data for API errors
      const fallbackData = createSpotifyFallbackResponse(
        'Search temporarily unavailable. Please try again later.'
      );
      
      return NextResponse.json(fallbackData);
    }
  } catch (error: any) {
    console.error('Error in Spotify search route:', error);
    
    // Return fallback data instead of error
    const fallbackData = createSpotifyFallbackResponse(
      'Search service unavailable',
      { error: error.message }
    );
    
    return NextResponse.json(fallbackData);
  }
}
