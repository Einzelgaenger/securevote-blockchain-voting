import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found in .env');
  console.warn('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file');
}

/**
 * Supabase Client
 * Used for real-time database queries
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Database Types
 * Auto-generated types for better TypeScript support
 * 
 * To regenerate:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
 */
export type Room = {
  room_address: string;
  room_name: string;
  room_admin: string;
  sponsor_vault: string;
  trusted_forwarder: string;
  state: 'Inactive' | 'Active' | 'Ended' | 'Closed';
  current_round: number;
  voter_registry_version: number;
  candidate_registry_version: number;
  total_credits_in_system: bigint;
  available_credits_pool: bigint;
  total_credits_granted: bigint;
  total_credits_used: bigint;
  max_cost_per_vote_wei: bigint;
  created_at: string;
  updated_at: string;
};

export type Voter = {
  room_address: string;
  voter_address: string;
  voter_version: number;
  voter_credit: bigint;
  last_voted_round: number | null;
  added_at: string;
  updated_at: string;
};

export type Candidate = {
  room_address: string;
  candidate_id: bigint;
  candidate_name: string;
  candidate_version: number;
  added_at: string;
  updated_at: string;
};

export type Vote = {
  vote_id: number;
  room_address: string;
  round_number: number;
  voter_address: string;
  candidate_id: bigint;
  vote_weight: bigint;
  action_id: string;
  tx_hash: string;
  block_number: bigint;
  voted_at: string;
};
