import { NextResponse } from 'next/server';
import { saveMessages, getConversationMessages } from '@/utils/weaviate/messageUtils';
import { getCurrentUser } from '@/app/api/actions';

// Interface for syncing messages
interface MessageSyncRequest {
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
}

export async function POST(request: Request) {
  try {
    // Get current user
    const { success, user, error } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: "User not authenticated" }, 
        { status: 401 }
      );
    }
    
    const requestData: MessageSyncRequest = await request.json();
    const { conversationId, messages } = requestData;
    
    if (!conversationId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid message data. conversationId and messages array are required' }, 
        { status: 400 }
      );
    }

    // Filter out welcome template messages to avoid saving them to the database
    const filteredMessages = messages.filter(msg => {
      // Skip welcome template message (pattern matching)
      if (msg.role === 'assistant' && 
          msg.content.match(/Welcome to your .* session! Let's learn about ".*"/)) {
        console.log('Filtered out welcome template message');
        return false;
      }
      return true;
    });

    // Check if we have any messages left to save after filtering
    if (filteredMessages.length === 0) {
      console.log('No messages to save after filtering out welcome messages');
      return NextResponse.json({ 
        success: true, 
        results: [] 
      });
    }

    // Get existing messages from the database to check for duplicates
    const existingMessages = await getConversationMessages(conversationId);
    
    // Create a map of existing message content to detect duplicates
    const existingContentMap = new Map();
    existingMessages.forEach(msg => {
      // Use a combination of role and content as the key to identify duplicates
      const key = `${msg.role}:${msg.content}`;
      existingContentMap.set(key, true);
    });
    
    // Filter out messages that already exist in the database
    const uniqueMessages = filteredMessages.filter(msg => {
      const key = `${msg.role}:${msg.content}`;
      // If message already exists, filter it out
      if (existingContentMap.has(key)) {
        console.log('Filtered out duplicate message:', key.substring(0, 50) + '...');
        return false;
      }
      return true;
    });
    
    console.log(`After duplicate filtering: ${uniqueMessages.length} unique messages to save (filtered out ${filteredMessages.length - uniqueMessages.length} duplicates)`);
    
    // Check if we have any unique messages left to save
    if (uniqueMessages.length === 0) {
      console.log('No unique messages to save after duplicate filtering');
      return NextResponse.json({ 
        success: true, 
        results: [] 
      });
    }

    // Store messages in Weaviate
    const results = await saveMessages(
      user.id.toString(),
      conversationId,
      uniqueMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        status: 'sent'
      }))
    );
    
    return NextResponse.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('Error in message sync API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Get current user
    const { success, user, error } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: "User not authenticated" }, 
        { status: 401 }
      );
    }
    
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId parameter is required' }, 
        { status: 400 }
      );
    }

    // Get messages from Weaviate
    const messages = await getConversationMessages(conversationId);
    
    return NextResponse.json({ 
      success: true, 
      messages 
    });
  } catch (error) {
    console.error('Error in message retrieval API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 