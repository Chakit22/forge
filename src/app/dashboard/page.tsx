"use client";

import { useState } from "react";
import { UserInfo } from "@/components/user-info";
import { ConversationList } from "@/components/conversation-list";
import { Button } from "@/components/ui/button";
import { CreateConversationModal } from "@/components/create-conversation-modal";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      <div className="mt-12">
        <ConversationList />
      </div>

      <CreateConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
