import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export type Vote = {
    candidate_address: string;
    vote_power: string;
    cost_paid_wei: string;
};

export type VoteTally = {
    candidate_address: string;
    candidate_name?: string;
    total_vote_power: string;
    vote_count: number;
};

/**
 * Hook to get live vote tally for a room
 * Uses real-time subscription for live updates
 */
export function useLiveVoteTally(roomAddress: string | undefined, round: number) {
    const [tally, setTally] = useState<VoteTally[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!roomAddress) return;

        async function fetchTally() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('v_live_vote_tally')
                    .select('*')
                    .eq('room_address', roomAddress)
                    .eq('round', round);

                if (error) throw error;
                setTally(data || []);
            } catch (err) {
                setError(err as Error);
                console.error('Error fetching vote tally:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchTally();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`votes:${roomAddress}:${round}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'votes',
                    filter: `room_address=eq.${roomAddress}`,
                },
                () => {
                    fetchTally();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomAddress, round]);

    return { tally, loading, error };
}
