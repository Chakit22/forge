"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function ConfirmEmail() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      // Wait for router to be ready and have query params
      if (!router.isReady) return;

      const { token, type } = router.query;

      if (!token || type !== "signup") {
        setError("Invalid or missing confirmation link");
        setIsVerifying(false);
        return;
      }

      try {
        await axios.post("/api/auth/confirm", { token });
        setIsSuccess(true);
      } catch (err) {
        console.error("Error during confirming email", err);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [router.isReady, router.query]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
          <CardDescription className="text-center">
            {isVerifying
              ? "Verifying your email address..."
              : isSuccess
              ? "Your email has been verified"
              : "There was a problem verifying your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVerifying ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isSuccess ? (
            <Alert>
              <AlertDescription>
                Your email has been successfully verified. You can now sign in
                to your account.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {!isVerifying && (
            <Button onClick={() => router.push("/signin")} className="w-full">
              {isSuccess ? "Sign in" : "Back to Sign in"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
