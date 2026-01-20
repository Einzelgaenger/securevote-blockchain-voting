import { SidebarTrigger } from "@/components/ui/sidebar";
import { GradientButton } from "@/components/ui/GradientButton";
import { Bell, Search } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="h-16 border-b border-border/50 bg-card/30 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search rooms..."
            className="w-64 h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
        </button>

        {/* Network badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium text-success">Sepolia</span>
        </div>

        {/* Gas balance */}
        <GradientButton variant="outline" size="sm" className="hidden sm:flex">
          <span className="text-muted-foreground">Balance:</span>
          <span className="font-semibold">0.245 ETH</span>
        </GradientButton>
      </div>
    </header>
  );
}
