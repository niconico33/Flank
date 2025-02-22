import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface GameMove {
  game_id: string;
  move_index: number;
  current_player: string;
  board_state: any;
  action: any;
  resulting_state: any;
  winner: string | null;
} 