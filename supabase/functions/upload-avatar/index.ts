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
    console.log('Upload avatar function invoked')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    console.log('Verifying user...')

    // Verify the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('User verification failed:', userError)
      throw new Error('Unauthorized')
    }

    console.log('User verified:', user.id)

    // Get the file data from request body
    const { fileData, fileName, contentType } = await req.json()

    console.log('File data received:', { fileName, contentType, dataLength: fileData?.length })

    if (!fileData || !fileName) {
      throw new Error('No file provided')
    }

    // Convert base64 to binary
    console.log('Converting base64 to binary...')
    const base64Data = fileData.split(',')[1] || fileData
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Get file extension
    const fileExt = fileName.split('.').pop()
    const newFileName = `${Math.random()}.${fileExt}`
    const filePath = `${user.id}/${newFileName}`

    console.log('Uploading to storage:', filePath)

    // Upload to storage using service role (bypasses RLS)
    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, binaryData, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType || 'image/png'
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Upload successful, getting public URL...')

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath)

    console.log('Public URL:', publicUrl)
    console.log('Updating profile...')

    // Update profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      throw updateError
    }

    console.log('Avatar upload complete!')

    return new Response(
      JSON.stringify({ publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in upload-avatar function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
