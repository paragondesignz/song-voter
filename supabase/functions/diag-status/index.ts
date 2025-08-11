import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { corsHeaders } from "../_shared/cors.ts"

type Payload = {
  email?: string
  user_id?: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { email, user_id }: Payload = await req.json().catch(() => ({}))
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const admin = createClient(supabaseUrl, serviceKey)

    // Resolve user id
    let uid = user_id || ""
    if (!uid && email) {
      const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()
      uid = prof?.id || ""
      if (!uid) {
        const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
        uid = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id || ""
      }
    }

    if (!uid) {
      return new Response(JSON.stringify({ error: "USER_NOT_FOUND" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Memberships
    const { data: memberships, error: memErr } = await admin
      .from("band_members")
      .select("band_id, role")
      .eq("user_id", uid)
    if (memErr) throw memErr

    // Bands
    const bandIds = (memberships || []).map((m) => m.band_id)
    const { data: bands } = await admin.from("bands").select("id,name,invite_code,created_at").in("id", bandIds)

    // Song summary
    const { data: songs } = await admin.from("song_suggestions").select("id, band_id").in("band_id", bandIds)

    return new Response(
      JSON.stringify({ user_id: uid, memberships, bands, song_counts: songs?.reduce<Record<string, number>>((a, s) => { a[s.band_id] = (a[s.band_id] || 0) + 1; return a }, {}) || {} }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})


