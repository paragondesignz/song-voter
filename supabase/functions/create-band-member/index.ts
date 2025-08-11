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

    // Check if user already exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers()
    const user = existingUser.users.find(u => u.email === p_email)

    let userId: string

    if (user) {
      // User exists, update password to match band password
      const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
        password: band.shared_password
      })
      if (updateError) throw updateError
      userId = user.id
    } else {
      // Create new user
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: p_email,
        password: band.shared_password,
        email_confirm: true,
        user_metadata: { display_name: p_display_name },
      })
      if (createErr) throw createErr
      userId = created.user!.id
    }

    // Ensure profile exists and is up to date
    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert({ 
        id: userId, 
        email: p_email, 
        display_name: p_display_name 
      }, { 
        onConflict: "id",
        ignoreDuplicates: false
      })
    if (profileErr) throw profileErr

    // Add to band_members (upsert role)
    const { error: memberErr } = await adminClient
      .from("band_members")
      .upsert({ 
        band_id: p_band_id, 
        user_id: userId, 
        role: p_role 
      }, {
        onConflict: "band_id,user_id",
        ignoreDuplicates: false
      })
    if (memberErr) throw memberErr

    return new Response(JSON.stringify({ 
      user_id: userId,
      message: "Band member account created/updated successfully",
      login_instructions: {
        email: p_email,
        password: "Use your band's shared password",
        note: "You can change your password after logging in"
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("Create band member error:", e)
    return new Response(JSON.stringify({ 
      error: (e as Error).message,
      details: "Failed to create band member account"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})


