"use client";

import { useEffect, useState } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login } from "@/app/api/actions";
import { toast } from "sonner";
import { login } from "@/app/api/actions";
import type { loginFormType } from "@/types/loginFormType";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useUser } from "@/context/user-context";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useUser } from "@/context/user-context";

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

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
      console.log("data : ", data);
      const response = await login(data);

      console.log(response);

      if (response.success) {
        router.replace("/dashboard");
      } else {
        setError(response.error || "Invalid email or password");
        toast.error("Error during signing in. Please try again.");
      }
    } catch (err) {
      console.error("Error logging in: ", err);
      console.error("Error logging in: ", err);
      toast.error("Error during signing in. Please try again later!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-teal-800">
      <div className="flex w-full flex-col md:flex-row">
        {/* Left panel */}
        <div className="w-full p-8 md:w-1/2 md:p-12">
          <div className="mb-6 flex items-center">
            <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-teal-800"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                <path d="M12 8v4l3 3 1-1-2.5-2.5V8z" />
              </svg>
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
    <div className="flex min-h-screen bg-teal-800">
      <div className="flex w-full flex-col md:flex-row">
        {/* Left panel */}
        <div className="w-full p-8 md:w-1/2 md:p-12">
          <div className="mb-6 flex items-center">
            <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-teal-800"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                <path d="M12 8v4l3 3 1-1-2.5-2.5V8z" />
              </svg>
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
              <div className="rounded-md bg-red-500/20 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="mb-2 block text-white">
                Email
              </Label>

            <div>
              <Label htmlFor="email" className="mb-2 block text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                className="h-12 bg-white/10 text-white placeholder:text-white/50 focus:border-white focus:ring-white"
                className="h-12 bg-white/10 text-white placeholder:text-white/50 focus:border-white focus:ring-white"
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
                <p className="mt-1 text-sm text-red-300">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block text-white">
                Password
              </Label>

            <div>
              <Label htmlFor="password" className="mb-2 block text-white">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "password" : "text"}
                  className="h-12 bg-white/10 text-white placeholder:text-white/50 focus:border-white focus:ring-white"
                  type={showPassword ? "password" : "text"}
                  className="h-12 bg-white/10 text-white placeholder:text-white/50 focus:border-white focus:ring-white"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                <div onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <FaEye className="absolute top-1/2 transform -translate-y-1/2 right-3" />
                <div onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <FaEye className="absolute top-1/2 transform -translate-y-1/2 right-3" />
                  ) : (
                    <FaEyeSlash className="absolute top-1/2 transform -translate-y-1/2 right-3" />
                    <FaEyeSlash className="absolute top-1/2 transform -translate-y-1/2 right-3" />
                  )}
                </div>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-300">
                <p className="mt-1 text-sm text-red-300">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-white text-teal-800 hover:bg-white/90"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}

            <Button
              type="submit"
              className="h-12 w-full bg-white text-teal-800 hover:bg-white/90"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/80">
              Don't have an account yet?{" "}
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
        <div className="hidden w-1/2 bg-teal-700 p-12 md:block">
          <div className="mb-8 text-3xl font-bold text-white">
            Your personalized AI Learning Assistant!
          </div>

          <div className="rounded-lg bg-teal-600/50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
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
              <div className="ml-2 h-6 w-6 rounded-full bg-white"></div>
            </div>

            <div className="text-center">
              <p className="mb-4 text-white">
                What would you like to learn today?
              </p>
              <div className="relative mx-auto w-full max-w-xs rounded bg-teal-500/50 px-4 py-2">
                <p className="text-white/70">Enter a topic</p>
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 space-x-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <span className="text-xs text-white">+</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <span className="text-xs text-white">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

          <div className="mt-6 text-center">
            <p className="text-white/80">
              Don't have an account yet?{" "}
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
        <div className="hidden w-1/2 bg-teal-700 p-12 md:block">
          <div className="mb-8 text-3xl font-bold text-white">
            Your personalized AI Learning Assistant!
          </div>

          <div className="rounded-lg bg-teal-600/50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
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
              <div className="ml-2 h-6 w-6 rounded-full bg-white"></div>
            </div>

            <div className="text-center">
              <p className="mb-4 text-white">
                What would you like to learn today?
              </p>
              <div className="relative mx-auto w-full max-w-xs rounded bg-teal-500/50 px-4 py-2">
                <p className="text-white/70">Enter a topic</p>
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 space-x-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <span className="text-xs text-white">+</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
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
