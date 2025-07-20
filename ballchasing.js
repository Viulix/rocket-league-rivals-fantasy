const fetch = require("node-fetch");
const { supabase } = require("./src/integrations/supabase/client");

const BALLCHASING_API_KEY = "9AwAXu9OuHR7ZaZ8TD42IWAiFL4XqdqNbM8Veidz"; // Replace with your Ballchasing API key
const BALLCHASING_API_URL = "https://ballchasing.com/api";

async function fetchReplayGroup(groupId) {
  const response = await fetch(`${BALLCHASING_API_URL}/groups/${groupId}`, {
    headers: {
      Authorization: `Bearer ${BALLCHASING_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch replay group: ${response.statusText}`);
  }

  return response.json();
}

async function updateDatabaseFromReplayGroup(groupId, eventId) {
  try {
    const replayGroup = await fetchReplayGroup(groupId);

    const players = replayGroup.players || [];
    const availablePlayerIds = [];

    for (const player of players) {
      const { name, id: platformId } = player;

      // Check if player already exists in the database
      const { data: existingPlayer, error: fetchError } = await supabase
        .from("players")
        .select("*")
        .eq("platform_id", platformId)
        .single();

      let playerId;
      if (fetchError && fetchError.code !== "PGRST116") {
        console.error(`Error fetching player ${name}:`, fetchError);
        continue;
      }

      if (existingPlayer) {
        playerId = existingPlayer.id;
      } else {
        // Insert new player
        const { data: newPlayer, error: insertError } = await supabase
          .from("players")
          .insert({
            name,
            platform_id: platformId,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error inserting player ${name}:`, insertError);
          continue;
        }

        playerId = newPlayer.id;
      }

      availablePlayerIds.push(playerId);

      // Update event_stats for the player
      const stats = player.stats || {}; // Replace with actual stats structure
      const price = calculateFantasyPrice(stats); // Replace with your price calculation logic

      const { error: upsertError } = await supabase
        .from("event_stats")
        .upsert(
          {
            player_id: playerId,
            event: eventId,
            stats,
            price,
          },
          { onConflict: ["player_id", "event"] }
        );

      if (upsertError) {
        console.error(`Error upserting event stats for player ${name}:`, upsertError);
      }
    }

    // Update the event with available players
    const { error: updateEventError } = await supabase
      .from("event")
      .update({
        available_players: availablePlayerIds,
      })
      .eq("id", eventId);

    if (updateEventError) {
      console.error(`Error updating event ${eventId}:`, updateEventError);
    }

    console.log("Database updated successfully!");
  } catch (error) {
    console.error("Error updating database from replay group:", error);
  }
}

function calculateFantasyPrice(stats) {
  // Replace with your logic to calculate fantasy price based on stats
  return Math.max(1000, stats.goals * 50 + stats.assists * 30 + stats.saves * 20);
}

// Example usage
const replayGroupId = "regional-1-x1z5gypjs2"; // Replace with your replay group ID
const eventId = "0e240ee0-f9b9-4d9d-bef6-5947129e37c1"; // Replace with your event ID
updateDatabaseFromReplayGroup(replayGroupId, eventId);
//https://ballchasing.com/group/regional-1-x1z5gypjs2