import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { refreshSpotifyTokenSafe, spotifyApiCall, createSpotifyFallbackResponse } from '@/lib/spotify-utils';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getValidAccessToken(user: any): Promise<string> {
  const now = new Date();
  const tokenExpiry = new Date(user.spotifyTokenExpiry);

  if (tokenExpiry <= now) {
    const tokens = await refreshSpotifyTokenSafe(
      user.spotifyRefreshToken,
      SPOTIFY_CLIENT_ID!,
      SPOTIFY_CLIENT_SECRET!
    );
    
    const expiryDate = new Date(now.getTime() + tokens.expires_in * 1000);
    user.spotifyAccessToken = tokens.access_token;
    user.spotifyTokenExpiry = expiryDate;
    await user.save();

    return tokens.access_token;
  }

  return user.spotifyAccessToken;
}

// POST /api/spotify/chat-refine - Refine recommendations based on user feedback
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
    const { userMessage, currentPlaylist, conversationHistory, playlistLength = 12 } = body;

    // Request 50% more songs to account for songs not found on Spotify
    const requestCount = Math.ceil(playlistLength * 1.5);

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a music recommendation expert. The user has a current playlist and wants to refine it based on their feedback. Suggest EXACTLY ${requestCount} songs with their artists that incorporate their feedback. IMPORTANT: Only suggest real, existing songs that can be found on Spotify. Do NOT make up song names. Format each song as "Song Name by Artist Name" on separate lines. Only provide the ${requestCount} song titles, nothing else - no numbering, no explanations, no extra text.`,
      },
      ...(conversationHistory || []),
      {
        role: 'user',
        content: `Current playlist:\n${currentPlaylist.map((track: any) => `${track.name} by ${track.artists.map((a: any) => a.name).join(', ')}`).join('\n')}\n\nUser feedback: ${userMessage}`,
      },
    ];

    // Get refined recommendations from Groq
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      console.error('Groq API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate refined recommendations' },
        { status: groqResponse.status }
      );
    }

    const groqData = await groqResponse.json();
    const aiSuggestions = groqData.choices[0]?.message?.content || '';
    console.log(`AI suggested ${aiSuggestions.split('\n').filter((l: string) => l.trim()).length} songs for refinement`);

    // Parse song suggestions
    const songLines = aiSuggestions.split('\n').filter((line: string) => line.trim());
    const tracks: any[] = [];

    // Search for each song on Spotify
    console.log('Searching for', songLines.length, 'songs, target:', playlistLength);
    for (const songLine of songLines) {
      if (tracks.length >= playlistLength) break;
      
      try {
        const cleanLine = songLine.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim();
        if (!cleanLine || cleanLine.length < 3) continue;

        console.log('Searching for:', cleanLine);

        try {
          const searchData = await spotifyApiCall(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanLine)}&type=track&limit=3`,
            accessToken
          );

          if (searchData.tracks?.items?.[0]) {
            const track = searchData.tracks.items[0];
            console.log('Found:', track.name, 'by', track.artists.map((a: any) => a.name).join(', '));
            tracks.push(track);
          } else {
            console.log('No match found for:', cleanLine);
          }
        } catch (searchError) {
          console.error('Error searching for song:', cleanLine, 'Error:', searchError.message);
        }
      } catch (error) {
        console.error('Error searching for song:', songLine, error);
      }
    }
    
    console.log('Final track count:', tracks.length, '/', playlistLength);
    
    // Trim to exact length requested
    const finalTracks = tracks.slice(0, playlistLength);
    console.log('Returning', finalTracks.length, 'refined tracks');

    // Generate explanation for changes
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
            content: 'You are a music curator. Briefly explain (2-3 sentences) what changes you made based on user feedback.',
          },
          {
            role: 'user',
            content: `User feedback: ${userMessage}\n\nNew playlist:\n${finalTracks.map(t => `${t.name} by ${t.artists.map((a: any) => a.name).join(', ')}`).join('\n')}\n\nExplain the changes.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    let explanation = 'I\'ve updated the playlist based on your feedback.';
    if (explanationResponse.ok) {
      const explData = await explanationResponse.json();
      explanation = explData.choices[0]?.message?.content || explanation;
    }

    return NextResponse.json({
      tracks: finalTracks,
      explanation,
      aiResponse: aiSuggestions,
    });
  } catch (error: any) {
    console.error('Error refining recommendations:', error);
    
    // Return fallback data instead of error
    const fallbackData = createSpotifyFallbackResponse(
      'Unable to refine music recommendations at the moment.',
      {
        tracks: [],
        explanation: 'Music refinement temporarily unavailable.',
        aiResponse: '',
        error: error.message
      }
    );
    
    return NextResponse.json(fallbackData);
  }
}
