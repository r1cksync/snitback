import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

// POST /api/spotify/recommendations - Get AI-powered music recommendations
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
    const { mood, activity, energyLevel, focus } = body;

    // Define recommendation parameters based on user needs
    let targetEnergy = 0.5;
    let targetValence = 0.5;
    let targetTempo = 120;
    let genres: string[] = [];

    if (focus === 'deep-work') {
      targetEnergy = 0.4;
      targetValence = 0.5;
      targetTempo = 90;
      genres = ['ambient', 'classical', 'study', 'chill', 'instrumental'];
    } else if (focus === 'creative') {
      targetEnergy = 0.6;
      targetValence = 0.7;
      targetTempo = 110;
      genres = ['indie', 'electronic', 'jazz', 'alternative'];
    } else if (focus === 'energetic') {
      targetEnergy = 0.8;
      targetValence = 0.8;
      targetTempo = 140;
      genres = ['pop', 'rock', 'edm', 'hip-hop'];
    } else if (focus === 'relaxation') {
      targetEnergy = 0.3;
      targetValence = 0.6;
      targetTempo = 80;
      genres = ['ambient', 'chill', 'meditation', 'acoustic'];
    }

    // Get user's top tracks for seed
    const topTracksResponse = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?limit=5',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let seedTracks: string[] = [];
    if (topTracksResponse.ok) {
      const topTracks = await topTracksResponse.json();
      seedTracks = topTracks.items.slice(0, 2).map((track: any) => track.id);
    }

    // Build recommendation query
    const params = new URLSearchParams({
      limit: '20',
      target_energy: targetEnergy.toString(),
      target_valence: targetValence.toString(),
      target_tempo: targetTempo.toString(),
    });

    if (seedTracks.length > 0) {
      params.append('seed_tracks', seedTracks.join(','));
    }

    if (genres.length > 0) {
      params.append('seed_genres', genres.slice(0, 3).join(','));
    }

    const recommendationsResponse = await fetch(
      `https://api.spotify.com/v1/recommendations?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!recommendationsResponse.ok) {
      const error = await recommendationsResponse.text();
      console.error('Spotify recommendations error:', error);
      return NextResponse.json(
        { error: 'Failed to get recommendations' },
        { status: recommendationsResponse.status }
      );
    }

    const recommendations = await recommendationsResponse.json();

    // Generate AI explanation using Groq
    const tracksList = recommendations.tracks.slice(0, 5).map((track: any) => 
      `${track.name} by ${track.artists.map((a: any) => a.name).join(', ')}`
    ).join('\n');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a music recommendation assistant. Explain why these songs are suitable for the user\'s focus needs.',
          },
          {
            role: 'user',
            content: `User needs music for: ${focus || activity || mood}\nRecommended tracks:\n${tracksList}\n\nBriefly explain (2-3 sentences) why these recommendations suit their needs.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    let explanation = 'These tracks are curated to match your current focus needs.';
    if (groqResponse.ok) {
      const groqData = await groqResponse.json();
      explanation = groqData.choices[0]?.message?.content || explanation;
    }

    return NextResponse.json({
      tracks: recommendations.tracks,
      explanation,
      parameters: { targetEnergy, targetValence, targetTempo, genres },
    });
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
