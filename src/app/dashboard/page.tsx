"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { UserInfo } from "@/components/user-info";
import { ConversationList } from "@/components/conversation-list";
import { addConversation } from "@/app/api/actions";
import { toast } from "sonner";

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const { user, isLoading } = useUser();

  console.log("user : ", user);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  const handleAddTopic = async () => {
    if (topic.trim()) {
      try {
        // Create a new conversation with the entered topic
        const response = await addConversation({
          duration: "PT30M", // Default 30 minute duration
          learning_option: "memorizing", // Default learning option
          summary: `Learning session about: ${topic}`,
        });

        if (response.success) {
          toast.success("Started new learning session!");
          // In a real app, you might navigate to a conversation page
          // router.push(`/dashboard/session/${response.conversation.id}`);
          setTopic("");
        } else {
          toast.error(response.error || "Failed to start session");
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        toast.error("An unexpected error occurred");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddTopic();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-teal-800">
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header toggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && <Sidebar className="flex-shrink-0" />}

        <main className="flex-1 overflow-auto bg-teal-700 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <UserInfo />
            </div>

            <div className="flex flex-col items-center justify-center mb-12 mt-8">
              <h2 className="text-white text-4xl font-medium mb-12">
                What would you like to learn today?
              </h2>

              <div className="relative w-full max-w-xl">
                <Input
                  type="text"
                  placeholder="Enter a topic"
                  className="bg-teal-600/50 text-white h-14 px-6 rounded-md border-0 placeholder:text-white/70 text-lg shadow-md focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleAddTopic}
                    className="bg-white/20 hover:bg-white/30 rounded-full h-9 w-9 text-white"
                    aria-label="Add topic"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-white/20 hover:bg-white/30 rounded-full h-9 w-9 text-white"
                    aria-label="Increase"
                  >
                    <ArrowUpIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <ConversationList />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  );
}
