import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get the file data from request body
    const { fileData, fileName, contentType } = await req.json()

    if (!fileData || !fileName) {
      throw new Error('No file provided')
    }

    // Convert base64 to binary
    const base64Data = fileData.split(',')[1] || fileData
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Get file extension
    const fileExt = fileName.split('.').pop()
    const newFileName = `${Math.random()}.${fileExt}`
    const filePath = `${user.id}/${newFileName}`

    // Upload to storage using service role (bypasses RLS)
    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, binaryData, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType || 'image/png'
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
