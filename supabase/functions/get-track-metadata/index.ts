import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { corsHeaders } from "../_shared/cors.ts"

// Spotify API token cache
let spotifyToken: string | null = null
let tokenExpiry: number = 0

async function getSpotifyToken(): Promise<string> {
  // Check if we have a valid cached token
  if (spotifyToken && Date.now() < tokenExpiry) {
    return spotifyToken
  }

  try {
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")

    if (!clientId || !clientSecret) {
      throw new Error("Spotify credentials not configured")
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      throw new Error("Failed to get Spotify token")
    }

    const data = await response.json()
    spotifyToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000 // Expire 1 minute early

    return spotifyToken
  } catch (error) {
    console.error("Error getting Spotify token:", error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { trackId } = await req.json()
    
    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Track ID parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = await getSpotifyToken()
    
    // Fetch track details from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Track not found on Spotify' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw new Error('Spotify API request failed')
    }

    const track = await response.json()
    
    // Transform the data to match our needs
    const trackData = {
      spotify_track_id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      album_art_url: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      popularity: track.popularity
    }

    return new Response(
      JSON.stringify({ track: trackData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-track-metadata function:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
