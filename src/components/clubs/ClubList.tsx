import type { ClubWithId } from "@/types";
import { ClubCard } from "./ClubCard";

interface ClubListProps {
  clubs: ClubWithId[];
}

export function ClubList({ clubs }: ClubListProps) {
  if (!clubs || clubs.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No nightclubs found.</p>
        <p className="text-sm text-muted-foreground">Admins can add clubs in the management section.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clubs.map((club) => (
        <ClubCard key={club.id} club={club} />
      ))}
    </div>
  );
}
