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
    console.log('Test function started')
    
    // Test Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const ballchasingApiKey = Deno.env.get('BALLCHASING_API_KEY')
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasBallchasingKey: !!ballchasingApiKey
    })

    if (!ballchasingApiKey) {
      throw new Error('Ballchasing API key not configured')
    }

    // Test ballchasing API
    console.log('Testing ballchasing API...')
    const ballchasingResponse = await fetch(`https://ballchasing.com/api/groups/regional-1-x1z5gypjs2`, {
      headers: {
        'Authorization': ballchasingApiKey
      }
    })

    console.log('Ballchasing response status:', ballchasingResponse.status)
    
    if (!ballchasingResponse.ok) {
      const errorText = await ballchasingResponse.text()
      console.error('Ballchasing API error:', errorText)
      throw new Error(`Ballchasing API error: ${ballchasingResponse.status} - ${errorText}`)
    }

    const groupData = await ballchasingResponse.json()
    console.log('Group data received, players:', groupData.players?.length || 0)

    // Test Supabase connection
    console.log('Testing Supabase connection...')
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Simple test query
    const { data, error } = await supabase
      .from('players')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Supabase test error:', error)
      throw new Error(`Supabase connection error: ${error.message}`)
    }

    console.log('All tests passed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'All tests passed successfully',
        ballchasingPlayers: groupData.players?.length || 0,
        environment: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          hasBallchasingKey: !!ballchasingApiKey
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Test function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})