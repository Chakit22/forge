import { UIMessage } from './weaviate/messageUtils';

/**
 * Save messages to Weaviate by dispatching a custom event
 */
export function saveMessagesToWeaviate(messages: UIMessage[]): void {
  try {
    // Create and dispatch the save event
    const saveEvent = new CustomEvent('save-messages', {
      detail: messages
    });
    window.dispatchEvent(saveEvent);
  } catch (error) {
    console.error('Error dispatching save-messages event:', error);
  }
}

/**
 * Listen for message load events from the wrapper component
 */
export function setupMessageLoadListener(callback: (messages: UIMessage[]) => void): () => void {
  const handleLoadMessages = (event: Event) => {
    const customEvent = event as CustomEvent<UIMessage[]>;
    if (customEvent.detail && Array.isArray(customEvent.detail)) {
      callback(customEvent.detail);
    }
  };
  
  // Add event listener
  window.addEventListener('load-messages', handleLoadMessages as EventListener);
  
  // Return function to remove the listener
  return () => {
    window.removeEventListener('load-messages', handleLoadMessages as EventListener);
  };
} 