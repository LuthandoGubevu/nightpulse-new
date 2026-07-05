
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const signUpSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function getRedirectTarget(searchParams: URLSearchParams): string {
  const raw = searchParams.get("redirect");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/dashboard";
}

function mapAuthError(code?: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger password.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const redirectTo = getRedirectTarget(searchParams);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [authLoading, user, router, redirectTo]);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  async function onSignIn(values: SignInValues) {
    if (!auth) {
      toast({ title: "Error", description: "Authentication service is not configured.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Welcome back", description: "Signed in successfully." });
      router.push(redirectTo);
    } catch (error: any) {
      toast({ title: "Sign In Failed", description: mapAuthError(error.code), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignUp(values: SignUpValues) {
    if (!auth) {
      toast({ title: "Error", description: "Authentication service is not configured.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Account Created", description: "Welcome to NightPulse." });
      router.push(redirectTo);
    } catch (error: any) {
      toast({ title: "Sign Up Failed", description: mapAuthError(error.code), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onGoogleSignIn() {
    if (!auth) {
      toast({ title: "Error", description: "Authentication service is not configured.", variant: "destructive" });
      return;
    }
    setIsGoogleSubmitting(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast({ title: "Welcome", description: "Signed in with Google." });
      router.push(redirectTo);
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
        // User just closed the popup — not a real error, no toast needed.
      } else {
        toast({ title: "Google Sign-In Failed", description: mapAuthError(error.code), variant: "destructive" });
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isGoogleSubmitting;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Welcome to NightPulse</CardTitle>
        <CardDescription>Sign in or create an account to continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4">
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Icons.mail className="mr-1 inline h-4 w-4" /> Email
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Icons.keyRound className="mr-1 inline h-4 w-4" /> Password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isBusy}>
                  {isSubmitting ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.logIn className="mr-2 h-4 w-4" />
                  )}
                  Sign In
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Icons.mail className="mr-1 inline h-4 w-4" /> Email
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Icons.keyRound className="mr-1 inline h-4 w-4" /> Password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Icons.keyRound className="mr-1 inline h-4 w-4" /> Confirm Password
                      </FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isBusy}>
                  {isSubmitting ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.userPlus className="mr-2 h-4 w-4" />
                  )}
                  Sign Up
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={onGoogleSignIn} disabled={isBusy}>
          {isGoogleSubmitting ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
