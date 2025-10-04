import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const bandId = url.searchParams.get('bandId')

    if (!bandId) {
      return new Response('Band ID is required', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch band details
    const { data: band, error: bandError } = await supabaseClient
      .from('bands')
      .select('name')
      .eq('id', bandId)
      .single()

    if (bandError || !band) {
      return new Response('Band not found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    }

    // Fetch all future rehearsals for this band
    const { data: rehearsals, error: rehearsalsError } = await supabaseClient
      .from('rehearsals')
      .select('*')
      .eq('band_id', bandId)
      .gte('rehearsal_date', new Date().toISOString().split('T')[0])
      .order('rehearsal_date', { ascending: true })

    if (rehearsalsError) {
      throw rehearsalsError
    }

    // Generate iCal format
    const icalEvents = (rehearsals || []).map((rehearsal: any) => {
      const uid = `${rehearsal.id}@rehearsalist.app`
      const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtstart = rehearsal.rehearsal_date.replace(/-/g, '') +
        (rehearsal.start_time ? 'T' + rehearsal.start_time.replace(':', '') + '00' : '')

      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `SUMMARY:${rehearsal.name}`,
        rehearsal.location ? `LOCATION:${rehearsal.location}` : '',
        rehearsal.description ? `DESCRIPTION:${rehearsal.description}` : '',
        `STATUS:${rehearsal.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT'
      ].filter(Boolean).join('\r\n')
    }).join('\r\n')

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rehearsalist//Band Rehearsals//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${band.name} - Rehearsals`,
      `X-WR-CALDESC:Rehearsal schedule for ${band.name}`,
      'X-WR-TIMEZONE:UTC',
      icalEvents,
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n')

    return new Response(icalContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${band.name.replace(/[^a-z0-9]/gi, '_')}_rehearsals.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    })
  } catch (error) {
    console.error('Error generating calendar feed:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
