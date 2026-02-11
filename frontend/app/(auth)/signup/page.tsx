"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useCreateUser, useSendMagicLink } from "@/lib/api/hooks/use-auth";
import { useTrialStore } from "@/lib/stores/trial-store";
import { api } from "@/lib/api/client";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: sendMagicLink, isPending: isSending } = useSendMagicLink();
  const { sessionToken, clearTrial } = useTrialStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Create user
      await createUser(data.email);

      // Send magic link
      await sendMagicLink(data.email);

      // If there's a trial session, we'll claim it after verification
      if (sessionToken) {
        // Store the session token for claiming after login
        localStorage.setItem("pending_trial_claim", sessionToken);
      }

      setSent(true);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (sent) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We&apos;ve created your account and sent you a magic link. Click the
            link in your email to get started.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="link" onClick={() => setSent(false)}>
            Didn&apos;t receive it? Try again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start your entrepreneurial journey today
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent>
          <Input
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            isLoading={isCreating || isSending}
          >
            Create account
          </Button>
          <p className="text-sm text-gray-500 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
