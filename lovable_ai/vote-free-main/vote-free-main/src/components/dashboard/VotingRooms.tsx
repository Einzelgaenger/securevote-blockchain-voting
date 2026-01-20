import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { StateBadge } from "@/components/ui/StateBadge";
import { GradientButton } from "@/components/ui/GradientButton";
import { Vote, Coins, CheckCircle2, Clock, ArrowRight } from "lucide-react";

const mockVotingRooms = [
  {
    id: "1",
    name: "Annual Board Election 2024",
    state: "active" as const,
    credits: 5,
    hasVoted: false,
    candidates: 12,
  },
  {
    id: "2",
    name: "Community Grant Allocation",
    state: "active" as const,
    credits: 10,
    hasVoted: true,
    votedFor: "Candidate #7 - Green Initiative",
    candidates: 25,
  },
  {
    id: "3",
    name: "Protocol Upgrade Proposal",
    state: "closed" as const,
    credits: 0,
    hasVoted: true,
    votedFor: "Proposal B - Gradual Migration",
    candidates: 3,
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

export function VotingRooms() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Rooms I Can Vote In</h1>
        <p className="text-muted-foreground mt-1">
          Cast your vote in elections where you're registered
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Vote className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockVotingRooms.filter((r) => r.state === "active").length}
              </p>
              <p className="text-sm text-muted-foreground">Active Elections</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockVotingRooms.filter((r) => r.hasVoted).length}
              </p>
              <p className="text-sm text-muted-foreground">Votes Cast</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Coins className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {mockVotingRooms.reduce((acc, r) => acc + r.credits, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Credits</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Room List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {mockVotingRooms.map((room) => (
          <motion.div key={room.id} variants={item}>
            <GlassCard className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{room.name}</h3>
                    <StateBadge state={room.state} size="sm" />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Vote className="w-4 h-4" />
                      <span>{room.candidates} candidates</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Coins className="w-4 h-4" />
                      <span>{room.credits} credits available</span>
                    </div>
                    {room.hasVoted ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Voted: {room.votedFor}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-warning">
                        <Clock className="w-4 h-4" />
                        <span>Not voted yet</span>
                      </div>
                    )}
                  </div>
                </div>

                <GradientButton
                  variant={room.hasVoted || room.state !== "active" ? "outline" : "primary"}
                  className="shrink-0"
                >
                  {room.state === "active" && !room.hasVoted ? (
                    <>
                      Vote Now
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : room.state === "closed" ? (
                    "View Results"
                  ) : (
                    "View Receipt"
                  )}
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state if no rooms */}
      {mockVotingRooms.length === 0 && (
        <GlassCard className="p-12 text-center" hover={false}>
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Vote className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Voting Rooms</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You're not registered as a voter in any active rooms. 
            Contact an admin to be added to a voting room.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
