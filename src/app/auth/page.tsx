
import { AuthForm } from "@/components/auth/AuthForm";
import { PageHeader } from "@/components/common/PageHeader";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <PageHeader
          title="Welcome to NightPulse"
          description="Sign in to your account or create a new one to continue."
          className="text-center"
        />
        <Suspense fallback={<div className="text-center">Loading form...</div>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
