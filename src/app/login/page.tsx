"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/app/api/actions";
import { toast } from "sonner";
import type { loginFormType } from "@/types/loginFormType";
import { useUser } from "@/context/user-context";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Image from "next/image";

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const { user, isLoading: userLoading, refreshUser } = useUser();

  useEffect(() => {
    if (!userLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, userLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<loginFormType>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: loginFormType) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await login(data);

      if (response.success) {
        toast.success("Logged in successfully");

        await refreshUser();

        router.replace("/dashboard");
      } else {
        setError(response.error || "Invalid email or password");
        toast.error("Error during signing in. Please try again.");
      }
    } catch (err) {
      console.error("Error logging in: ", err);
      toast.error("Error during signing in. Please try again later!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      <div className="flex w-full flex-col md:flex-row">
        {/* Left panel */}
        <div className="w-full p-8 md:w-1/2 md:p-12">
          <div className="mb-6 flex items-center">
            <div className="flex items-center justify-center">
              <Image src="/logo.png" alt="Forge Logo" width={48} height={48} />
            </div>
            <span className="text-xl font-bold text-white">FORGE</span>
          </div>

          <div className="mb-12">
            <h1 className="mb-2 text-3xl font-bold text-white">Welcome back</h1>
            <p className="text-white/80">
              Login to your account to continue studying
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/20 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="mb-2 block text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-white/50 focus:border-slate-600 focus:ring-slate-600"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-300">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block text-white">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "password" : "text"}
                  className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-white/50 focus:border-slate-600 focus:ring-slate-600"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/70"
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-300">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-slate-800 text-white hover:bg-slate-700"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/80">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-medium text-white hover:underline"
              >
                Sign up
              </Link>{" "}
              now!
            </p>
          </div>
        </div>

        {/* Right panel - AI assistant preview */}
        <div className="hidden w-1/2 bg-slate-900 p-12 md:block">
          <div className="mb-8 text-3xl font-bold text-white">
            Your personalized AI Learning Assistant!
          </div>

          <div className="rounded-lg bg-slate-800 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                  <path d="M12 8v4l3 3 1-1-2.5-2.5V8z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-white">FORGE</span>
              <div className="ml-auto text-xs text-white/70">02:30:00</div>
              <div className="ml-2 h-6 w-6 rounded-full bg-slate-700 border border-slate-600"></div>
            </div>

            <div className="text-center">
              <p className="mb-4 text-white">
                What would you like to learn today?
              </p>
              <div className="relative mx-auto w-full max-w-xs rounded bg-slate-700 px-4 py-2">
                <p className="text-white/70">Enter a topic</p>
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 space-x-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600">
                    <span className="text-xs text-white">+</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600">
                    <span className="text-xs text-white">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
