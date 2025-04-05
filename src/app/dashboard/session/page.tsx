"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Session() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const method = searchParams.get("method");
  const durationSeconds = parseInt(searchParams.get("duration") || "0");

  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (durationSeconds <= 0) {
      router.replace("/dashboard");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [durationSeconds, router]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would typically send the message to an API
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  const methodTitle =
    {
      memorizing: "Memorizing",
      understanding: "Understanding",
      testing: "Testing",
    }[method || ""] || "Learning";

  return (
    <div className="min-h-screen bg-teal-800 flex flex-col">
      <header className="flex items-center justify-between p-6 bg-teal-800">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="text-white p-0 mr-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Button>
          <BrainIcon className="h-6 w-6 text-white mr-2" />
          <span className="text-xl font-bold text-white">FORGE</span>
        </div>
        <div className="text-xl font-medium text-white">
          {formatTime(timeLeft)}
        </div>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
          <img
            src="https://i.pravatar.cc/150?img=25"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8">
        <div className="flex-1 mb-4 overflow-auto bg-teal-700/50 rounded-lg p-4">
          <div className="flex flex-col gap-4">
            <div className="self-center bg-teal-600/70 text-white rounded-lg p-3 max-w-md">
              Welcome to your {methodTitle} session! Ask me anything related to
              your topic.
            </div>
            {/* Message bubbles would be rendered here */}
          </div>
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            className="bg-teal-600/50 border-0 text-white resize-none h-16 placeholder:text-white/70"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            className="bg-teal-600 hover:bg-teal-500 text-white h-16 px-4"
            disabled={!message.trim()}
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
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

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}
