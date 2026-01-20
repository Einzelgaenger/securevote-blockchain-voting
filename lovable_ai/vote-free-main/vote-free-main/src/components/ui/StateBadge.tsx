import { cn } from "@/lib/utils";

type RoomState = "inactive" | "active" | "ended" | "closed";

interface StateBadgeProps {
  state: RoomState;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const stateConfig: Record<RoomState, { label: string; className: string }> = {
  inactive: {
    label: "Not Started",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  active: {
    label: "Live",
    className: "bg-success/10 text-success border-success/30",
  },
  ended: {
    label: "Counting",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  closed: {
    label: "Closed",
    className: "bg-primary/10 text-primary border-primary/30",
  },
};

const sizeConfig = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function StateBadge({ state, size = "md", className }: StateBadgeProps) {
  const config = stateConfig[state];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border",
        sizeConfig[size],
        config.className,
        className
      )}
    >
      {state === "active" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
      )}
      {config.label}
    </span>
  );
}
