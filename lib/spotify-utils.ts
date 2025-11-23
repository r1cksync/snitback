// Utility functions for Spotify API calls with proper timeout and error handling

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Spotify API is not responding');
    }
    
    throw error;
  }
}

export async function refreshSpotifyTokenSafe(refreshToken: string, clientId: string, clientSecret: string) {
  try {
    const response = await fetchWithTimeout('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    }, 5000);

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error refreshing Spotify token:', error);
    throw new Error('Failed to refresh Spotify authentication');
  }
}

export async function spotifyApiCall(url: string, accessToken: string, options: RequestInit = {}) {
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Spotify authentication expired');
      }
      if (response.status === 403) {
        throw new Error('Spotify access forbidden - premium account may be required');
      }
      if (response.status === 429) {
        throw new Error('Spotify rate limit exceeded - please try again later');
      }
      
      const errorText = await response.text();
      throw new Error(`Spotify API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Spotify API call failed:', error);
    
    if (error.message.includes('timeout')) {
      throw new Error('Spotify service is currently unavailable - please try again later');
    }
    
    throw error;
  }
}

export function createSpotifyFallbackResponse(message: string, additionalData: any = {}) {
  return {
    items: [],
    tracks: [],
    message,
    fallback: true,
    ...additionalData
  };
}