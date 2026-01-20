import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export type Room = {
    room_address: string;
    room_name: string;
    room_admin: string;
    sponsor_vault: string;
    state: 'Inactive' | 'Active' | 'Ended' | 'Closed';
    current_round: number;
    total_credits_in_system: string;
    available_credits_pool: string;
    created_at: string;
};

/**
 * Hook to fetch all rooms from Supabase
 * Supports search, filter, and sort
 */
export function useRooms(options?: {
    search?: string;
    state?: string;
    sortBy?: 'newest' | 'active' | 'voters';
}) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchRooms() {
            try {
                setLoading(true);
                let query = supabase.from('rooms').select('*');

                // Apply search
                if (options?.search) {
                    query = query.or(`room_name.ilike.%${options.search}%,room_address.ilike.%${options.search}%`);
                }

                // Apply state filter
                if (options?.state && options.state !== 'All') {
                    query = query.eq('state', options.state);
                }

                // Apply sorting
                if (options?.sortBy === 'newest') {
                    query = query.order('created_at', { ascending: false });
                } else if (options?.sortBy === 'active') {
                    query = query.eq('state', 'Active').order('created_at', { ascending: false });
                }

                const { data, error } = await query;

                if (error) throw error;
                setRooms(data || []);
            } catch (err) {
                setError(err as Error);
                console.error('Error fetching rooms:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchRooms();
    }, [options?.search, options?.state, options?.sortBy]);

    return { rooms, loading, error };
}
