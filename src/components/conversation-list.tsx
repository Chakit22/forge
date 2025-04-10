"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserConversations, deleteConversation } from "@/app/api/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrashIcon, RefreshCcwIcon, ExternalLinkIcon } from "lucide-react";
import type { Conversation } from "@/app/api/actions";

export function ConversationList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getUserConversations({
        limit: 10,
        orderBy: {
          column: "created_at",
          ascending: false,
        },
      });

      if (response.success && response.conversations) {
        setConversations(response.conversations);
      } else {
        setError(response.error || "Failed to fetch conversations");
        setConversations([]);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("An unexpected error occurred");
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when deleting

    try {
      const response = await deleteConversation(id);

      if (response.success) {
        // Remove the deleted conversation from state
        setConversations((prev) => prev.filter((c) => c.id !== id));

        // Dispatch event to notify other components about deletion
        const deleteEvent = new CustomEvent("conversation-deleted", {
          detail: { id },
        });
        window.dispatchEvent(deleteEvent);

        toast.success("Conversation deleted successfully");
      } else {
        toast.error(response.error || "Failed to delete conversation");
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const handleNavigateToConversation = (id: number) => {
    router.push(`/dashboard/conversation/${id}`);
  };

  // Format the ISO duration to a human readable format
  const formatDuration = (isoDuration: string) => {
    try {
      if (!isoDuration) return "30m"; // Default to 30 minutes if no duration

      // Check if it's an ISO format (PT1H30M)
      if (isoDuration.startsWith("PT")) {
        const hourMatch = isoDuration.match(/(\d+)H/);
        const minuteMatch = isoDuration.match(/(\d+)M/);
        const secondMatch = isoDuration.match(/(\d+)S/);

        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;

        if (hours > 0 && minutes > 0) {
          return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
          return `${hours}h`;
        } else if (minutes > 0) {
          return `${minutes}m`;
        } else if (seconds > 0) {
          return `${seconds}s`;
        }
      }

      // Check for HH:MM:SS format
      const timeFormatMatch = isoDuration.match(/(\d+):(\d+):(\d+)/);
      if (timeFormatMatch) {
        const hours = parseInt(timeFormatMatch[1]);
        const minutes = parseInt(timeFormatMatch[2]);
        const seconds = parseInt(timeFormatMatch[3]);

        if (hours > 0 && minutes > 0) {
          return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
          return `${hours}h`;
        } else if (minutes > 0) {
          return `${minutes}m`;
        } else if (seconds > 0) {
          return `${seconds}s`;
        }
      }

      // Check for text format like "1 hour 30 minutes"
      if (/\d+\s*hour|\d+\s*min/i.test(isoDuration)) {
        return isoDuration; // Return directly if already in readable format
      }

      // Last resort: try to parse as just a number of minutes
      const justMinutes = parseInt(isoDuration);
      if (!isNaN(justMinutes)) {
        return `${justMinutes}m`;
      }

      return "30m"; // Default to 30 minutes
    } catch (e) {
      console.error("Error formatting duration:", e, "for input:", isoDuration);
      return "30m"; // Default to 30 minutes
    }
  };

  // Format ISO date to readable format
  const formatDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return isoDate || "Unknown date";
    }
  };

  // Extract topic from summary
  const getTopicFromSummary = (summary?: string) => {
    if (!summary) return "Untitled Session";
    return summary.replace(/^Learning session about:\s*/i, "");
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchConversations}
          disabled={isLoading}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <RefreshCcwIcon className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-white/70 p-4 text-center">
          Loading conversations...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 rounded-md">
          <p className="text-red-300 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchConversations}>
            Retry
          </Button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-white/70 p-8 text-center bg-black/50 rounded-md">
          <p>No learning sessions found</p>
          <p className="mt-2 text-sm">
            Create a new session using the button above
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="bg-black/50 rounded-lg p-4 text-white hover:bg-white/10 transition-colors cursor-pointer relative"
              onClick={() => handleNavigateToConversation(conversation.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-lg">
                    {getLearningOptionDisplay(conversation.learning_option)}
                  </h3>
                  <p className="text-white/90 mt-1">
                    {getTopicFromSummary(conversation.summary)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToConversation(conversation.id);
                    }}
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-300 hover:text-red-100 hover:bg-red-900/20"
                    onClick={(e) => handleDelete(conversation.id, e)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
              <div className="flex gap-4 text-sm text-white/70 border-t border-white/10 pt-2 mt-2">
                <p>Duration: {formatDuration(conversation.duration)}</p>
                <p>Created: {formatDate(conversation.created_at)}</p>
              </div>
              {conversation.summary && (
                <div className="mt-2 text-sm text-white/80 truncate">
                  <span className="font-medium">Summary:</span>{" "}
                  {conversation.summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
