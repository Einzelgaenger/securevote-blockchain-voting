import { motion } from "framer-motion";
import { Wallet, Upload, Vote, Trophy } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    step: "01",
    title: "Create Room & Deposit",
    description:
      "Admin connects wallet, deposits gas budget, and creates a new voting room in seconds.",
  },
  {
    icon: Upload,
    step: "02",
    title: "Upload Excel Lists",
    description:
      "Import voter addresses and candidate names directly from Excel spreadsheets.",
  },
  {
    icon: Vote,
    step: "03",
    title: "Voters Cast Ballots",
    description:
      "Eligible voters connect their wallets and vote for free — no crypto required!",
  },
  {
    icon: Trophy,
    step: "04",
    title: "View Results",
    description:
      "Results are stored permanently on-chain and visible to everyone in real-time.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="container px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From setup to results in four simple steps. 
            No blockchain expertise required.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                    <step.icon className="w-9 h-9 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
