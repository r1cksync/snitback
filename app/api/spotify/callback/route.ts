import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/spotify/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET /api/spotify/callback - Handle Spotify OAuth callback
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User email
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${FRONTEND_URL}/dashboard?spotify_error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${FRONTEND_URL}/dashboard?spotify_error=missing_params`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Spotify token error:', errorData);
      return NextResponse.redirect(`${FRONTEND_URL}/dashboard?spotify_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Save tokens to user profile
    await connectDB();
    await User.findOneAndUpdate(
      { email: state },
      {
        $set: {
          spotifyAccessToken: tokens.access_token,
          spotifyRefreshToken: tokens.refresh_token,
          spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        },
      }
    );

    return NextResponse.redirect(`${FRONTEND_URL}/dashboard?spotify_connected=true`);
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    return NextResponse.redirect(`${FRONTEND_URL}/dashboard?spotify_error=server_error`);
  }
}
