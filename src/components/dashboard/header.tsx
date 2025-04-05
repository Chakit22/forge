"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { LogOutIcon } from "lucide-react";
import { signout } from "@/app/api/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CiLocationOn, CiLogout } from "react-icons/ci";

interface HeaderProps {
  toggleSidebar?: () => void;
  className?: string;
}

export function Header({ toggleSidebar, className }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const { user } = useUser();
  const router = useRouter();
  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignout = async () => {
    try {
      await signout();
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out. Please try again.");
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-teal-800">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={toggleSidebar}
          size="icon"
          className="text-white hover:bg-teal-700/50"
        >
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <div className="flex items-center gap-2">
          <BrainIcon className="h-6 w-6 text-white" />
          <h1 className="text-xl font-bold text-white">FORGE</h1>
        </div>
      </div>
      <div className="text-xl font-medium text-white">{currentTime}</div>
      <div className="flex items-center gap-2">
        {/* Sign out button */}
        <Button className="hidden md:block" onClick={handleSignout}>
          Sign Out
        </Button>
        <CiLogout
          size={30}
          className="cursor-pointer md:hidden"
          onClick={handleSignout}
        />
      </div>
    </header>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function BrainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
      <path d="M12 8v4l3 3 1-1-2.5-2.5V8z" />
    </svg>
  );
}
