import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { groupId, eventName } = await req.json()
    
    // Get the ballchasing API key from Supabase secrets
    const ballchasingApiKey = Deno.env.get('BALLCHASING_API_KEY')
    if (!ballchasingApiKey) {
      throw new Error('Ballchasing API key not configured')
    }

    // Fetch group data from ballchasing API
    const ballchasingResponse = await fetch(`https://ballchasing.com/api/groups/${groupId}`, {
      headers: {
        'Authorization': ballchasingApiKey
      }
    })

    if (!ballchasingResponse.ok) {
      throw new Error(`Ballchasing API error: ${ballchasingResponse.status}`)
    }

    const groupData = await ballchasingResponse.json()
    
    // Extract players from the group data
    const players = groupData.players || []
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get or create event
    let { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('name', eventName)
      .single()

    if (!event) {
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          name: eventName,
          starts_at: new Date().toISOString().split('T')[0]
        })
        .select('id')
        .single()
      
      if (error) throw error
      event = newEvent
    }

    // Process and insert players
    const playersToInsert = []
    const playersForEvent = []
    
    for (const player of players) {
      const platformId = `${player.platform}:${player.id}`
      
      // Check if player already exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('platform_id', platformId)
        .single()

      let playerId
      if (existingPlayer) {
        playerId = existingPlayer.id
      } else {
        // Insert new player
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert({
            name: player.name,
            platform_id: platformId
          })
          .select('id')
          .single()
        
        if (error) throw error
        playerId = newPlayer.id
      }
      
      playersForEvent.push(playerId)
      
      // Create event_stats entry for this player
      await supabase
        .from('event_stats')
        .upsert({
          player_id: playerId,
          events: [event.id],
          stats: player.cumulative || {},
          price: Math.floor(Math.random() * 1000) + 1500 // Temporary random price
        })
    }

    // Update the event with available players
    await supabase
      .from('events')
      .update({
        available_players: playersForEvent
      })
      .eq('id', event.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${players.length} players for event "${eventName}"`,
        eventId: event.id,
        playersCount: players.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})