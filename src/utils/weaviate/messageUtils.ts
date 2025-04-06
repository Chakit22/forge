import { messageService, Message } from './dataService';

// Interface for UI messages
export interface UIMessage {
  id?: string;
  role: string;
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  _doNotSave?: boolean;
}

// Add a Set to track saved message content signatures to prevent duplicates
// This will persist across function calls to prevent duplicates within the session
const savedMessageSignatures = new Set<string>();

/**
 * Save a message to Weaviate
 */
export async function saveMessage(message: {
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}): Promise<string> {
  try {
    console.log(`Saving message to Weaviate for conversation ${message.conversationId}`);
    console.log('Message data:', {
      role: message.role,
      contentPreview: message.content.slice(0, 50) + (message.content.length > 50 ? '...' : ''),
      userId: message.userId,
      conversationId: message.conversationId,
      timestamp: message.timestamp || new Date()
    });
    
    const messageId = await messageService.create({
      userId: message.userId,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || new Date(),
    });
    
    console.log(`Message saved successfully with ID: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error('Error saving message to Weaviate:', error);
    throw error;
  }
}

/**
 * Save multiple messages to Weaviate
 */
export async function saveMessages(
  userId: string,
  conversationId: string,
  messages: UIMessage[]
): Promise<Array<{ success: boolean; id?: string; error?: string }>> {
  try {
    console.log(`Saving ${messages.length} messages to Weaviate for conversation ${conversationId}`);
    console.log('User ID:', userId);
    
    if (!messages || messages.length === 0) {
      console.warn('No messages to save');
      return [];
    }
    
    if (!userId) {
      console.error('Missing userId when saving messages');
      throw new Error('User ID is required to save messages');
    }
    
    if (!conversationId) {
      console.error('Missing conversationId when saving messages');
      throw new Error('Conversation ID is required to save messages');
    }
    
    // Filter out welcome template messages before saving
    const filteredMessages = messages.filter(msg => {
      // Skip welcome template message (pattern matching)
      if (msg.role === 'assistant' && 
          msg.content.match(/Welcome to your .* session! Let's learn about ".*"/)) {
        console.log('Filtered out welcome template message in messageUtils');
        return false;
      }
      
      // Skip messages explicitly marked as do not save
      if (msg._doNotSave) {
        console.log('Filtered out message explicitly marked as do not save');
        return false;
      }
      
      // Create a unique signature for this message to prevent duplicates
      const signature = `${conversationId}:${msg.role}:${msg.content}`;
      
      // Check if we've already saved this message in this session
      if (savedMessageSignatures.has(signature)) {
        console.log('Skipping already saved message (detected by session tracking)');
        return false;
      }
      
      // Add to our tracking set
      savedMessageSignatures.add(signature);
      
      return true;
    });
    
    if (filteredMessages.length !== messages.length) {
      console.log(`Filtered out ${messages.length - filteredMessages.length} messages before saving`);
    }
    
    if (filteredMessages.length === 0) {
      console.warn('No messages to save after filtering');
      return [];
    }
    
    // Map UI messages to Weaviate format and save them
    const results = await Promise.all(
      filteredMessages.map(async (msg, index) => {
        try {
          console.log(`Saving message ${index + 1}/${filteredMessages.length}:`, {
            role: msg.role,
            contentPreview: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
          });
          
          const messageId = await messageService.create({
            userId,
            conversationId,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            timestamp: msg.timestamp || new Date(),
          });
          
          console.log(`Message ${index + 1} saved successfully with ID: ${messageId}`);
          return { success: true, id: messageId };
        } catch (error) {
          console.error(`Error saving message ${index + 1}:`, error);
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Saved ${successCount}/${filteredMessages.length} messages successfully`);
    
    return results;
  } catch (error) {
    console.error('Error saving messages to Weaviate:', error);
    throw error;
  }
}

/**
 * Retrieve messages from Weaviate for a conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<UIMessage[]> {
  try {
    console.log(`Retrieving messages for conversation ${conversationId}`);
    
    const messages = await messageService.getByConversationId(conversationId);
    
    console.log(`Retrieved ${messages.length} messages from Weaviate`);
    
    // Convert Weaviate messages to UI format
    return messages.map(msg => {
      // Ensure timestamp is a valid Date object
      let timestamp: Date;
      try {
        // Try to convert the timestamp to a Date
        timestamp = msg.timestamp ? new Date(msg.timestamp as string) : new Date();
        
        // Validate the date is valid
        if (isNaN(timestamp.getTime())) {
          console.warn(`Invalid timestamp for message: ${msg.id}, using current date instead`);
          timestamp = new Date();
        }
      } catch (error) {
        console.warn(`Error converting timestamp for message: ${msg.id}`, error);
        timestamp = new Date();
      }
      
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: timestamp,
        status: 'sent'
      };
    });
  } catch (error) {
    console.error('Error retrieving messages from Weaviate:', error);
    return [];
  }
} 