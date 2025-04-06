"use client";

import React, { useState, useEffect, useRef } from "react";
import { UIMessage } from "@/utils/weaviate/messageUtils";
import { getCurrentUser } from "@/app/api/actions";
import { toast } from "sonner";

// Declare global property for TypeScript
declare global {
  interface Window {
    __conversationEventsDispatched: Set<string>;
  }
}

interface WeaviateConversationWrapperProps {
  conversationId: string;
  children: React.ReactNode;
}

export default function WeaviateConversationWrapper({
  conversationId,
  children,
}: WeaviateConversationWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [savedMessages, setSavedMessages] = useState<UIMessage[]>([]);

  // Force singleton pattern by using window property
  useEffect(() => {
    // Initialize the tracking set if it doesn't exist
    if (typeof window !== "undefined") {
      window.__conversationEventsDispatched =
        window.__conversationEventsDispatched || new Set();
    }

    console.log(`Wrapper mounted for conversation ${conversationId}`);
    const hasDispatched =
      typeof window !== "undefined" &&
      window.__conversationEventsDispatched?.has(conversationId);

    console.log(`Has already dispatched for ${conversationId}:`, hasDispatched);

    const loadMessages = async () => {
      try {
        setIsLoading(true);

        // Get current user
        const userResponse = await getCurrentUser();
        if (!userResponse.success || !userResponse.user) {
          console.error("User not authenticated, cannot load messages");
          return;
        }

        console.log(`Fetching messages for conversation ${conversationId}`);
        // Fetch messages from the API
        const response = await fetch(
          `/api/message-sync?conversationId=${conversationId}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to load messages: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();

        if (data.success && data.messages && Array.isArray(data.messages)) {
          // Set the loaded messages to state
          setSavedMessages(data.messages);

          // Add data to localStorage for backup
          try {
            localStorage.setItem(
              `conversation_${conversationId}_messages`,
              JSON.stringify(data.messages)
            );
          } catch (e) {
            console.error("Error saving messages to localStorage:", e);
          }

          console.log(`Loaded ${data.messages.length} messages from Weaviate`);

          // Only dispatch if we have messages and haven't dispatched for this conversation before
          if (data.messages.length > 0 && !hasDispatched) {
            // Mark this conversation ID as having dispatched an event
            if (typeof window !== "undefined") {
              window.__conversationEventsDispatched.add(conversationId);
            }

            console.log("Dispatching load-messages event (first time ever)");

            // Dispatch event to load messages into the conversation component
            const loadEvent = new CustomEvent("load-messages", {
              detail: data.messages,
            });
            window.dispatchEvent(loadEvent);
          }
        }
      } catch (error) {
        console.error("Error loading messages from Weaviate:", error);
        toast.error("Failed to load conversation history");

        // Try to load from localStorage as backup
        try {
          const savedData = localStorage.getItem(
            `conversation_${conversationId}_messages`
          );
          if (savedData) {
            const messages = JSON.parse(savedData) as UIMessage[];
            setSavedMessages(messages);

            // Only dispatch if we have messages and haven't dispatched for this conversation before
            if (messages.length > 0 && !hasDispatched) {
              // Mark this conversation ID as having dispatched an event
              if (typeof window !== "undefined") {
                window.__conversationEventsDispatched.add(conversationId);
              }

              console.log(
                "Dispatching load-messages event from localStorage backup (first time ever)"
              );

              // Dispatch event to load messages into the conversation component
              const loadEvent = new CustomEvent("load-messages", {
                detail: messages,
              });
              window.dispatchEvent(loadEvent);
            }

            console.log(
              `Loaded ${messages.length} messages from localStorage backup`
            );
          }
        } catch (e) {
          console.error("Error loading backup messages from localStorage:", e);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();

    // Clean up function - do not remove from the set on unmount to maintain state across navigation
    return () => {
      console.log(`Wrapper unmounting for conversation ${conversationId}`);
    };
  }, [conversationId]);

  // Setup message saving
  useEffect(() => {
    // Setup event handler for saving messages
    const handleMessageSave = async (event: CustomEvent<UIMessage[]>) => {
      try {
        const messagesToSave = event.detail;
        if (!messagesToSave || messagesToSave.length === 0) return;

        console.log(`Saving ${messagesToSave.length} messages to Weaviate`);

        // Save to local storage as backup
        try {
          localStorage.setItem(
            `conversation_${conversationId}_messages`,
            JSON.stringify(messagesToSave)
          );
        } catch (e) {
          console.error("Error saving messages to localStorage:", e);
        }

        // Save to Weaviate
        const response = await fetch("/api/message-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            messages: messagesToSave.map((msg) => ({
              role: msg.role,
              content: msg.content,
              timestamp:
                msg.timestamp instanceof Date
                  ? msg.timestamp.toISOString()
                  : new Date(msg.timestamp).toISOString(),
            })),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to save messages: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        if (data.success) {
          console.log("Messages saved to Weaviate successfully");
        }
      } catch (error) {
        console.error("Error saving messages to Weaviate:", error);
      }
    };

    // Add event listener for saving messages
    window.addEventListener(
      "save-messages",
      handleMessageSave as unknown as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "save-messages",
        handleMessageSave as unknown as EventListener
      );
    };
  }, [conversationId]);

  return (
    <>
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 bg-black text-white text-xs text-center py-1 z-50">
          Loading conversation history...
        </div>
      )}
      {children}
    </>
  );
}
