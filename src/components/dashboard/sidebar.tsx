"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateConversationModal } from "@/components/create-conversation-modal";
import { getUserConversations } from "@/app/api/actions";
import type { Conversation } from "@/app/api/actions";

interface SidebarProps {
  className?: string;
}

interface Category {
  name: string;
  conversations: Conversation[];
}

export function Sidebar({ className }: SidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const response = await getUserConversations();

      if (response.success && response.conversations) {
        // Group conversations by learning option
        const grouped = response.conversations.reduce(
          (acc: Record<string, Conversation[]>, conversation) => {
            const option = conversation.learning_option;
            if (!acc[option]) {
              acc[option] = [];
            }
            acc[option].push(conversation);
            return acc;
          },
          {}
        );

        // Convert to categories array
        const newCategories = Object.entries(grouped).map(
          ([name, conversations]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
            conversations,
          })
        );

        setCategories(newCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error("Error fetching conversations for sidebar:", error);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsModalOpen(false);
    fetchConversations();
  };

  // Format the summary for display in sidebar
  const formatSummary = (summary?: string) => {
    if (!summary) return "Untitled Session";
    // Remove the "Learning session about: " prefix if it exists
    const cleanSummary = summary.replace(/^Learning session about:\s*/i, "");
    // Truncate if too long
    return cleanSummary.length > 25
      ? cleanSummary.substring(0, 25) + "..."
      : cleanSummary;
  };

  return (
    <div className={cn("pb-12 w-64 bg-black border-r border-white/10", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            className="w-full justify-start bg-gray-900/50 hover:bg-gray-800 text-white"
            onClick={() => setIsModalOpen(true)}
          >
            <MessageSquareIcon className="mr-2 h-4 w-4" />
            New Chat
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start bg-gray-900/50 hover:bg-gray-800 text-white mt-2"
            asChild
          >
            <Link href="/dashboard/mindmap">
              <MindmapIcon className="mr-2 h-4 w-4" />
              Speech to Hierarchical Notes
            </Link>
          </Button>
        </div>
        <div className="px-3">
          <ScrollArea className="h-[calc(100vh-150px)]">
            {isLoading ? (
              <div className="px-4 text-white/70">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="px-4 text-white/70">No conversations yet</div>
            ) : (
              categories.map((category, index) => (
                <div key={index} className="py-2">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-white">
                    {category.name}
                  </h2>
                  <div className="space-y-1">
                    {category.conversations.map((conversation) => (
                      <Button
                        key={conversation.id}
                        variant="ghost"
                        className="w-full justify-start text-white/80 hover:bg-gray-800 hover:text-white"
                        asChild
                      >
                        <Link
                          href={`/dashboard/conversation/${conversation.id}`}
                        >
                          {formatSummary(conversation.summary)}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Conversation Creation Modal */}
      <CreateConversationModal
        isOpen={isModalOpen}
        onClose={handleCreateSuccess}
      />
    </div>
  );
}

function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}

function MindmapIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="16" cy="18" r="2" />
      <line x1="12" y1="7" x2="6" y2="10" />
      <line x1="12" y1="7" x2="18" y2="10" />
      <line x1="6" y1="14" x2="8" y2="16" />
      <line x1="18" y1="14" x2="16" y2="16" />
    </svg>
  );
}
