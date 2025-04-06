"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FaEnvelope } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/context/user-context";
import { useEffect, Suspense } from "react";
import { resendConfirmationEmail } from "@/app/api/actions";
import { toast } from "sonner";

function ConfirmationContent() {
  const router = useRouter();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("No email provided");
      return;
    }

    const response = await resendConfirmationEmail(email);
    if (response.success) {
      toast.success("Email sent successfully");
    } else {
      toast.error("Failed to send email. Please try again later.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-slate-900 text-white border-slate-700">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-center text-white/70">
            You need to verify your email before you can login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="flex items-center gap-2 bg-slate-800 border-slate-700 text-white">
            <FaEnvelope className="h-4 w-4" />
            <AlertDescription>
              Please check your email inbox and click the confirmation link to
              verify your account. <strong>You cannot login until you verify your email.</strong>
            </AlertDescription>
          </Alert>
          
          <div className="rounded-md bg-slate-800 p-4 border border-slate-700">
            <h3 className="font-medium text-white mb-2">What to do next:</h3>
            <ol className="list-decimal pl-5 space-y-1 text-white/80">
              <li>Check your email inbox (including spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>After verification, return to the login page</li>
              <li>Sign in with your email and password</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-white/70 text-center">
            Did not receive the email? Check your spam folder or try requesting another email.
          </p>
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1 text-white border-slate-700 hover:bg-slate-800 hover:text-white"
              onClick={handleResendEmail}
            >
              Resend Verification Email
            </Button>
          </div>
          <div className="flex gap-4 w-full">
            <Link href="/login" className="w-full">
              <Button
                variant="default"
                className="w-full bg-slate-800 text-white hover:bg-slate-700"
              >
                Return to Login
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignUpConfirmation() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <p className="text-white">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
