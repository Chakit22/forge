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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/app/api/memoagent";
import QuizModal from "@/components/QuizModal";
import { Quiz } from "@/app/api/quiz-generator/route";

// Define types for ReactMarkdown components
type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean;
};

// Define file attachment type
type FileAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // base64 encoded content
};

// // Local interface for messages
// interface APIMessage {
//   id: number;
//   conversation_id: number;
//   role: string;
//   content: string;
//   timestamp: string;
// }

// Interface for UI messages (including local ones not yet saved)
interface UIMessage {
  id?: number | string;
  role: string;
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  _doNotSave?: boolean; // Add flag to indicate messages that should not be saved
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
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  // Add state for quiz feedback and analysis
  const [quizFeedback, setQuizFeedback] = useState<string>("");
  const [quizStrengths, setQuizStrengths] = useState<string[]>([]);
  const [quizWeaknesses, setQuizWeaknesses] = useState<string[]>([]);
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Add ref to track if we've initialized messages
  const hasInitializedRef = useRef(false);
  // Add ref to track if we've loaded messages from storage
  const hasLoadedFromStorageRef = useRef(false);

  // Maximum file size in bytes (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const handleSessionEnd = React.useCallback(() => {
    // In a real app, you would save the session data to your API
    toast.success("Session completed!");
    router.push("/dashboard");
  }, [router]);

  const fetchConversation = React.useCallback(async (id: number) => {
    // Skip if we've already initialized messages from storage
    if (hasLoadedFromStorageRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getConversationById(id);

      if (response.success && response.conversation) {
        setConversation(response.conversation);

        // Only set initial welcome message if we haven't already loaded from storage
        // and no welcome message exists in the database (indicated by empty messages)
        if (!hasInitializedRef.current) {
          console.log("Setting initial welcome message (UI only, not saved)");
          hasInitializedRef.current = true;

          // Create a UI-only welcome message that will never be saved to the database
          const welcomeMessage: UIMessage = {
            role: "assistant",
            content: `Welcome to your ${getLearningOptionDisplay(
              response.conversation.learning_option
            )} session! Let's learn about "${getTopicFromSummary(
              response.conversation.summary
            )}"`,
            timestamp: new Date(),
            status: "sent",
            // Add a flag to indicate this message should never be saved
            _doNotSave: true,
          };

          setMessages([welcomeMessage]);
        }
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
  }, []);

  // Fetch conversation data when the component mounts - with protection against multiple calls
  useEffect(() => {
    console.log(
      `Page mounting for conversation ${unwrappedParams.id}, hasLoadedFromStorage: ${hasLoadedFromStorageRef.current}, hasInitialized: ${hasInitializedRef.current}`
    );

    if (!unwrappedParams.id || hasLoadedFromStorageRef.current) {
      console.log("Skipping fetch conversation, already loaded from storage");
      return;
    }

    fetchConversation(parseInt(unwrappedParams.id));

    // Cleanup function to reset refs when component unmounts
    return () => {
      console.log(`Page unmounting for conversation ${unwrappedParams.id}`);
      hasInitializedRef.current = false;
      hasLoadedFromStorageRef.current = false;
    };
  }, [unwrappedParams.id, fetchConversation]);

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
  }, [conversation, handleSessionEnd]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add an effect to listen for saved messages from the wrapper component
  useEffect(() => {
    console.log("Setting up load-messages event listener");

    const handleLoadMessages = (event: CustomEvent<UIMessage[]>) => {
      if (
        !event.detail ||
        !Array.isArray(event.detail) ||
        event.detail.length === 0
      ) {
        console.log(
          "Received empty messages array from load-messages event, ignoring"
        );
        return;
      }

      console.log(
        `Received load-messages event with ${event.detail.length} messages, current hasLoadedFromStorage: ${hasLoadedFromStorageRef.current}`
      );

      // Only process the event if we haven't already loaded messages
      if (!hasLoadedFromStorageRef.current) {
        // Mark that we've loaded messages from storage to prevent duplicate initialization
        hasLoadedFromStorageRef.current = true;
        hasInitializedRef.current = true;

        console.log(
          `Loading ${event.detail.length} messages from storage event, flags updated`
        );
        setMessages(event.detail);
      } else {
        console.log(
          "Ignoring load-messages event as we already loaded messages"
        );
      }
    };

    // Add event listener
    window.addEventListener(
      "load-messages",
      handleLoadMessages as EventListener
    );

    // Cleanup function
    return () => {
      console.log("Removing load-messages event listener");
      window.removeEventListener(
        "load-messages",
        handleLoadMessages as EventListener
      );
    };
  }, []);

  // Add an event to trigger saving messages after receiving a response
  const saveMessages = (messagesToSave: UIMessage[]) => {
    console.log(
      `Filtering messages before saving (total: ${messagesToSave.length})`
    );

    if (!unwrappedParams.id) {
      console.error("No conversation ID available for saving messages");
      return;
    }

    // Filter out any messages that have the _doNotSave flag
    const messagesToActuallySave = messagesToSave.filter(
      (msg) => !msg._doNotSave
    );

    console.log(
      `After filtering, saving ${
        messagesToActuallySave.length
      } messages (excluded ${
        messagesToSave.length - messagesToActuallySave.length
      } UI-only messages)`
    );

    // Make sure we're not saving empty messages
    if (!messagesToActuallySave || messagesToActuallySave.length === 0) {
      console.warn("No messages to save after filtering");
      return;
    }

    // Dispatch event to save messages to Weaviate
    const saveEvent = new CustomEvent("save-messages", {
      detail: messagesToActuallySave,
    });
    window.dispatchEvent(saveEvent);

    // Also save to localStorage as backup
    try {
      localStorage.setItem(
        `conversation_${unwrappedParams.id}_messages`,
        JSON.stringify(messagesToActuallySave)
      );
      console.log("Messages also saved to localStorage as backup");
    } catch (e) {
      console.error("Error saving messages to localStorage:", e);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;
    if (!conversation) return;

    // Add user message
    const userMessage: UIMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
      status: "sending",
    };

    // Create a more detailed message for the UI if there are attachments
    const displayContent =
      attachments.length > 0
        ? `${userMessage.content} [Attached ${
            attachments.length
          } file(s): ${attachments.map((a) => a.name).join(", ")}]`
        : userMessage.content;

    const userDisplayMessage = {
      ...userMessage,
      content: displayContent,
    };

    // Add message to UI
    setMessages((prev) => [...prev, userDisplayMessage]);

    setInputMessage("");
    setIsTyping(true);

    try {
      // Prepare attachment data for API
      const attachmentData = attachments.map((a) => ({
        name: a.name,
        type: a.type,
        content: a.content,
      }));

      console.log(`Sending message with ${attachmentData.length} attachments`);
      if (attachmentData.length > 0) {
        console.log(
          "Attachment details:",
          attachmentData.map((a) => ({
            name: a.name,
            type: a.type,
            contentLength: a.content.length,
          }))
        );
      }

      // Convert UIMessages to API Messages format
      const apiMessages: Message[] = messages.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      // Add the new user message to the API messages
      apiMessages.push({
        role: "user",
        content: userMessage.content,
      });

      // Determine which API endpoint to use
      const apiEndpoint = "/api/chat";
      console.log(`Sending request to API endpoint: ${apiEndpoint}`);

      // Send to selected API route with appropriate payload
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          method: conversation.learning_option,
          attachments: attachmentData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(
          `Failed to get response from API: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("API response received:", data);

      // Update UI message status to sent
      setMessages((prev) =>
        prev.map((msg) =>
          msg === userDisplayMessage ? { ...msg, status: "sent" } : msg
        )
      );

      // Add assistant response
      const assistantMessage: UIMessage = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        status: "sent" as "sending" | "sent" | "error",
      };

      // Update messages state with both user and assistant messages
      setMessages((prev) => {
        // First ensure the user message is marked as sent
        const updatedPrev = prev.map((msg) =>
          msg === userDisplayMessage
            ? { ...msg, status: "sent" as "sending" | "sent" | "error" }
            : msg
        );

        // Then add the assistant message
        const newMessages = [...updatedPrev, assistantMessage];

        // Save all messages - Using a short timeout to ensure state updates have completed
        // This helps prevent duplicate saves when state updates happen rapidly
        setTimeout(() => {
          console.log(
            `Saving ${newMessages.length} messages after receiving assistant response`
          );
          saveMessages(newMessages);
        }, 100);

        return newMessages;
      });

      // Clear attachments after sending
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Add user-facing error message
      toast.error("Failed to get response from AI");

      // Update message status to show error
      setMessages((prev) =>
        prev.map((msg) =>
          msg === userDisplayMessage ? { ...msg, status: "error" } : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
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
    const secs = Math.floor(seconds % 60);

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  // Helper function to safely format a timestamp
  const safeFormatTime = (timestamp: Date | string | unknown): string => {
    if (!timestamp) return "";

    try {
      // If it's already a Date object
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleTimeString();
      }

      // If it's a string, try to convert it
      if (typeof timestamp === "string") {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? "" : date.toLocaleTimeString();
      }

      return "";
    } catch (error) {
      console.warn("Error formatting timestamp:", error);
      return "";
    }
  };

  // // Format duration string to a human readable format
  // const formatDuration = (durationStr: string) => {
  //   try {
  //     // If it's already in a readable format like "1 hour 30 minutes", return it directly
  //     if (/\d+\s*hour|\d+\s*min/i.test(durationStr)) {
  //       return durationStr;
  //     }

  //     // For ISO format or PostgreSQL interval, convert to seconds first then format
  //     const seconds = parseDurationToSeconds(durationStr);

  //     const hours = Math.floor(seconds / 3600);
  //     const minutes = Math.floor((seconds % 3600) / 60);

  //     if (hours > 0 && minutes > 0) {
  //       return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${
  //         minutes > 1 ? "s" : ""
  //       }`;
  //     } else if (hours > 0) {
  //       return `${hours} hour${hours > 1 ? "s" : ""}`;
  //     } else if (minutes > 0) {
  //       return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  //     } else {
  //       return "Less than a minute";
  //     }
  //   } catch (e) {
  //     console.error("Error formatting duration:", e);
  //     return durationStr || "Unknown duration";
  //   }
  // };

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

  // Handle file attachment selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log(`Processing ${files.length} selected files`);

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        console.error(`File ${file.name} exceeds maximum size limit of 10MB`);
        toast.error(`File ${file.name} exceeds maximum size limit of 10MB`);
        return;
      }

      console.log(
        `Reading file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`
      );
      const reader = new FileReader();

      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const content = event.target.result as string;
          console.log(
            `File ${file.name} loaded, content length: ${content.length}`
          );
          const base64Content = content.split(",")[1]; // Remove the data URL prefix
          console.log(`Base64 content length: ${base64Content.length}`);

          const newAttachment: FileAttachment = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content,
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };

      reader.onerror = (error) => {
        console.error(`Error reading file ${file.name}:`, error);
        toast.error(`Failed to read file ${file.name}. Please try again.`);
      };

      reader.readAsDataURL(file);
    });

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle removing an attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  // Handle generating quiz questions
  const handleGenerateQuiz = async () => {
    if (messages.length < 2) {
      toast.info("Chat more to generate a quiz");
      return;
    }

    setIsGeneratingQuiz(true);
    setIsQuizModalOpen(true);
    setQuiz(null);

    try {
      if (!conversation) return;

      // Convert UIMessages to API Messages format
      const apiMessages: Message[] = messages.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

      const response = await fetch("/api/quiz-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          learning_option: conversation.learning_option,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to generate quiz: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setQuiz(data.quiz);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
      setIsQuizModalOpen(false);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handler to receive quiz results from QuizModal
  const handleQuizResults = (
    feedback: string,
    strengths: string[],
    weaknesses: string[]
  ) => {
    setQuizFeedback(feedback);
    setQuizStrengths(strengths);
    setQuizWeaknesses(weaknesses);
    setShowQuizResults(true);

    // Optionally display a toast to notify the user
    if (feedback) {
      toast.success("Quiz results saved to conversation");
    }
  };

  // Make sure we save messages when component unmounts
  useEffect(() => {
    return () => {
      // Don't save messages on unmount - this is causing excessive message saving
      // Only uncomment this if we determine it's necessary for some reason

      /*
      if (messages.length > 0 && unwrappedParams.id) {
        console.log('Saving messages on component unmount');
        saveMessages(messages);
        
        // Reset all the flags when unmounting
        console.log('Cleaning up refs and flags on unmount');
        hasInitializedRef.current = false;
        hasLoadedFromStorageRef.current = false;
      }
      */

      // Just clean up the flags
      console.log("Cleaning up refs and flags on unmount");
      hasInitializedRef.current = false;
      hasLoadedFromStorageRef.current = false;
    };
  }, [messages, unwrappedParams.id]); // Removed saveMessages dependency as it's no longer used

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
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header with timer */}
      <header className="flex items-center justify-between p-4 bg-black border-b border-white/10">
        <div className="flex items-center">
          <Button
            variant="ghost"
            className="text-white p-0 mr-2"
            onClick={() => router.push("/dashboard")}
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
          <div className="text-xl font-medium text-white bg-slate-900 px-3 py-1 rounded-md">
            {formatTime(timeLeft)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-slate-800"
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || messages.length < 2}
          >
            <QuizIcon className="h-5 w-5 mr-1" />
            Quiz Me
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-600/20"
            onClick={() => setIsEndSessionDialogOpen(true)}
          >
            End Session
          </Button>
        </div>
      </header>

      {/* Session summary */}
      <div className="bg-slate-900 p-3 text-center">
        <p className="text-white">
          <span className="font-medium">Summary:</span> {conversation.summary}
        </p>
      </div>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
        <div className="flex-1 mb-4 overflow-auto bg-slate-800 rounded-lg p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-slate-700 ml-auto max-w-[80%]"
                    : "bg-slate-900 border border-white/10 mr-auto max-w-[80%]"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: (props) => (
                          <a
                            {...props}
                            className="text-white underline hover:text-slate-300"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        ul: (props) => (
                          <ul {...props} className="list-disc pl-5 space-y-1 text-white" />
                        ),
                        ol: (props) => (
                          <ol
                            {...props}
                            className="list-decimal pl-5 space-y-1 text-white"
                          />
                        ),
                        code: ({ inline, ...props }: CodeProps) =>
                          inline ? (
                            <code
                              {...props}
                              className="bg-slate-700 px-1 py-0.5 rounded text-sm text-white"
                            />
                          ) : (
                            <code
                              {...props}
                              className="block bg-slate-700 p-2 rounded-md overflow-x-auto text-sm my-2 text-white"
                            />
                          ),
                        pre: (props) => (
                          <pre
                            {...props}
                            className="bg-transparent p-0 overflow-x-auto text-white"
                          />
                        ),
                        h1: (props) => (
                          <h1
                            {...props}
                            className="text-xl font-bold mt-4 mb-2 text-white"
                          />
                        ),
                        h2: (props) => (
                          <h2
                            {...props}
                            className="text-lg font-bold mt-3 mb-1 text-white"
                          />
                        ),
                        h3: (props) => (
                          <h3
                            {...props}
                            className="text-md font-bold mt-2 mb-1 text-white"
                          />
                        ),
                        blockquote: (props) => (
                          <blockquote
                            {...props}
                            className="border-l-2 border-white/30 pl-3 italic text-white"
                          />
                        ),
                        p: (props) => (
                          <p
                            {...props}
                            className="text-white"
                          />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-white">{message.content}</p>
                )}
                <p className="text-white/50 text-xs mt-1">
                  {safeFormatTime(message.timestamp)}
                  {message.status === "sending" && " • Sending..."}
                  {message.status === "error" && " • Error sending"}
                </p>
              </div>
            ))}

            {isTyping && (
              <div className="self-start bg-slate-900 border border-white/10 text-white rounded-lg p-3 max-w-md">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            )}

            {/* Display Quiz Results when available */}
            {showQuizResults && (
              <div className="bg-slate-900 border border-white/10 p-4 rounded-lg self-start max-w-[95%] w-full overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-white">
                    Last Quiz Results
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-slate-700 h-8 px-2"
                    onClick={() => setShowQuizResults(false)}
                  >
                    <span className="sr-only">Close</span>
                    <CloseIcon className="h-4 w-4" />
                  </Button>
                </div>

                {quizFeedback && (
                  <div className="mb-4 overflow-y-auto max-h-[300px] bg-slate-700 p-4 rounded-md">
                    <h4 className="text-lg font-medium text-white mb-2 sticky top-0 bg-slate-700/90 py-1">
                      Feedback
                    </h4>
                    <div className="whitespace-pre-line text-white">
                      {quizFeedback}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {quizStrengths.length > 0 && (
                    <div className="bg-slate-800 p-3 rounded-md overflow-y-auto max-h-[200px]">
                      <h4 className="text-lg font-medium text-white mb-2 flex items-center sticky top-0 bg-slate-800/90 py-1">
                        <span className="mr-2">💪</span> Strengths
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-white">
                        {quizStrengths.map((strength, i) => (
                          <li key={i} className="break-words">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {quizWeaknesses.length > 0 && (
                    <div className="bg-slate-800 p-3 rounded-md overflow-y-auto max-h-[200px]">
                      <h4 className="text-lg font-medium text-white mb-2 flex items-center sticky top-0 bg-slate-800/90 py-1">
                        <span className="mr-2">🎯</span> Areas to Improve
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-white">
                        {quizWeaknesses.map((weakness, i) => (
                          <li key={i} className="break-words">
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Attachment Display */}
        {attachments.length > 0 && (
          <div className="mb-2 p-2 bg-slate-900 rounded-lg">
            <p className="text-white text-xs mb-2">Attachments:</p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center bg-slate-800 rounded px-2 py-1"
                >
                  <span className="text-white text-xs truncate max-w-[150px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(file.id)}
                    className="ml-2 text-white opacity-70 hover:opacity-100"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            className="bg-slate-900 border-slate-700 text-white resize-none h-16 placeholder:text-white/70 focus-visible:ring-slate-700 focus-visible:border-slate-700"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-white h-8 px-2 flex-1"
              type="button"
            >
              <PaperclipIcon className="h-5 w-5" />
            </Button>

            <Button
              onClick={handleSendMessage}
              className="bg-slate-800 hover:bg-slate-700 text-white h-8 px-2 flex-1"
              disabled={
                (!inputMessage.trim() && attachments.length === 0) || isTyping
              }
            >
              <SendIcon className="h-5 w-5" />
            </Button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          />
        </div>
        <div className="text-white/50 text-xs mt-1">
          Supported files: Images, PDFs, Documents, Text files (Max 10MB)
        </div>
      </main>

      {/* Quiz Modal */}
      <QuizModal
        open={isQuizModalOpen}
        onOpenChange={setIsQuizModalOpen}
        quiz={quiz}
        isLoading={isGeneratingQuiz}
        learningOption={conversation?.learning_option || "unknown"}
        onQuizComplete={handleQuizResults}
      />

      {/* End Session Dialog */}
      <Dialog
        open={isEndSessionDialogOpen}
        onOpenChange={setIsEndSessionDialogOpen}
      >
        <DialogContent className="bg-black text-white border-slate-800 shadow-slate-900">
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
              className="text-white hover:bg-slate-900"
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
              className="bg-slate-800 hover:bg-slate-700 text-white"
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

function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function QuizIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M9 11V6a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v0" />
      <path d="M9 17v-3a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v0" />
      <circle cx="6" cy="9" r="1" />
      <line x1="6" y1="5" x2="6" y2="8" />
      <line x1="6" y1="10" x2="6" y2="13" />
      <circle cx="18" cy="9" r="1" />
      <line x1="18" y1="5" x2="18" y2="8" />
      <line x1="18" y1="10" x2="18" y2="13" />
      <rect x="2" y="2" width="20" height="20" rx="5" />
    </svg>
  );
}
