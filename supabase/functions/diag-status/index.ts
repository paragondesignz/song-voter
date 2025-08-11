import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Service configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceKey)

    // Get basic system status
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers()
    if (usersError) throw usersError

    // Check profiles table
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, display_name")
      .limit(10)
    if (profilesError) throw profilesError

    // Check bands table
    const { data: bands, error: bandsError } = await adminClient
      .from("bands")
      .select("id, name, shared_password")
      .limit(10)
    if (bandsError) throw bandsError

    // Check band_members table
    const { data: bandMembers, error: bandMembersError } = await adminClient
      .from("band_members")
      .select("id, band_id, user_id, role")
      .limit(10)
    if (bandMembersError) throw bandMembersError

    // Check RLS status
    const { data: rlsStatus, error: rlsError } = await adminClient
      .rpc("get_rls_status")

    const status = {
      timestamp: new Date().toISOString(),
      system: "operational",
      auth: {
        total_users: users.length,
        confirmed_users: users.filter(u => u.email_confirmed_at).length,
        unconfirmed_users: users.filter(u => !u.email_confirmed_at).length
      },
      profiles: {
        total: profiles?.length || 0,
        sample: profiles?.slice(0, 3) || []
      },
      bands: {
        total: bands?.length || 0,
        with_shared_password: bands?.filter(b => b.shared_password).length || 0,
        sample: bands?.slice(0, 3) || []
      },
      band_members: {
        total: bandMembers?.length || 0,
        sample: bandMembers?.slice(0, 3) || []
      },
      rls: rlsStatus || "Unable to check RLS status",
      recommendations: []
    }

    // Add recommendations based on findings
    if (status.auth.unconfirmed_users > 0) {
      status.recommendations.push("Some users have unconfirmed emails - this may cause login issues")
    }

    if (status.bands.with_shared_password === 0) {
      status.recommendations.push("No bands have shared passwords set - band members cannot be created")
    }

    if (status.profiles.total < status.auth.total_users) {
      status.recommendations.push("Some users are missing profiles - this will cause authentication issues")
    }

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ 
      error: (e as Error).message,
      timestamp: new Date().toISOString(),
      system: "error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})


