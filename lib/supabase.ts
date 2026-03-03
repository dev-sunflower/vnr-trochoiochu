import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const GAME_CHANNEL = "game-realtime";

export const broadcastGameState = async (state: any) => {
  try {
    const channel = supabase.channel(GAME_CHANNEL);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "game-update",
      payload: state,
    });
  } catch (err) {
    console.error("Error broadcasting state:", err);
  }
};
