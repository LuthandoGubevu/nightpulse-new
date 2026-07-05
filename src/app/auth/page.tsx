
import { AuthForm } from "@/components/auth/AuthForm";
import { Suspense } from "react";
import { Icons } from "@/components/icons";

export default function AuthPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          }
        >
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
