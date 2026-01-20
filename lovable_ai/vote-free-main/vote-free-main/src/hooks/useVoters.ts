import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export type Voter = {
    voter_address: string;
    voter_credit: string;
    voter_version: number;
    last_voted_round: number | null;
    added_at: string;
};

/**
 * Hook to fetch voters for a specific room
 */
export function useVoters(roomAddress: string | undefined) {
    const [voters, setVoters] = useState<Voter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!roomAddress) return;

        async function fetchVoters() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('voters')
                    .select('*')
                    .eq('room_address', roomAddress)
                    .order('added_at', { ascending: false });

                if (error) throw error;
                setVoters(data || []);
            } catch (err) {
                setError(err as Error);
                console.error('Error fetching voters:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchVoters();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`voters:${roomAddress}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'voters',
                    filter: `room_address=eq.${roomAddress}`,
                },
                () => {
                    fetchVoters();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomAddress]);

    return { voters, loading, error };
}
