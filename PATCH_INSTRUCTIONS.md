# Conversation Page Update Instructions

To update the conversation page to work with Weaviate for message persistence, make the following changes to `src/app/dashboard/conversation/[id]/page.tsx`:

## 1. Add imports at the top of the file

```typescript
import { setupMessageLoadListener, saveMessagesToWeaviate } from "@/utils/weaviate-chat-helpers";
import { UIMessage as WeaviateUIMessage } from "@/utils/weaviate/messageUtils";
```

## 2. Update the existing UIMessage interface or use the imported one

```typescript
// Use this instead of the existing UIMessage interface
interface UIMessage extends WeaviateUIMessage {
  // You can add any additional fields needed for your UI here
}
```

## 3. Add an effect to listen for messages loaded from Weaviate

Add this inside your component function:

```typescript
// Listen for messages loaded from Weaviate
useEffect(() => {
  const removeListener = setupMessageLoadListener((loadedMessages) => {
    if (loadedMessages && loadedMessages.length > 0) {
      console.log(`Loaded ${loadedMessages.length} messages from Weaviate`);
      setMessages(loadedMessages);
    }
  });
  
  // Clean up the listener when the component unmounts
  return () => removeListener();
}, []);
```

## 4. Update the handleSendMessage function to save messages to Weaviate

Add this at the end of the handleSendMessage function (before the final closing curly brace):

```typescript
// Save messages to Weaviate
saveMessagesToWeaviate(messages);
```

## 5. Save messages when the user leaves the conversation

Add this effect to save messages when the component unmounts:

```typescript
// Save messages when the user leaves the conversation
useEffect(() => {
  return () => {
    if (messages.length > 0) {
      saveMessagesToWeaviate(messages);
    }
  };
}, [messages]);
```

With these changes, your conversation page will:
1. Load existing messages from Weaviate on page load
2. Save new messages to Weaviate as they're sent
3. Save all messages when the user leaves the conversation

The ID of the chat messages will be preserved, making conversation history consistent across page reloads. 