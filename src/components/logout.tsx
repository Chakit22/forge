"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signout } from "@/app/login/actions";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await signout();
      router.replace("/login");
    } catch (err) {
      console.error("Unexpected error during logout:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoading} className="w-full">
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
