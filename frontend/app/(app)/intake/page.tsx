"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";
import { api } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  { value: "ONLINE", label: "Online", description: "Digital products, SaaS, e-commerce" },
  { value: "LOCAL", label: "Local", description: "Physical location, local services" },
  { value: "HYBRID", label: "Hybrid", description: "Mix of online and local" },
];

export default function IntakePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

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

      // Create first venture
      try {
        const venture = await api.createVenture();
        queryClient.invalidateQueries({ queryKey: ["ventures"] });
        toast.success("Let's get started!");
        router.push(`/ventures/${venture.id}`);
      } catch (error) {
        router.push("/dashboard");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const selectedExperience = watch("experience_level");
  const selectedBusinessType = watch("business_type");

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
            <CardDescription>
              This helps us personalize your entrepreneurial journey
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit((data) => updateIntake(data))}>
            <CardContent className="space-y-8">
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
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedExperience === level.value
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {level.label}
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
                      className={`p-4 text-center rounded-lg border transition-colors ${
                        selectedBusinessType === type.value
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {type.description}
                      </div>
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
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" isLoading={isPending}>
                Continue to your venture
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
