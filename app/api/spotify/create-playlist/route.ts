import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// Helper function to refresh token if needed
async function getValidAccessToken(user: any): Promise<string> {
  const now = new Date();
  const tokenExpiry = new Date(user.spotifyTokenExpiry);

  if (tokenExpiry <= now) {
    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken,
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error('Failed to refresh Spotify token');
    }

    const data = await refreshResponse.json();
    const expiryDate = new Date(now.getTime() + data.expires_in * 1000);

    user.spotifyAccessToken = data.access_token;
    user.spotifyTokenExpiry = expiryDate;
    await user.save();

    return data.access_token;
  }

  return user.spotifyAccessToken;
}

// POST /api/spotify/create-playlist - Create playlist and add tracks
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
    const { name, description, trackUris } = body;

    // Get user's Spotify ID
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to get user profile');
    }

    const profile = await profileResponse.json();

    // Create playlist (Spotify has a 300 character limit for descriptions)
    const truncatedDescription = description 
      ? (description.length > 300 ? description.substring(0, 297) + '...' : description)
      : 'Created by your AI music assistant';
    
    const createResponse = await fetch(
      `https://api.spotify.com/v1/users/${profile.id}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || 'AI Recommended Playlist',
          description: truncatedDescription,
          public: false,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      
      console.error('Failed to create playlist:', errorData);
      
      // Check if it's a scope issue
      if (createResponse.status === 403 && errorText.includes('Insufficient client scope')) {
        return NextResponse.json(
          { 
            error: 'Spotify permissions missing. Please reconnect your Spotify account to grant playlist creation permissions.',
            needsReconnect: true 
          },
          { status: 403 }
        );
      }
      
      throw new Error(errorData?.error?.message || 'Failed to create playlist');
    }

    const playlist = await createResponse.json();

    // Add tracks to playlist (batch process - max 100 per request)
    if (trackUris && trackUris.length > 0) {
      console.log(`Adding ${trackUris.length} tracks to playlist...`);
      
      // Process in batches of 100
      for (let i = 0; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100);
        
        const addTracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uris: batch,
            }),
          }
        );

        if (!addTracksResponse.ok) {
          const error = await addTracksResponse.text();
          console.error(`Failed to add tracks batch ${i / 100 + 1}:`, error);
        } else {
          console.log(`Added batch ${i / 100 + 1}: ${batch.length} tracks`);
        }
      }
    }

    return NextResponse.json({
      playlist,
      message: 'Playlist created successfully',
    });
  } catch (error: any) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create playlist' },
      { status: 500 }
    );
  }
}
