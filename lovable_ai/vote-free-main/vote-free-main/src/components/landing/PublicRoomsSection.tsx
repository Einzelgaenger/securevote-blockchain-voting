import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { StateBadge } from "@/components/ui/StateBadge";
import { GradientButton } from "@/components/ui/GradientButton";
import { Users, Vote, ArrowRight } from "lucide-react";

const mockRooms = [
  {
    id: 1,
    name: "Annual Board Election 2024",
    state: "active" as const,
    voters: 156,
    totalVoters: 200,
    votes: 89,
    round: 1,
  },
  {
    id: 2,
    name: "Community Grant Allocation",
    state: "active" as const,
    voters: 342,
    totalVoters: 400,
    votes: 298,
    round: 1,
  },
  {
    id: 3,
    name: "Protocol Upgrade Proposal",
    state: "closed" as const,
    voters: 189,
    totalVoters: 189,
    votes: 189,
    round: 2,
  },
];

export function PublicRoomsSection() {
  return (
    <section className="py-24">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-12"
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Active <span className="gradient-text">Voting Rooms</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl">
              Explore public voting rooms and see blockchain democracy in action.
            </p>
          </div>
          <GradientButton variant="outline" className="mt-4 md:mt-0">
            View All Rooms
            <ArrowRight className="w-4 h-4" />
          </GradientButton>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-lg leading-tight pr-2">
                    {room.name}
                  </h3>
                  <StateBadge state={room.state} size="sm" />
                </div>

                <div className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">Participation</span>
                      <span className="font-medium">
                        {Math.round((room.votes / room.totalVoters) * 100)}%
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

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{room.totalVoters} voters</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Vote className="w-4 h-4" />
                      <span>{room.votes} votes</span>
                    </div>
                  </div>

                  {/* Action button */}
                  <GradientButton
                    variant={room.state === "active" ? "primary" : "outline"}
                    size="sm"
                    className="w-full"
                  >
                    {room.state === "active" ? "View Room" : "See Results"}
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
