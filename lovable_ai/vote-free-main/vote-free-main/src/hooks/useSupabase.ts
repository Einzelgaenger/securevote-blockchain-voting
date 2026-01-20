import { supabase } from '@/config/supabase';
import type { Room } from '@/config/supabase';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch all rooms from Supabase
 */
export function useRooms() {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Room[];
        },
    });
}

/**
 * Hook to fetch rooms by admin address
 */
export function useRoomsByAdmin(adminAddress: string | undefined) {
    return useQuery({
        queryKey: ['rooms', 'admin', adminAddress],
        queryFn: async () => {
            if (!adminAddress) return [];

            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('room_admin', adminAddress.toLowerCase())
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Room[];
        },
        enabled: !!adminAddress,
    });
}

/**
 * Hook to fetch single room by address
 */
export function useRoom(roomAddress: string | undefined) {
    return useQuery({
        queryKey: ['rooms', roomAddress],
        queryFn: async () => {
            if (!roomAddress) return null;

            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('room_address', roomAddress.toLowerCase())
                .single();

            if (error) throw error;
            return data as Room;
        },
        enabled: !!roomAddress,
    });
}

/**
 * Hook to fetch voters for a room
 */
export function useVoters(roomAddress: string | undefined) {
    return useQuery({
        queryKey: ['voters', roomAddress],
        queryFn: async () => {
            if (!roomAddress) return [];

            const { data, error } = await supabase
                .from('voters')
                .select('*')
                .eq('room_address', roomAddress.toLowerCase());

            if (error) throw error;
            return data;
        },
        enabled: !!roomAddress,
    });
}

/**
 * Hook to fetch candidates for a room
 */
export function useCandidates(roomAddress: string | undefined) {
    return useQuery({
        queryKey: ['candidates', roomAddress],
        queryFn: async () => {
            if (!roomAddress) return [];

            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .eq('room_address', roomAddress.toLowerCase());

            if (error) throw error;
            return data;
        },
        enabled: !!roomAddress,
    });
}

/**
 * Hook to fetch votes for a room
 */
export function useVotes(roomAddress: string | undefined, round?: number) {
    return useQuery({
        queryKey: ['votes', roomAddress, round],
        queryFn: async () => {
            if (!roomAddress) return [];

            let query = supabase
                .from('votes')
                .select('*')
                .eq('room_address', roomAddress.toLowerCase());

            if (round !== undefined) {
                query = query.eq('round_number', round);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        },
        enabled: !!roomAddress,
    });
}
