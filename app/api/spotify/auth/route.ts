import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/spotify/callback';

// GET /api/spotify/auth - Get Spotify authorization URL
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-private',
    'playlist-modify-public',
  ].join(' ');    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID!,
      scope: scopes,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: session.user.email, // Use email as state to identify user
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Spotify auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
