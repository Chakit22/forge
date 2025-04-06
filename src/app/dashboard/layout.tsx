"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useUser } from "@/context/user-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const { user, isLoading } = useUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // Add a cleanup function to reset conversation event trackers
  useEffect(() => {
    // Any time dashboard layout is mounted, add route change handler
    const handleRouteChange = () => {
      console.log("Route changed, clearing conversation event trackers");

      // Clear conversation event dispatch tracking
      if (typeof window !== "undefined") {
        if (window.__conversationEventsDispatched) {
          window.__conversationEventsDispatched = new Set();
          console.log("Cleared conversation event dispatch tracking");
        }
      }
    };

    // Listen for route changes in the dashboard
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);

      // Also clear on unmount
      if (typeof window !== "undefined") {
        if (window.__conversationEventsDispatched) {
          window.__conversationEventsDispatched = new Set();
          console.log(
            "Cleared conversation event dispatch tracking on dashboard unmount"
          );
        }
      }
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-teal-800">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="flex h-screen flex-col">
      <Header toggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && <Sidebar className="flex-shrink-0" />}

        <main className="flex-1 overflow-auto bg-teal-700 p-4">{children}</main>
      </div>
    </div>
  );
}
