import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// POST /api/spotify/insights - Generate insights from Spotify data using Groq
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { topTracks, recentTracks, userProfile } = body;

    // Prepare data for analysis
    const tracksList = topTracks?.items?.map((track: any) => 
      `${track.name} by ${track.artists.map((a: any) => a.name).join(', ')}`
    ).join('\n') || '';

    const genres = new Set<string>();
    topTracks?.items?.forEach((track: any) => {
      track.artists.forEach((artist: any) => {
        if (artist.genres) {
          artist.genres.forEach((genre: string) => genres.add(genre));
        }
      });
    });

    const prompt = `Analyze the following Spotify listening data and provide insights about the user's focus, productivity patterns, and music preferences:

Top Tracks:
${tracksList}

Genres: ${Array.from(genres).join(', ')}

User Profile: ${userProfile ? JSON.stringify(userProfile) : 'Not provided'}

Please provide:
1. Overall listening patterns and what they suggest about focus/productivity habits
2. Music genre preferences and their correlation with work/study activities
3. Energy levels and tempo preferences
4. Recommended times for different types of music based on their patterns
5. Suggestions for music that could enhance focus and productivity

Format your response in a structured, easy-to-read manner.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: 'You are a music and productivity analyst. Provide insightful, actionable analysis of listening patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate insights' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const insights = data.choices[0]?.message?.content || 'No insights generated';

    return NextResponse.json({ insights });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
