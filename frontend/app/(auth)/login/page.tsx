"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useLogin } from "@/lib/api/hooks/use-auth";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    setError(null);
    login(
      { email: data.email, password: data.password },
      {
        onError: (err) => {
          setError(err.message || "Invalid email or password");
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
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account
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
            {...register("email")}
          />
          <Input
            type="password"
            placeholder="Password"
            error={errors.password?.message}
            {...register("password")}
          />
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" isLoading={isPending}>
            Sign in
          </Button>
          <p className="text-sm text-gray-500 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
