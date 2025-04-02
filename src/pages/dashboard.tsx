"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import LogoutButton from "../components/logout";

export default function Dashboard() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for active session
    const checkSession = async () => {
      try {
        setLoading(true);

        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error checking session:", error.message);
          router.replace("/signin");
          return;
        }

        if (!session) {
          console.log("No active session found");
          router.replace("/signin");
          return;
        }

        // Session exists, get user data
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Error fetching user:", userError?.message);
          router.replace("/signin");
          return;
        }

        setUser({ email: user.email || "" });
      } catch (err) {
        console.error("Unexpected error:", err);
        router.replace("/signin");
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.replace("/signin");
      } else if (session) {
        setUser({ email: session.user.email || "" });
      }
    });

    checkSession();

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return user ? (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold">Welcome, {user.email}!</h1>
        <LogoutButton />
      </div>
    </div>
  ) : null;
}
