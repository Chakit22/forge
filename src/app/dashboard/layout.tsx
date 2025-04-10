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
        <p className="text-white text-lg">Loading...</p>
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
