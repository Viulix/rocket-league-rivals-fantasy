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
    console.log('Starting ballchasing import...')
    const { groupId, eventName } = await req.json()
    console.log('Import request:', { groupId, eventName })
    
    // Get the ballchasing API key from Supabase secrets
    const ballchasingApiKey = Deno.env.get('BALLCHASING_API_KEY')
    if (!ballchasingApiKey) {
      throw new Error('Ballchasing API key not configured')
    }

    console.log('Fetching from ballchasing API...')
    // Fetch group data from ballchasing API
    const ballchasingResponse = await fetch(`https://ballchasing.com/api/groups/${groupId}`, {
      headers: {
        'Authorization': ballchasingApiKey
      }
    })

    if (!ballchasingResponse.ok) {
      const errorText = await ballchasingResponse.text()
      console.error('Ballchasing API error:', ballchasingResponse.status, errorText)
      throw new Error(`Ballchasing API error: ${ballchasingResponse.status} - ${errorText}`)
    }

    const groupData = await ballchasingResponse.json()
    console.log('Group data received:', { playerCount: groupData.players?.length || 0 })
    
    // Extract players from the group data
    const players = groupData.players || []
    
    if (players.length === 0) {
      throw new Error('No players found in the group')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Checking for existing event...')
    // Get or create event
    let { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('name', eventName)
      .maybeSingle()

    if (!event) {
      console.log('Creating new event...')
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          name: eventName,
          starts_at: new Date().toISOString().split('T')[0]
        })
        .select('id')
        .single()
      
      if (error) {
        console.error('Error creating event:', error)
        throw error
      }
      event = newEvent
      console.log('Event created:', event.id)
    } else {
      console.log('Using existing event:', event.id)
    }

    // Process and insert players
    const playersForEvent = []
    console.log(`Processing ${players.length} players...`)
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const platformId = `${player.platform}:${player.id}`
      console.log(`Processing player ${i + 1}: ${player.name} (${platformId})`)
      
      // Check if player already exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('platform_id', platformId)
        .maybeSingle()

      let playerId
      if (existingPlayer) {
        playerId = existingPlayer.id
        console.log(`Player exists: ${playerId}`)
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
        
        if (error) {
          console.error('Error creating player:', error)
          throw error
        }
        playerId = newPlayer.id
        console.log(`Player created: ${playerId}`)
      }
      
      playersForEvent.push(parseInt(playerId)) // Convert to number for events table
      
      // Create event_stats entry for this player
      const { error: statsError } = await supabase
        .from('event_stats')
        .upsert({
          player_id: parseInt(playerId), // Convert to number since players.id is bigint
          events: [event.id],
          stats: player.cumulative || {},
          price: Math.floor(Math.random() * 1000) + 1500 // Temporary random price
        }, {
          onConflict: 'player_id'
        })
      
      if (statsError) {
        console.error('Error creating event stats:', statsError)
        // Don't throw here, just log the error
      }
    }

    console.log('Updating event with available players...')
    // Update the event with available players
    const { error: updateError } = await supabase
      .from('events')
      .update({
        available_players: playersForEvent
      })
      .eq('id', event.id)

    if (updateError) {
      console.error('Error updating event:', updateError)
      throw updateError
    }

    console.log('Import completed successfully')
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
    console.error('Error in ballchasing import:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})