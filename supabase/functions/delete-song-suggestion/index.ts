import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { song_id } = await req.json()
    if (!song_id) {
      return new Response(JSON.stringify({ error: "Missing song_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // User-context client to identify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceKey)

    // Find the song's band
    const { data: song, error: songErr } = await adminClient
      .from("song_suggestions")
      .select("id, band_id, suggested_by")
      .eq("id", song_id)
      .single()
    if (songErr || !song) throw songErr || new Error("Song not found")

    // Check caller is an admin in that band
    const { data: member } = await adminClient
      .from("band_members")
      .select("role")
      .eq("band_id", song.band_id)
      .eq("user_id", userData.user.id)
      .single()

    const isAdmin = member?.role === "admin"
    const isSuggester = song.suggested_by === userData.user.id
    if (!isAdmin && !isSuggester) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Perform delete with service role
    const { error: delErr } = await adminClient
      .from("song_suggestions")
      .delete()
      .eq("id", song_id)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})


