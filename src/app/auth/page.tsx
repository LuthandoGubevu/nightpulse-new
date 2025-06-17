
// import { AuthForm } from "@/components/auth/AuthForm"; // AuthForm is no longer used
import { PageHeader } from "@/components/common/PageHeader";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/icons";

export default function AuthPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <PageHeader
          title="Authentication"
          description="User authentication has been removed from this application."
          className="text-center"
        />
        <Alert>
            <Icons.warning className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
                This page is no longer active as authentication has been removed.
                You can navigate directly to other parts of the application, like the dashboard.
            </AlertDescription>
        </Alert>
        {/* <Suspense fallback={<div className="text-center">Loading form...</div>}>
          <AuthForm /> // AuthForm removed
        </Suspense> */}
      </div>
    </div>
  );
}
