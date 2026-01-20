import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientButton } from "@/components/ui/GradientButton";
import { 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Download, 
  FileSpreadsheet,
  Users,
  Vote,
  CheckCircle2,
  AlertCircle,
  Fuel,
  Coins
} from "lucide-react";

const steps = [
  { id: 1, title: "Room Details", description: "Basic configuration" },
  { id: 2, title: "Add Voters", description: "Upload voter list" },
  { id: 3, title: "Add Candidates", description: "Upload candidates" },
  { id: 4, title: "Review & Deploy", description: "Confirm and create" },
];

export function CreateRoom() {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Create New Room</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new voting room in just a few steps
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  currentStep >= step.id
                    ? "bg-gradient-to-br from-primary to-secondary text-white shadow-glow"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                  currentStep > step.id
                    ? "bg-gradient-to-r from-primary to-secondary"
                    : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 1 && <Step1RoomDetails />}
          {currentStep === 2 && <Step2AddVoters />}
          {currentStep === 3 && <Step3AddCandidates />}
          {currentStep === 4 && <Step4Review />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border/50">
        <GradientButton
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </GradientButton>

        {currentStep < 4 ? (
          <GradientButton onClick={nextStep}>
            Next Step
            <ArrowRight className="w-4 h-4" />
          </GradientButton>
        ) : (
          <GradientButton>
            <Vote className="w-4 h-4" />
            Deploy Room
          </GradientButton>
        )}
      </div>
    </div>
  );
}

function Step1RoomDetails() {
  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold mb-6">Room Details</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Room Name</label>
          <input
            type="text"
            placeholder="e.g., Annual Board Election 2024"
            className="w-full h-12 px-4 rounded-xl bg-muted/50 border border-border/50 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Initial Gas Deposit
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Fuel className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                placeholder="0.1"
                step="0.01"
                className="w-full h-12 pl-12 pr-16 rounded-xl bg-muted/50 border border-border/50 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                ETH
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Estimated: ~500 votes with 0.1 ETH
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Max Cost Per Vote (Advanced)
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                placeholder="0.001"
                step="0.0001"
                defaultValue="0.001"
                className="w-full h-12 pl-12 pr-16 rounded-xl bg-muted/50 border border-border/50 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                ETH
              </span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Step2AddVoters() {
  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold mb-6">Add Voters</h2>
      
      <div className="space-y-6">
        {/* Download Template */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Use our Excel template for easy upload
              </p>
            </div>
          </div>
          <GradientButton variant="outline" size="sm">
            <Download className="w-4 h-4" />
            voters-template.csv
          </GradientButton>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Upload Voter List</h3>
          <p className="text-muted-foreground mb-4">
            Drag & drop your Excel file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports .csv and .xlsx files
          </p>
        </div>

        {/* Preview (mock) */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Preview</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-success">150 valid addresses</span>
            </div>
          </div>
          <div className="p-4 text-sm text-muted-foreground">
            Upload a file to preview voter addresses
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Step3AddCandidates() {
  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold mb-6">Add Candidates</h2>
      
      <div className="space-y-6">
        {/* Download Template */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/5 border border-secondary/20">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-secondary" />
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Use our Excel template for candidates
              </p>
            </div>
          </div>
          <GradientButton variant="outline" size="sm">
            <Download className="w-4 h-4" />
            candidates-template.csv
          </GradientButton>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:border-secondary/50 hover:bg-secondary/5 transition-all cursor-pointer">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Upload Candidate List</h3>
          <p className="text-muted-foreground mb-4">
            Drag & drop your Excel file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports .csv and .xlsx files
          </p>
        </div>

        {/* Preview (mock) */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Preview</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-success">12 candidates added</span>
            </div>
          </div>
          <div className="p-4 text-sm text-muted-foreground">
            Upload a file to preview candidates
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Step4Review() {
  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold mb-6">Review & Deploy</h2>
      
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Room Name</p>
            <p className="font-semibold">Annual Board Election 2024</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Gas Deposit</p>
            <p className="font-semibold">0.1 ETH</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Total Voters</p>
            <p className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              150 addresses
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Total Candidates</p>
            <p className="font-semibold flex items-center gap-2">
              <Vote className="w-4 h-4 text-secondary" />
              12 candidates
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Total Credits</p>
            <p className="font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-warning" />
              150 credits
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Estimated Fees</p>
            <p className="font-semibold flex items-center gap-2">
              <Fuel className="w-4 h-4 text-success" />
              ~0.015 ETH
            </p>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">Deployment will execute 3 transactions:</p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Create voting room contract</li>
                <li>Register voters and allocate credits</li>
                <li>Add candidates to the ballot</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
