"use client";

import { Button } from "@/components/ui/button";
import { signout } from "./login/actions";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signout();
      // toast.success("Logged out successfully");
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      // toast.error("Error logging out");
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p>Your main content goes here</p>
        </div>
      </div>
    </div>
  );
}
