"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="animate-fade-in-up">
      {/* Logo and branding */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-50" />
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <svg
              className="h-8 w-8 text-white"
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
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-gray-400">Start your entrepreneurial journey today</p>
      </div>

      {/* Card */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl" />
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 text-sm text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center gap-3 animate-fade-in">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                {...registerField("email")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <Input
                type="password"
                placeholder="Create a strong password"
                error={errors.password?.message}
                className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                {...registerField("password")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
                className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                {...registerField("confirmPassword")}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0"
              isLoading={isPending}
            >
              Create account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        {[
          { icon: "🚀", label: "5-Phase Journey" },
          { icon: "🤖", label: "AI-Powered" },
          { icon: "📄", label: "Business Plan" },
        ].map((feature) => (
          <div key={feature.label} className="text-xs text-gray-500">
            <div className="text-lg mb-1">{feature.icon}</div>
            {feature.label}
          </div>
        ))}
      </div>
    </div>
  );
}
