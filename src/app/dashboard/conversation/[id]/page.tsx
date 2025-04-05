"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getConversationById, deleteConversation } from "@/app/api/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Conversation } from "@/app/api/actions";

// Local interface for messages
interface Message {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  timestamp: string;
}

// Interface for UI messages (including local ones not yet saved)
interface UIMessage {
  id?: number;
  role: string;
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEndSessionDialogOpen, setIsEndSessionDialogOpen] = useState(false);
  const [isFullFocus, setIsFullFocus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation data when the component mounts
  useEffect(() => {
    if (unwrappedParams.id) {
      fetchConversation(parseInt(unwrappedParams.id));
    }
  }, [unwrappedParams.id]);

  // Set up the timer when duration is available
  useEffect(() => {
    if (!conversation?.duration) return;

    console.log("Raw duration from database:", conversation.duration);
    console.log("Duration type:", typeof conversation.duration);

    // Parse ISO duration (PT1H30M format) to seconds
    const durationSeconds = parseDurationToSeconds(conversation.duration);
    console.log("Parsed duration in seconds:", durationSeconds);

    setTimeLeft(durationSeconds);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [conversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversation = async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getConversationById(id);

      if (response.success && response.conversation) {
        setConversation(response.conversation);

        // Always start with a welcome message
        setMessages([
          {
            role: "assistant",
            content: `Welcome to your ${getLearningOptionDisplay(
              response.conversation.learning_option
            )} session! Let's learn about "${getTopicFromSummary(
              response.conversation.summary
            )}"`,
            timestamp: new Date(),
            status: "sent",
          },
        ]);
      } else {
        setError(response.error || "Failed to fetch conversation");
        setConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching conversation:", err);
      setError("An unexpected error occurred");
      setConversation(null);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !conversation) return;

    // Add message to UI immediately
    const newMessage: UIMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    const sentMessage = inputMessage; // Store message before clearing input
    setInputMessage("");

    // Simulate AI response (in a real app, you would call an AI API)
    setTimeout(() => {
      const aiContent = `I'm your AI learning assistant for ${getLearningOptionDisplay(
        conversation.learning_option || ""
      )}. Here's a response to your question about "${sentMessage}".`;

      // Add AI response to UI
      const aiResponse: UIMessage = {
        role: "assistant",
        content: aiContent,
        timestamp: new Date(),
        status: "sent",
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1500);
  };

  const handleSessionEnd = () => {
    // In a real app, you would save the session data to your API
    toast.success("Session completed!");
    router.push("/dashboard");
  };

  const handleDeleteSession = async () => {
    if (!conversation) return;

    try {
      const response = await deleteConversation(conversation.id);
      if (response.success) {
        toast.success("Session deleted successfully");
        router.push("/dashboard");
      } else {
        toast.error(response.error || "Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("An unexpected error occurred");
    }
  };

  // Parse duration string to seconds - handles both ISO format and PostgreSQL interval
  const parseDurationToSeconds = (durationStr: string): number => {
    try {
      console.log("Parsing duration:", durationStr);

      // Check if it's an ISO format (PT1H30M)
      if (durationStr.startsWith("PT")) {
        const hourMatch = durationStr.match(/(\d+)H/);
        const minuteMatch = durationStr.match(/(\d+)M/);
        const secondMatch = durationStr.match(/(\d+)S/);

        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;

        console.log("ISO format parsed:", { hours, minutes, seconds });
        return hours * 3600 + minutes * 60 + seconds;
      }

      // Try handling PostgreSQL interval format (could be "1 hour 30 minutes" or "01:30:00")
      // Check for HH:MM:SS format
      const timeFormatMatch = durationStr.match(/(\d+):(\d+):(\d+)/);
      if (timeFormatMatch) {
        const hours = parseInt(timeFormatMatch[1]);
        const minutes = parseInt(timeFormatMatch[2]);
        const seconds = parseInt(timeFormatMatch[3]);

        console.log("Time format parsed:", { hours, minutes, seconds });
        return hours * 3600 + minutes * 60 + seconds;
      }

      // Check for text format like "1 hour 30 minutes"
      let totalSeconds = 0;

      // Extract hours
      const hoursMatch = durationStr.match(/(\d+)\s*hour/i);
      if (hoursMatch) {
        totalSeconds += parseInt(hoursMatch[1]) * 3600;
      }

      // Extract minutes
      const minutesMatch = durationStr.match(/(\d+)\s*min/i);
      if (minutesMatch) {
        totalSeconds += parseInt(minutesMatch[1]) * 60;
      }

      // Extract seconds
      const secondsMatch = durationStr.match(/(\d+)\s*sec/i);
      if (secondsMatch) {
        totalSeconds += parseInt(secondsMatch[1]);
      }

      // If we found any time units
      if (totalSeconds > 0) {
        console.log("Text format parsed, total seconds:", totalSeconds);
        return totalSeconds;
      }

      // Last resort: try to parse as just a number of minutes
      const justMinutes = parseInt(durationStr);
      if (!isNaN(justMinutes)) {
        console.log("Parsed as just minutes:", justMinutes);
        return justMinutes * 60;
      }

      console.error("Could not parse duration:", durationStr);
      return 1800; // Default to 30 minutes (1800 seconds) if parsing fails
    } catch (e) {
      console.error("Error parsing duration:", e);
      return 1800; // Default to 30 minutes
    }
  };

  // Format seconds to HH:MM:SS display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  // Format duration string to a human readable format
  const formatDuration = (durationStr: string) => {
    try {
      // If it's already in a readable format like "1 hour 30 minutes", return it directly
      if (/\d+\s*hour|\d+\s*min/i.test(durationStr)) {
        return durationStr;
      }

      // For ISO format or PostgreSQL interval, convert to seconds first then format
      const seconds = parseDurationToSeconds(durationStr);

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0 && minutes > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${
          minutes > 1 ? "s" : ""
        }`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""}`;
      } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? "s" : ""}`;
      } else {
        return "Less than a minute";
      }
    } catch (e) {
      console.error("Error formatting duration:", e);
      return durationStr || "Unknown duration";
    }
  };

  const getLearningOptionDisplay = (option: string) => {
    const options: Record<string, string> = {
      memorizing: "Memorization",
      understanding: "Understanding",
      testing: "Testing Knowledge",
      reinforcement: "Reinforcement",
    };

    return options[option] || option.charAt(0).toUpperCase() + option.slice(1);
  };

  // Extract topic from summary
  const getTopicFromSummary = (summary?: string) => {
    if (!summary) return "Untitled Session";
    return summary.replace(/^Learning session about:\s*/i, "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white text-lg">Loading conversation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-4 bg-red-900/20 rounded-md">
        <p className="text-red-300 mb-4">{error}</p>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="text-white bg-transparent border-white/30 hover:bg-white/10"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div
      className={`min-h-screen bg-teal-800 flex flex-col ${
        isFullFocus ? "h-screen overflow-hidden" : ""
      }`}
    >
      {/* Header with timer */}
      <header className="flex items-center justify-between p-4 bg-teal-800 border-b border-teal-700">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="text-white p-0 mr-2"
            onClick={() =>
              isFullFocus ? setIsFullFocus(false) : router.push("/dashboard")
            }
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Button>
          <div className="ml-2">
            <h1 className="text-lg font-semibold text-white">
              {getTopicFromSummary(conversation.summary)}
            </h1>
            <p className="text-sm text-white/70">
              {getLearningOptionDisplay(conversation.learning_option)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xl font-medium text-white bg-teal-700/50 px-3 py-1 rounded-md">
            {formatTime(timeLeft)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-600/20"
            onClick={() => setIsEndSessionDialogOpen(true)}
          >
            End Session
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-teal-600/20"
            onClick={() => setIsFullFocus(!isFullFocus)}
          >
            {isFullFocus ? "Exit Focus" : "Focus Mode"}
          </Button>
        </div>
      </header>

      {/* Session summary - hidden in focus mode */}
      {!isFullFocus && (
        <div className="bg-teal-700/30 p-3 text-center">
          <p className="text-white/90">
            <span className="font-medium">Summary:</span> {conversation.summary}
          </p>
        </div>
      )}

      {/* Main chat area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
        <div className="flex-1 mb-4 overflow-auto bg-teal-700/50 rounded-lg p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500/20 ml-auto max-w-[80%]"
                    : "bg-teal-600/30 mr-auto max-w-[80%]"
                }`}
              >
                <p className="text-white">{message.content}</p>
                <p className="text-white/50 text-xs mt-1">
                  {message.timestamp.toLocaleTimeString()}
                  {message.status === "sending" && " • Sending..."}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            className="bg-teal-600/50 border-0 text-white resize-none h-16 placeholder:text-white/70"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
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
            disabled={!inputMessage.trim()}
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </div>
      </main>

      {/* End Session Dialog */}
      <Dialog
        open={isEndSessionDialogOpen}
        onOpenChange={setIsEndSessionDialogOpen}
      >
        <DialogContent className="bg-teal-700 text-white border-teal-600">
          <DialogHeader>
            <DialogTitle>End Learning Session?</DialogTitle>
            <DialogDescription className="text-white/70">
              Are you sure you want to end this learning session? You can always
              return to it later.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsEndSessionDialogOpen(false)}
              className="text-white hover:bg-teal-600/50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSession}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Session
            </Button>
            <Button
              variant="default"
              onClick={handleSessionEnd}
              className="bg-teal-600 hover:bg-teal-500"
            >
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
