"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        setIsAuthenticated(!!data.user);
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleStart = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.replace("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-teal-500 to-teal-900">
      <h1 className="text-7xl font-bold text-white mb-2">FORGE</h1>
      <p className="text-xl text-white mb-10">and never forget ever again</p>
      <Button
        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-md"
        onClick={handleStart}
        disabled={loading}
      >
        Start
      </Button>
    </div>
  );
}
