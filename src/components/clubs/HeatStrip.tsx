import { cn } from "@/lib/utils";
import type { ClubStatus } from "@/types";

interface HeatStripProps {
  status: ClubStatus;
}

// A fixed midpoint per status tier, NOT a real crowd percentage — non-admin clients are
// only ever given the 4-tier status enum (Addendum 24, deliberately, after club owners
// raised a legal concern about exact-looking crowd data being public), so the needle
// can't reflect anything more precise than that tier.
const STATUS_META: Record<ClubStatus, { color: string; big: string; sub: string; needle: number }> = {
  low: { color: "#2dd4a7", big: "Chill", sub: "Not busy", needle: 15 },
  moderate: { color: "#f5a623", big: "Filling Up", sub: "Moderately busy", needle: 50 },
  packed: { color: "#ff2d78", big: "Packed", sub: "Very busy", needle: 85 },
  "over-packed": { color: "#ff2d78", big: "Packed", sub: "Very busy", needle: 96 },
  unknown: { color: "#6b7280", big: "Unknown", sub: "No live data", needle: 50 },
};

export function HeatStrip({ status }: HeatStripProps) {
  const meta = STATUS_META[status];
  const known = status !== "unknown";

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-headline text-lg font-bold" style={{ color: meta.color }}>
          {meta.big}
        </span>
        <span className="text-xs text-muted-foreground">{meta.sub}</span>
      </div>
      <div
        className={cn("relative h-4 rounded-full", !known && "grayscale opacity-40")}
        style={{ background: "linear-gradient(90deg, #2dd4a7 0%, #f5a623 52%, #ff2d78 100%)" }}
      >
        {known && (
          <div
            className="absolute top-1/2 h-4 w-4 rounded-full bg-white shadow-md"
            style={{
              left: `${meta.needle}%`,
              transform: "translate(-50%, -50%)",
              border: `4px solid ${meta.color}`,
            }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] tracking-wide text-muted-foreground">
        <span>CHILL</span>
        <span>FILLING</span>
        <span>PACKED</span>
      </div>
      {!known && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          No live data yet — check back soon
        </p>
      )}
    </div>
  );
}
