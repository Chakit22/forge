"use client";

import { useState, useEffect } from "react";
import { getUserConversations, deleteConversation } from "@/app/api/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Conversation {
  id: number;
  duration: string;
  learning_option: string;
  summary?: string;
  created_at: string;
}

export function ConversationList() {
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

  const handleDelete = async (id: number) => {
    try {
      const response = await deleteConversation(id);

      if (response.success) {
        // Remove the deleted conversation from state
        setConversations((prev) => prev.filter((c) => c.id !== id));
        toast.success("Conversation deleted successfully");
      } else {
        toast.error(response.error || "Failed to delete conversation");
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
      toast.error("An unexpected error occurred");
    }
  };

  // Format the ISO duration to a human readable format
  const formatDuration = (isoDuration: string) => {
    // This is a simple implementation; you might want to use a library like luxon for more complex cases
    const hours = parseInt(isoDuration.split("H")[0].replace("PT", "")) || 0;
    const minutes = parseInt(isoDuration.split("H")[1]?.split("M")[0] || "0");
    const seconds = parseInt(isoDuration.split("M")[1]?.split("S")[0] || "0");

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Format ISO date to readable format
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <div className="text-white/70 p-4">Loading conversations...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-300 mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchConversations}>
          Retry
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <div className="text-white/70 p-4">No conversations found</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Recent Conversations</h2>
      <div className="grid gap-4">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className="bg-teal-600/30 rounded-lg p-4 text-white"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">
                {conversation.learning_option.charAt(0).toUpperCase() +
                  conversation.learning_option.slice(1)}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-300 hover:text-red-100 hover:bg-red-900/20"
                onClick={() => handleDelete(conversation.id)}
              >
                Delete
              </Button>
            </div>
            <p className="text-sm text-white/70 mb-1">
              Duration: {formatDuration(conversation.duration)}
            </p>
            <p className="text-sm text-white/70 mb-2">
              Created: {formatDate(conversation.created_at)}
            </p>
            {conversation.summary && (
              <p className="text-sm border-t border-white/10 pt-2 mt-2">
                {conversation.summary}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
