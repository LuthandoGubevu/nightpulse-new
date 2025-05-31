import { PageHeader } from "@/components/common/PageHeader";
import { ClubForm } from "@/components/admin/ClubForm";

export default function NewClubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Nightclub"
        description="Fill in the details for the new nightclub."
      />
      <ClubForm mode="add" />
    </div>
  );
}
