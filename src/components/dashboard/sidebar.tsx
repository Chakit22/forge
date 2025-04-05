"use client";

import Link from "next/link";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

interface CategoryItem {
  id: string;
  name: string;
}

interface Category {
  name: string;
  items: CategoryItem[];
}

export function Sidebar({ className }: SidebarProps) {
  const categories: Category[] = [
    {
      name: "Memorization",
      items: [
        { id: "japanese", name: "Japanese Words" },
        { id: "medical", name: "Medical Terms" },
      ],
    },
    {
      name: "Understanding",
      items: [
        { id: "list", name: "I've went through the list!" },
      ],
    },
    {
      name: "Testing",
      items: [
        { id: "testing-list", name: "I've went through the list!" },
      ],
    },
  ];

  return (
    <div className={cn("pb-12 w-64 bg-teal-800", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <Button variant="ghost" className="w-full justify-start bg-teal-700/50 hover:bg-teal-700/70 text-white">
            <MessageSquareIcon className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <div className="px-3">
          <ScrollArea className="h-[calc(100vh-100px)]">
            {categories.map((category, index) => (
              <div key={index} className="py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-white">
                  {category.name}
                </h2>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start text-white/80 hover:bg-teal-700/50 hover:text-white"
                      asChild
                    >
                      <Link href={`/dashboard/${item.id}`}>
                        {item.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
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