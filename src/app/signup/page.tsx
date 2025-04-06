"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signup } from "@/app/api/actions";
import { signupformType } from "@/types/signupformType";
// import Image from "next/image";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useUser } from "@/context/user-context";

export default function SignUp() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
  } = useForm<signupformType>();

  const onSubmit = async (data: signupformType) => {
    setIsLoading(true);

    try {
      console.log("Starting signup process for:", data.email);
      const response = await signup(data);
      console.log("Signup response:", response);

      if (response.success) {
        toast.success("Account created successfully!");
        // Redirect to dashboard after successful signup
        console.log("Redirecting to confirmation page");
        router.replace(`/signup/confirmation?email=${data.email}`);
      } else {
        console.error("Signup failed:", response.error);
        toast.error(
          response.error || "Error during sign up. Please try again later!"
        );
      }
    } catch (err) {
      console.error("Error signing up: ", err);
      toast.error("Error during sign up. Please try again later!");
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
            <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                <path d="M12 8v4l3 3 1-1-2.5-2.5V8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">FORGE</span>
          </div>

          <div className="mb-12">
            <h1 className="mb-2 text-3xl font-bold text-white">
              Let&apos;s get started
            </h1>
            <p className="text-white/80">
              Create an account and start remembering now!
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="name" className="mb-2 block text-white">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-white/50 focus:border-slate-600 focus:ring-slate-600"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-300">
                  {errors.name.message}
                </p>
              )}
            </div>

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
              <Label htmlFor="phone_number" className="mb-2 block text-white">
                Phone Number (Optional)
              </Label>
              <Input
                id="phone_number"
                type="tel"
                className="h-12 bg-slate-900 border-slate-700 text-white placeholder:text-white/50 focus:border-slate-600 focus:ring-slate-600"
                placeholder="+1 (123) 456-7890"
                {...register("phone_number", {
                  pattern: {
                    value:
                      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/,
                    message: "Invalid phone number format",
                  },
                })}
              />
              {errors.phone_number && (
                <p className="mt-1 text-sm text-red-300">
                  {errors.phone_number.message}
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
                <div onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-white/70">
                  {showPassword ? (
                    <FaEye className="text-white/70" />
                  ) : (
                    <FaEyeSlash className="text-white/70" />
                  )}
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
              {isLoading ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/80">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-white hover:underline"
              >
                Login
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
