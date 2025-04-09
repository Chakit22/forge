"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const handleStart = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.replace("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <h1 className="text-7xl font-bold text-white mb-2">FORGE</h1>
      <p className="text-xl text-white mb-10">and never forget ever again</p>
      <Button
        className="bg-white hover:bg-white/80 text-black px-8 py-3 rounded-md font-bold text-xl"
        onClick={handleStart}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Start"}
      </Button>
    </div>
  );
}
