"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const pathname = usePathname();
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
      console.log("Route changed in dashboard layout");

      // Clear conversation event dispatch tracking
      if (typeof window !== "undefined") {
        if (window.__conversationEventsDispatched) {
          window.__conversationEventsDispatched = new Set();
        }
      }

      // Trigger sidebar refresh when returning to dashboard
      if (pathname === "/dashboard") {
        console.log("Returned to dashboard, triggering conversation update");
        const updateEvent = new CustomEvent("conversation-updated");
        window.dispatchEvent(updateEvent);
      }
    };

    // Listen for route changes in the dashboard
    window.addEventListener("popstate", handleRouteChange);

    // Also trigger sidebar refresh when dashboard is mounted
    if (pathname === "/dashboard") {
      console.log("Dashboard mounted, triggering initial conversation update");
      setTimeout(() => {
        const updateEvent = new CustomEvent("conversation-updated");
        window.dispatchEvent(updateEvent);
      }, 100); // Short delay to ensure components are mounted
    }

    return () => {
      window.removeEventListener("popstate", handleRouteChange);

      // Also clear on unmount
      if (typeof window !== "undefined") {
        if (window.__conversationEventsDispatched) {
          window.__conversationEventsDispatched = new Set();
        }
      }
    };
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-purple-300 border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-300 border-l-transparent animate-spin-slow"></div>
          </div>
          <p className="text-xl font-medium text-white">
            Loading your dashboard...
          </p>
          <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated - let the redirect handle it
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <Header toggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && <Sidebar className="flex-shrink-0" />}

        <main className="flex-1 overflow-auto bg-black p-4">{children}</main>
      </div>
    </div>
  );
}
