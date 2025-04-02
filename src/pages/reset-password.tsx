"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type ResetPasswordFormType = {
  password: string;
  confirmPassword: string;
};

export default function ResetPassword() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormType>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Get token from URL when router is ready
    if (router.isReady && router.query.token) {
      setToken(router.query.token as string);
    }
  }, [router.isReady, router.query]);

  const onSubmit = async (data: ResetPasswordFormType) => {
    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await axios.post("/api/auth/reset-password", {
        token,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (err) {
      console.error("Error during resetting password!", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!router.isReady) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Your password has been successfully reset.
                </AlertDescription>
              </Alert>
              <Button onClick={() => router.push("/signin")} className="w-full">
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!token && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Invalid or missing reset token. Please request a new
                    password reset link.
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="space-y-2 relative">
                  <Input
                    id="password"
                    type={isPasswordVisible ? "text" : "password"}
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                      pattern: {
                        value:
                          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
                        message:
                          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
                      },
                    })}
                  />
                  <div onClick={() => setIsPasswordVisible(!isPasswordVisible)}>
                    {isPasswordVisible ? (
                      <FaEye className="absolute top-1/2 transform -translate-y-1/2 right-3 cursor-pointer" />
                    ) : (
                      <FaEyeSlash className="absolute top-1/2 transform -translate-y-1/2 right-3 cursor-pointer" />
                    )}
                  </div>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={isPasswordVisible ? "text" : "password"}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value, formValues) => {
                      if (value !== formValues.password) {
                        return "Passwords do not match!";
                      }
                    },
                  })}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !token}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
        {!isSuccess && (
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                href="/signin"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
