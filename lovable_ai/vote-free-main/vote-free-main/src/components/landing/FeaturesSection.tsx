import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Zap, Shield, BarChart3, FileSpreadsheet } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Gasless Voting",
    description:
      "Voters don't need ETH or any cryptocurrency. They just connect their wallet and vote — completely free.",
    gradient: "from-warning to-orange-500",
  },
  {
    icon: Shield,
    title: "Immutable Records",
    description:
      "Every vote is permanently stored on the Ethereum blockchain. No one can alter or delete voting records.",
    gradient: "from-success to-emerald-500",
  },
  {
    icon: BarChart3,
    title: "Real-time Results",
    description:
      "Watch votes come in live. Analytics dashboards update instantly as votes are cast.",
    gradient: "from-primary to-blue-500",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel Import",
    description:
      "Upload voter lists and candidates via Excel. Support for up to 400 voters and 350 candidates per room.",
    gradient: "from-secondary to-purple-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Choose <span className="gradient-text">SecureVote</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The most user-friendly blockchain voting platform. 
            Enterprise-grade security meets consumer-grade simplicity.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={feature.title} variants={item}>
              <GlassCard className="h-full p-6 group">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
