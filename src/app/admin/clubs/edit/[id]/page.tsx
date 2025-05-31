import { PageHeader } from "@/components/common/PageHeader";
import { ClubForm } from "@/components/admin/ClubForm";
import { getClubById } from "@/actions/clubActions";
import { notFound } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/icons";

interface EditClubPageProps {
  params: {
    id: string;
  };
}

export default async function EditClubPage({ params }: EditClubPageProps) {
  const club = await getClubById(params.id);

  if (!club) {
    // Instead of Next's notFound(), show a custom message or redirect,
    // because notFound() might be too abrupt for an admin flow.
    // For now, a simple message:
     return (
      <div className="space-y-6">
        <PageHeader title="Edit Nightclub" />
        <Alert variant="destructive">
          <Icons.warning className="h-4 w-4" />
          <AlertTitle>Club Not Found</AlertTitle>
          <AlertDescription>
            The club with ID "{params.id}" could not be found. It might have been deleted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${club.name}`}
        description="Update the details for this nightclub."
      />
      <ClubForm mode="edit" club={club} />
    </div>
  );
}
