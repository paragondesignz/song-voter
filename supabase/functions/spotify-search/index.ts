import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')!
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')!

let cachedToken: { token: string; expires: number } | null = null

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    throw new Error('Failed to get Spotify token')
  }

  const data = await response.json()
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000 // Refresh 1 minute early
  }

  return cachedToken.token
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, limit = 20 } = await req.json()
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = await getSpotifyToken()
    
    const searchUrl = new URL('https://api.spotify.com/v1/search')
    searchUrl.searchParams.append('q', query)
    searchUrl.searchParams.append('type', 'track')
    searchUrl.searchParams.append('limit', limit.toString())
    searchUrl.searchParams.append('market', 'US')

    const spotifyResponse = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!spotifyResponse.ok) {
      const errorData = await spotifyResponse.text()
      console.error('Spotify API error:', errorData)
      throw new Error('Spotify API request failed')
    }

    const data = await spotifyResponse.json()
    
    // Transform the data to match our needs
    const tracks = data.tracks.items.map((track: any) => ({
      spotify_track_id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      album_art_url: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      popularity: track.popularity
    }))

    return new Response(
      JSON.stringify({ tracks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in spotify-search function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})