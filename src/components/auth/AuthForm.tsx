
// This component is no longer used as Firebase Authentication has been removed.
// Keeping the file structure for now, but it renders nothing.

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { useRouter, useSearchParams } from "next/navigation";

// import { Button } from "@/components/ui/button";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useToast } from "@/hooks/use-toast";
// import { Icons } from "@/components/icons";
// import { auth } from "@/lib/firebase"; // auth is removed from firebase.ts
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   GoogleAuthProvider,
//   signInWithPopup,
// } from "firebase/auth"; // These are Firebase Auth SDK
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// const signInSchema = z.object({
//   email: z.string().email({ message: "Please enter a valid email address." }),
//   password: z.string().min(6, { message: "Password must be at least 6 characters." }),
// });

// const signUpSchema = z.object({
//   email: z.string().email({ message: "Please enter a valid email address." }),
//   password: z.string().min(6, { message: "Password must be at least 6 characters." }),
//   confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
// }).refine((data) => data.password === data.confirmPassword, {
//   message: "Passwords do not match.",
//   path: ["confirmPassword"],
// });

// type SignInFormValues = z.infer<typeof signInSchema>;
// type SignUpFormValues = z.infer<typeof signUpSchema>;

export function AuthForm() {
  // All authentication logic has been removed.
  return null;
}
