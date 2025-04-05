"use client";

// import Link from "next/link";
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
    <div className="flex min-h-screen items-center justify-center bg-teal-800 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Check your email
          </CardTitle>
          <CardDescription className="text-center">
            We have sent you a confirmation link to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="flex items-center gap-2">
            <FaEnvelope className="h-4 w-4" />
            <AlertDescription>
              Please check your email inbox and click the confirmation link to
              verify your account. After verification, you can sign in to your
              account.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Did not receive the email? Check your spam folder or try signing up
            again.
          </p>
          <div className="flex gap-4 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleResendEmail}
            >
              Try again
            </Button>
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
        <div className="flex min-h-screen items-center justify-center bg-teal-800">
          <p className="text-white">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
