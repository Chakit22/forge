"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [topic, setTopic] = useState("");
  const router = useRouter();

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.replace("/login");
      }
    };
    
    checkAuth();
  }, [router]);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTopic = () => {
    if (topic.trim()) {
      // This would be implemented to handle adding a new topic
      console.log("Adding topic:", topic);
      setTopic("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddTopic();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-500 to-teal-900">
      {/* Header */}
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <button className="text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <h1 className="text-white text-xl font-bold">FORGE</h1>
          </div>
        </div>
        <div className="text-white text-xl font-bold">{currentTime}</div>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
          <img 
            src="https://i.pravatar.cc/150?img=25" 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center mt-20">
        <h2 className="text-white text-3xl font-normal mb-8">What would you like to learn today?</h2>
        
        <div className="relative w-full max-w-md mx-4">
          <Input 
            type="text"
            placeholder="Enter a topic"
            className="bg-teal-300/30 text-white h-14 px-6 rounded-md border-none placeholder:text-white/70 text-lg shadow-md focus:outline-none focus:ring-0 focus:border-0"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
            <button 
              onClick={handleAddTopic}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 text-white"
              aria-label="Add topic"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button 
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 text-white"
              aria-label="Show history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 