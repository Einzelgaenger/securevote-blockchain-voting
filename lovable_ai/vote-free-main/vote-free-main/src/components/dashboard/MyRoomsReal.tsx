import { motion } from "framer-motion";
import { useAccount } from 'wagmi';
import { GlassCard } from "@/components/ui/GlassCard";
import { StateBadge } from "@/components/ui/StateBadge";
import { GradientButton } from "@/components/ui/GradientButton";
import {
    Users,
    Vote,
    Coins,
    Fuel,
    MoreHorizontal,
    Settings,
    Play,
    Square,
    BarChart3,
    Plus,
    Loader2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoomsByAdmin } from "@/hooks/useSupabase";
import { formatEther } from 'viem';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export function MyRooms() {
    const { address } = useAccount();
    const { data: rooms, isLoading, error } = useRoomsByAdmin(address);

    // Calculate stats
    const totalRooms = rooms?.length || 0;
    const activeRooms = rooms?.filter(r => r.state === 'Active').length || 0;
    const totalVoters = rooms?.reduce((sum, r) => {
        // This would need to be fetched from voters table for each room
        return sum;
    }, 0) || 0;
    const totalGasBalance = rooms?.reduce((sum, r) => sum + Number(r.max_cost_per_vote_wei || 0), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">My Rooms</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your voting rooms and track participation
                    </p>
                </div>
                <GradientButton>
                    <Plus className="w-4 h-4" />
                    Create New Room
                </GradientButton>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassCard className="p-4" hover={false}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Vote className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{totalRooms}</p>
                            <p className="text-sm text-muted-foreground">Total Rooms</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4" hover={false}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <Play className="w-6 h-6 text-success" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{activeRooms}</p>
                            <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4" hover={false}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Users className="w-6 h-6 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{totalVoters}</p>
                            <p className="text-sm text-muted-foreground">Total Voters</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4" hover={false}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Fuel className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">
                                {(totalGasBalance / 1e18).toFixed(3)}
                            </p>
                            <p className="text-sm text-muted-foreground">ETH Balance</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Rooms Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-destructive">Error loading rooms: {error.message}</p>
                </div>
            ) : !rooms || rooms.length === 0 ? (
                <div className="text-center py-12">
                    <Vote className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No rooms yet</h3>
                    <p className="text-muted-foreground mb-6">
                        Create your first voting room to get started
                    </p>
                    <GradientButton>
                        <Plus className="w-4 h-4" />
                        Create New Room
                    </GradientButton>
                </div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4"
                >
                    {rooms.map((room) => (
                        <motion.div key={room.room_address} variants={item}>
                            <GlassCard className="p-6">
                                <div className="space-y-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-semibold truncate">
                                                    {room.room_name}
                                                </h3>
                                                <StateBadge state={room.state as any} />
                                            </div>
                                            <p className="text-xs text-muted-foreground font-mono truncate">
                                                {room.room_address}
                                            </p>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem>
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    Manage Room
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <BarChart3 className="w-4 h-4 mr-2" />
                                                    View Analytics
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                    {room.state === 'Inactive' ? (
                                                        <>
                                                            <Play className="w-4 h-4 mr-2" />
                                                            Start Voting
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Square className="w-4 h-4 mr-2" />
                                                            Stop Voting
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Voters</p>
                                                <p className="font-semibold">
                                                    {/* Would need to fetch from voters table */}
                                                    0
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Vote className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Candidates</p>
                                                <p className="font-semibold">
                                                    {/* Would need to fetch from candidates table */}
                                                    0
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Coins className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Credits</p>
                                                <p className="font-semibold">
                                                    {room.total_credits_used}/{room.total_credits_in_system}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Fuel className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Gas</p>
                                                <p className="font-semibold">
                                                    {(Number(room.max_cost_per_vote_wei || 0) / 1e18).toFixed(3)} ETH
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar (if Active/Ended) */}
                                    {(room.state === 'Active' || room.state === 'Ended') && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Participation</span>
                                                <span className="font-semibold">
                                                    {room.total_credits_used}/{room.total_credits_in_system} votes (
                                                    {room.total_credits_in_system > 0
                                                        ? Math.round((Number(room.total_credits_used) / Number(room.total_credits_in_system)) * 100)
                                                        : 0}%)
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-500"
                                                    style={{
                                                        width: `${room.total_credits_in_system > 0
                                                            ? (Number(room.total_credits_used) / Number(room.total_credits_in_system)) * 100
                                                            : 0}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                        <p className="text-sm text-muted-foreground">
                                            Round {room.current_round}
                                        </p>
                                        <GradientButton variant="outline" size="sm">
                                            Manage Room
                                        </GradientButton>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
