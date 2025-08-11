import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { p_email, p_band_id, p_role, p_display_name } = await req.json()
    if (!p_email || !p_band_id || !p_role || !p_display_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Service configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceKey)

    // Fetch band's shared password
    const { data: band, error: bandError } = await adminClient
      .from("bands")
      .select("shared_password")
      .eq("id", p_band_id)
      .single()
    if (bandError) throw bandError
    if (!band?.shared_password) {
      return new Response(JSON.stringify({ error: "Band does not have a shared password set" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create or upsert the auth user via Admin API
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: p_email,
      password: band.shared_password,
      email_confirm: true,
      user_metadata: { display_name: p_display_name },
    })
    if (createErr && createErr.message && !String(createErr.message).includes("already registered")) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Resolve the user id (new or existing)
    const userId = created?.user?.id ?? (
      await adminClient.from("profiles").select("id").eq("email", p_email).maybeSingle()
    ).data?.id

    if (!userId) {
      // Fallback: look up auth.users
      const { data: authUser } = await adminClient.from("auth.users").select("id").eq("email", p_email).maybeSingle()
      if (!authUser?.id) {
        return new Response(JSON.stringify({ error: "Failed to resolve user id" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      // Store on global for this request scope
      (globalThis as unknown as { resolvedUserId?: string }).resolvedUserId = authUser.id
    }

    const resolvedId = (created?.user?.id) ?? ((globalThis as unknown as { resolvedUserId?: string }).resolvedUserId)
    const finalUserId = resolvedId as string

    // Ensure profile exists / upsert
    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert({ id: finalUserId, email: p_email, display_name: p_display_name }, { onConflict: "id" })
    if (profileErr) throw profileErr

    // Add to band_members (upsert role)
    const { error: memberErr } = await adminClient
      .from("band_members")
      .upsert({ band_id: p_band_id, user_id: finalUserId, role: p_role })
    if (memberErr) throw memberErr

    return new Response(JSON.stringify({ user_id: finalUserId }), {
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


