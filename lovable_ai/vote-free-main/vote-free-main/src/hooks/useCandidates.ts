import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export type Candidate = {
    candidate_address: string;
    candidate_name: string;
    candidate_version: number;
    added_at: string;
};

/**
 * Hook to fetch candidates for a specific room
 */
export function useCandidates(roomAddress: string | undefined) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!roomAddress) return;

        async function fetchCandidates() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('candidates')
                    .select('*')
                    .eq('room_address', roomAddress)
                    .order('candidate_name', { ascending: true });

                if (error) throw error;
                setCandidates(data || []);
            } catch (err) {
                setError(err as Error);
                console.error('Error fetching candidates:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchCandidates();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`candidates:${roomAddress}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'candidates',
                    filter: `room_address=eq.${roomAddress}`,
                },
                () => {
                    fetchCandidates();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomAddress]);

    return { candidates, loading, error };
}
