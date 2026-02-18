"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore, useHasHydrated } from "@/lib/stores/auth-store";
import { api } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  experience_level: z.number().min(1).max(10),
  business_type: z.enum(["ONLINE", "LOCAL", "HYBRID"]),
  budget: z.number().min(0),
  income_goal: z.number().min(0),
  weekly_hours: z.number().min(1).max(168),
});

type FormData = z.infer<typeof schema>;

const experienceLevels = [
  { value: 1, label: "Complete beginner" },
  { value: 3, label: "Some research done" },
  { value: 5, label: "Have a clear idea" },
  { value: 7, label: "Started working on it" },
  { value: 10, label: "Already have customers" },
];

const businessTypes = [
  { value: "ONLINE", label: "Online", description: "Digital products, SaaS, e-commerce", icon: "💻" },
  { value: "LOCAL", label: "Local", description: "Physical location, local services", icon: "🏪" },
  { value: "HYBRID", label: "Hybrid", description: "Mix of online and local", icon: "🌐" },
];

export default function IntakePage() {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isCreatingVenture, setIsCreatingVenture] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      experience_level: 3,
      business_type: "ONLINE",
      budget: 1000,
      income_goal: 5000,
      weekly_hours: 10,
    },
  });

  const { mutate: updateIntake, isPending } = useMutation({
    mutationFn: (data: FormData) => api.updateIntake(user!.id, data),
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      setError(null);
      setIsCreatingVenture(true);

      // Create first venture
      try {
        const venture = await api.createVenture();
        queryClient.invalidateQueries({ queryKey: ["ventures"] });
        router.push(`/ventures/${venture.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create venture";
        setError(`Venture creation failed: ${message}`);
        setIsCreatingVenture(false);
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to save intake";
      setError(`Intake update failed: ${message}`);
    },
  });

  const selectedExperience = watch("experience_level");
  const selectedBusinessType = watch("business_type");

  // Wait for hydration before checking auth
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="py-8 animate-fade-in-up">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="p-8 text-center border-b border-gray-200">
              <div className="relative inline-block mb-4">
                <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Tell us about yourself</h1>
              <p className="text-gray-600">This helps us personalize your entrepreneurial journey</p>
            </div>

            <form onSubmit={handleSubmit((data) => updateIntake(data))}>
              <div className="p-8 space-y-8">
                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Where are you in your entrepreneurial journey?
                  </label>
                  <div className="space-y-2">
                    {experienceLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setValue("experience_level", level.value)}
                        className={`w-full p-4 text-left rounded-xl border transition-all duration-300 ${
                          selectedExperience === level.value
                            ? "border-indigo-500 bg-indigo-50 text-gray-900"
                            : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedExperience === level.value ? "border-indigo-500 bg-indigo-500" : "border-gray-400"
                          }`}>
                            {selectedExperience === level.value && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          {level.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Business Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What type of business are you building?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {businessTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setValue("business_type", type.value as "ONLINE" | "LOCAL" | "HYBRID")}
                        className={`p-4 text-center rounded-xl border transition-all duration-300 ${
                          selectedBusinessType === type.value
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-2xl mb-2">{type.icon}</div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Starting budget ($)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    {...register("budget", { valueAsNumber: true })}
                    error={errors.budget?.message}
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Income Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly income goal ($)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    {...register("income_goal", { valueAsNumber: true })}
                    error={errors.income_goal?.message}
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Weekly Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hours per week you can dedicate
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    {...register("weekly_hours", { valueAsNumber: true })}
                    error={errors.weekly_hours?.message}
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="p-8 pt-0 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 border-0"
                  isLoading={isPending || isCreatingVenture}
                >
                  {isCreatingVenture ? "Creating your venture..." : "Continue to your venture"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
