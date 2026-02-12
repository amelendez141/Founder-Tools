"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useRegister } from "@/lib/api/hooks/use-auth";
import { useTrialStore } from "@/lib/stores/trial-store";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const { mutate: register, isPending } = useRegister();
  const { sessionToken } = useTrialStore();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    setError(null);

    // If there's a trial session, store it for claiming after registration
    if (sessionToken) {
      localStorage.setItem("pending_trial_claim", sessionToken);
    }

    register(
      { email: data.email, password: data.password },
      {
        onError: (err) => {
          setError(err.message || "Registration failed. Please try again.");
        },
      }
    );
  };

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
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <Input
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...registerField("email")}
          />
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            error={errors.password?.message}
            {...registerField("password")}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            error={errors.confirmPassword?.message}
            {...registerField("confirmPassword")}
          />
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            isLoading={isPending}
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
