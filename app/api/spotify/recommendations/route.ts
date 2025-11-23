import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { refreshSpotifyTokenSafe, spotifyApiCall, createSpotifyFallbackResponse } from '@/lib/spotify-utils';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

// POST /api/spotify/recommendations - Get AI-powered music recommendations
export async function POST(req: NextRequest) {
  try {
    console.log('=== Recommendations Route Called ===');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('User email:', session.user.email);
    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.log('User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found, getting access token...');
    const accessToken = await getValidAccessToken(user);
    const body = await req.json();
    console.log('Request body:', body);
    const { mood, activity, energyLevel, focus, userMessage, previousSongs, playlistLength = 12 } = body;

    // Build context for AI
    let aiContext = '';
    if (focus === 'deep-work') {
      aiContext = 'The user needs music for deep work and maximum concentration. Suggest calm, ambient, instrumental tracks with no lyrics or minimal vocals.';
    } else if (focus === 'creative') {
      aiContext = 'The user needs music for creative work. Suggest inspiring, indie, jazz, or alternative tracks that stimulate creativity.';
    } else if (focus === 'energetic') {
      aiContext = 'The user needs high-energy music for active work. Suggest upbeat, motivating tracks from pop, rock, EDM, or hip-hop.';
    } else if (focus === 'relaxation') {
      aiContext = 'The user needs relaxing music for breaks. Suggest calm, soothing tracks for meditation and relaxation.';
    } else {
      aiContext = `The user needs music for: ${mood || activity || 'general listening'}`;
    }

    // Add previous songs context if this is a refinement
    if (previousSongs && previousSongs.length > 0) {
      aiContext += `\n\nPrevious recommendations:\n${previousSongs.join('\n')}`;
    }

    // Add user's custom message if provided
    if (userMessage) {
      aiContext += `\n\nUser's specific request: ${userMessage}`;
    }

    // Get song recommendations from Groq (ask for 50% more to account for songs not found)
    const requestCount = Math.ceil(playlistLength * 1.5);
    console.log('Asking Groq for song recommendations...');
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a music recommendation expert. You must suggest EXACTLY ${requestCount} songs with their artists. Format each song as "Song Name by Artist Name" on separate lines. IMPORTANT: Only provide real, existing songs that can be found on Spotify. Do NOT make up song names. Only provide the ${requestCount} song titles, nothing else - no numbering, no explanations, no extra text.`,
          },
          {
            role: 'user',
            content: aiContext,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error('Groq API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate recommendations' },
        { status: groqResponse.status }
      );
    }

    const groqData = await groqResponse.json();
    const aiSuggestions = groqData.choices[0]?.message?.content || '';
    console.log('AI Suggestions (first 500 chars):', aiSuggestions.substring(0, 500));

    // Parse song suggestions
    const songLines = aiSuggestions.split('\n').filter((line: string) => line.trim());
    console.log(`AI suggested ${songLines.length} songs, we need ${playlistLength}`);
    const tracks: any[] = [];

    // Search for each song on Spotify
    console.log('Searching for songs on Spotify...');
    console.log('Target number of tracks:', playlistLength);
    for (const songLine of songLines) {
      if (tracks.length >= playlistLength) break; // Stop when we have enough
      
      try {
        // Clean up the line (remove numbers, bullets, etc)
        const cleanLine = songLine.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim();
        if (!cleanLine || cleanLine.length < 3) continue;

        console.log('Searching for:', cleanLine);
        
        // Search on Spotify with proper error handling
        try {
          const searchData = await spotifyApiCall(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanLine)}&type=track&limit=3`,
            accessToken
          );

          if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
            const track = searchData.tracks.items[0];
            console.log('Found:', track.name, 'by', track.artists.map((a: any) => a.name).join(', '));
            tracks.push(track);
          } else {
            console.log('No match found for:', cleanLine);
          }
        } catch (searchError) {
          console.error('Error searching for song:', cleanLine, 'Error:', searchError.message);
          // Continue to next song instead of breaking
        }
      } catch (error) {
        console.error('Error processing song line:', songLine, error);
      }
    }

    console.log('Found tracks:', tracks.length, '/', playlistLength);
    
    // If we didn't find any tracks, return fallback data
    if (tracks.length === 0) {
      console.warn('No tracks found at all - returning fallback');
      const fallbackData = createSpotifyFallbackResponse(
        'Unable to find music tracks at the moment. Please try again later.',
        {
          tracks: [],
          explanation: 'Music recommendations are temporarily unavailable.',
          aiSuggestions: ''
        }
      );
      return NextResponse.json(fallbackData);
    }
    
    // If we didn't get enough tracks, warn but continue
    if (tracks.length < playlistLength) {
      console.warn(`Only found ${tracks.length} tracks out of ${playlistLength} requested`);
    }
    
    // Trim to exact length requested
    const finalTracks = tracks.slice(0, playlistLength);
    console.log('Returning', finalTracks.length, 'tracks to frontend');

    // Generate explanation
    const explanationResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a music curator. Explain briefly (2-3 sentences) why this playlist suits the user\'s needs.',
          },
          {
            role: 'user',
            content: `Context: ${aiContext}\n\nPlaylist:\n${finalTracks.map(t => `${t.name} by ${t.artists.map((a: any) => a.name).join(', ')}`).join('\n')}\n\nExplain why this playlist works for them.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    let explanation = 'These tracks are curated to match your current focus needs.';
    if (explanationResponse.ok) {
      const explData = await explanationResponse.json();
      explanation = explData.choices[0]?.message?.content || explanation;
    }

    return NextResponse.json({
      tracks: finalTracks,
      explanation,
      aiSuggestions,
    });
  } catch (error: any) {
    console.error('Error getting recommendations:', error);
    
    // Return fallback data instead of error
    const fallbackData = createSpotifyFallbackResponse(
      'Unable to generate music recommendations at the moment. Please try again later.',
      {
        tracks: [],
        explanation: 'Music recommendations are temporarily unavailable due to connectivity issues.',
        aiSuggestions: '',
        error: error.message
      }
    );
    
    return NextResponse.json(fallbackData);
  }
}
