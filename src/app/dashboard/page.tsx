"use client";

import { useState, useEffect } from "react";
// import { UserInfo } from "@/components/user-info";
import { ConversationList } from "@/components/conversation-list";
import { Button } from "@/components/ui/button";
import { CreateConversationModal } from "@/components/create-conversation-modal";
import UserQuizResults from "@/components/UserQuizResults";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refresh the sidebar when the dashboard page loads
  useEffect(() => {
    console.log("Dashboard page mounted, refreshing conversations");
    const updateEvent = new CustomEvent("conversation-updated");
    window.dispatchEvent(updateEvent);
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Also refresh conversations when modal closes
    const updateEvent = new CustomEvent("conversation-updated");
    window.dispatchEvent(updateEvent);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* <div className="mb-8">
        <UserInfo />
      </div> */}

      <div className="flex flex-col items-center justify-center mb-12 mt-8">
        <h2 className="text-white text-4xl font-medium mb-8">
          Welcome to your learning dashboard
        </h2>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-white/20 hover:bg-white/30 text-white py-6 px-8 text-xl rounded-lg"
        >
          <PlusIcon className="h-6 w-6 mr-2" />
          Start a new learning session
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
        <div className="lg:col-span-2">
          <h3 className="text-white text-2xl font-medium mb-4">
            Your Learning Sessions
          </h3>
          <ConversationList />
        </div>

        <div>
          <h3 className="text-white text-2xl font-medium mb-4">
            Quiz Performance
          </h3>
          <UserQuizResults />
        </div>
      </div>

      <CreateConversationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
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
