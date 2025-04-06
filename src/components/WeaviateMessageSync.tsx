import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UIMessage } from '@/utils/weaviate/messageUtils';

interface WeaviateMessageSyncProps {
  conversationId: string;
  messages: UIMessage[];
  onMessagesLoaded: (messages: UIMessage[]) => void;
  children: React.ReactNode;
}

/**
 * This component wraps a chat conversation and syncs messages with Weaviate
 * It loads messages on mount and provides a function to save new messages
 */
export function WeaviateMessageSync({
  conversationId,
  messages,
  onMessagesLoaded,
  children
}: WeaviateMessageSyncProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialMessageCount, setInitialMessageCount] = useState(0);

  // Fetch messages from Weaviate on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/message-sync?conversationId=${conversationId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.messages && Array.isArray(data.messages)) {
          console.log(`Loaded ${data.messages.length} messages from Weaviate`);
          
          // Only set messages if we have some from Weaviate
          if (data.messages.length > 0) {
            onMessagesLoaded(data.messages);
            setInitialMessageCount(data.messages.length);
          }
        }
      } catch (error) {
        console.error('Error fetching messages from Weaviate:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMessages();
  }, [conversationId, onMessagesLoaded]);

  // Save new messages to Weaviate when they change
  useEffect(() => {
    // Only sync if we have more messages than what we loaded initially
    // This prevents overwriting the initial messages
    if (messages.length > initialMessageCount && initialMessageCount > 0) {
      const saveNewMessages = async () => {
        try {
          // Only save messages that were added after the initial load
          const newMessages = messages.slice(initialMessageCount);
          
          console.log(`Saving ${newMessages.length} new messages to Weaviate`);
          
          const response = await fetch('/api/message-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationId,
              messages: newMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString()
              }))
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save messages: ${response.status} - ${errorText}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            console.log('Messages saved to Weaviate');
            // Update the count so we don't resave these messages
            setInitialMessageCount(messages.length);
          }
        } catch (error) {
          console.error('Error saving messages to Weaviate:', error);
          // Don't show a toast for every save attempt to avoid annoying the user
        }
      };
      
      saveNewMessages();
    }
  }, [messages, conversationId, initialMessageCount]);

  // Render children with added loading state
  return (
    <div className="weaviate-message-sync">
      {isLoading && <div className="text-xs text-gray-400">Loading conversation history...</div>}
      {error && <div className="text-xs text-red-400">Error loading history: {error}</div>}
      {children}
    </div>
  );
} 