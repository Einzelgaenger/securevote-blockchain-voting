import { Navbar } from "@/components/landing/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useRooms } from "@/hooks/useRooms";
import { useState } from "react";

const RoomExplorer = () => {
    const [search, setSearch] = useState("");
    const [stateFilter, setStateFilter] = useState("All");
    const [sortBy, setSortBy] = useState<'newest' | 'active' | 'voters'>('newest');

    const { rooms, loading, error } = useRooms({
        search,
        state: stateFilter,
        sortBy,
    });

    const getStateBadge = (state: string) => {
        const variants: Record<string, { color: string; emoji: string }> = {
            'Active': { color: 'bg-green-500/10 text-green-500 border-green-500/20', emoji: '🟢' },
            'Inactive': { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', emoji: '⚫' },
            'Ended': { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', emoji: '🔵' },
            'Closed': { color: 'bg-red-500/10 text-red-500 border-red-500/20', emoji: '🔴' },
        };
        const { color, emoji } = variants[state] || variants['Inactive'];
        return (
            <Badge variant="outline" className={color}>
                {emoji} {state}
            </Badge>
        );
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Explore Voting Rooms</h1>
                    <p className="text-muted-foreground">Browse all public voting rooms on the platform</p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by room name or address..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={stateFilter} onValueChange={setStateFilter}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by state" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All States</SelectItem>
                            <SelectItem value="Active">Active Only</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Ended">Ended</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'newest' | 'active' | 'voters')}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="active">Most Active</SelectItem>
                            <SelectItem value="voters">Most Voters</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading rooms...</span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="text-center py-12">
                            <p className="text-destructive font-semibold">Error loading rooms</p>
                            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Room Cards Grid */}
                {!loading && !error && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {rooms.length === 0 ? (
                            <div className="col-span-full">
                                <Card>
                                    <CardContent className="text-center py-12">
                                        <p className="text-muted-foreground">No rooms found</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {search ? 'Try a different search term' : 'Rooms will appear here when created'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <Card key={room.room_address} className="hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="truncate">{room.room_name}</CardTitle>
                                            {getStateBadge(room.state)}
                                        </div>
                                        <CardDescription className="truncate">
                                            Admin: {formatAddress(room.room_admin)}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Current Round</p>
                                                    <p className="font-semibold">{room.current_round}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Credits Pool</p>
                                                    <p className="font-semibold">{room.available_credits_pool}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Total Credits</p>
                                                    <p className="font-semibold">{room.total_credits_in_system}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Created</p>
                                                    <p className="font-semibold">{formatDate(room.created_at)}</p>
                                                </div>
                                            </div>
                                            <Link to={`/explore/${room.room_address}`}>
                                                <Button className="w-full">View Details</Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomExplorer;

