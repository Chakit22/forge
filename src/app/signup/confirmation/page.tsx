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

export default function SignUpConfirmation() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Check your email
          </CardTitle>
          <CardDescription className="text-center">
            We've sent you a confirmation link to verify your account
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
            Didn't receive the email? Check your spam folder or try signing up
            again.
          </p>
          <div className="flex gap-4 w-full">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/signup">Try again</Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
