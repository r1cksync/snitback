import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  return await response.json();
}

async function getValidAccessToken(user: any) {
  if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
    throw new Error('Spotify not connected');
  }

  if (user.spotifyTokenExpiry && new Date() >= new Date(user.spotifyTokenExpiry)) {
    const tokens = await refreshSpotifyToken(user.spotifyRefreshToken);
    
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

// POST /api/spotify/playback - Control Spotify playback
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { action, trackUris, deviceId, position } = body;

    let endpoint = '';
    let method = 'PUT';
    let requestBody: any = null;

    switch (action) {
      case 'play':
        endpoint = 'https://api.spotify.com/v1/me/player/play';
        if (deviceId) endpoint += `?device_id=${deviceId}`;
        requestBody = trackUris ? { uris: trackUris } : null;
        break;
      
      case 'pause':
        endpoint = 'https://api.spotify.com/v1/me/player/pause';
        break;
      
      case 'next':
        method = 'POST';
        endpoint = 'https://api.spotify.com/v1/me/player/next';
        break;
      
      case 'previous':
        method = 'POST';
        endpoint = 'https://api.spotify.com/v1/me/player/previous';
        break;
      
      case 'seek':
        endpoint = `https://api.spotify.com/v1/me/player/seek?position_ms=${position}`;
        break;
      
      case 'volume':
        endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${position}`;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : null,
    });

    if (response.status === 204) {
      return NextResponse.json({ success: true });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Spotify playback error:', error);
      return NextResponse.json(
        { error: 'Playback control failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error controlling playback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to control playback' },
      { status: 500 }
    );
  }
}

// GET /api/spotify/playback - Get current playback state
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

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204) {
      return NextResponse.json({ playing: false });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Spotify playback state error:', error);
      return NextResponse.json(
        { error: 'Failed to get playback state' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error getting playback state:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get playback state' },
      { status: 500 }
    );
  }
}
