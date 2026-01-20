import { motion } from "framer-motion";
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
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockRooms = [
  {
    id: "1",
    name: "Annual Board Election 2024",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00",
    state: "active" as const,
    round: 1,
    voters: 156,
    totalVoters: 200,
    candidates: 12,
    votes: 89,
    creditsUsed: 89,
    totalCredits: 200,
    gasBalance: 0.245,
  },
  {
    id: "2",
    name: "Q4 Budget Proposal Vote",
    address: "0x8ba1f109551bD432803012645Hc136dfe6f0Fe38",
    state: "inactive" as const,
    round: 1,
    voters: 45,
    totalVoters: 100,
    candidates: 5,
    votes: 0,
    creditsUsed: 0,
    totalCredits: 100,
    gasBalance: 0.1,
  },
  {
    id: "3",
    name: "Community Grant Allocation",
    address: "0x1CBd3b2770909D4e10f157caBc84C7264073C9Ec",
    state: "ended" as const,
    round: 2,
    voters: 342,
    totalVoters: 400,
    candidates: 25,
    votes: 342,
    creditsUsed: 342,
    totalCredits: 400,
    gasBalance: 0.05,
  },
  {
    id: "4",
    name: "Protocol Upgrade Proposal",
    address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
    state: "closed" as const,
    round: 3,
    voters: 189,
    totalVoters: 189,
    candidates: 3,
    votes: 189,
    creditsUsed: 189,
    totalCredits: 189,
    gasBalance: 0.02,
  },
];

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
              <p className="text-2xl font-bold">{mockRooms.length}</p>
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
              <p className="text-2xl font-bold">
                {mockRooms.filter((r) => r.state === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockRooms.reduce((acc, r) => acc + r.totalVoters, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Voters</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Fuel className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockRooms.reduce((acc, r) => acc + r.gasBalance, 0).toFixed(3)}
              </p>
              <p className="text-sm text-muted-foreground">ETH Balance</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Room Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid md:grid-cols-2 gap-6"
      >
        {mockRooms.map((room) => (
          <motion.div key={room.id} variants={item}>
            <GlassCard className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-semibold text-lg truncate">{room.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono truncate">
                    {room.address}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StateBadge state={room.state} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
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
                      {room.state === "inactive" && (
                        <DropdownMenuItem className="text-success">
                          <Play className="w-4 h-4 mr-2" />
                          Start Voting
                        </DropdownMenuItem>
                      )}
                      {room.state === "active" && (
                        <DropdownMenuItem className="text-warning">
                          <Square className="w-4 h-4 mr-2" />
                          Stop Voting
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Voters:</span>
                  <span className="font-medium">{room.totalVoters}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Vote className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Candidates:</span>
                  <span className="font-medium">{room.candidates}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Credits:</span>
                  <span className="font-medium">
                    {room.creditsUsed}/{room.totalCredits}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Fuel className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Gas:</span>
                  <span className="font-medium">{room.gasBalance} ETH</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Participation</span>
                  <span className="font-medium">
                    {room.votes}/{room.totalVoters} votes (
                    {Math.round((room.votes / room.totalVoters) * 100)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{
                      width: `${(room.votes / room.totalVoters) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Round badge */}
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Round {room.round}
                </span>
                <GradientButton variant="outline" size="sm">
                  Manage Room
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
