import { NextResponse } from 'next/server';
import { messageService } from '@/utils/weaviate/dataService';

// Interface for storing messages
interface MessageStoreRequest {
  userId: string;
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const requestData: MessageStoreRequest = await request.json();
    const { userId, conversationId, messages } = requestData;
    
    if (!userId || !conversationId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid message data. userId, conversationId, and messages array are required' }, 
        { status: 400 }
      );
    }

    // Store each message in Weaviate
    const messageIds = await Promise.all(
      messages.map(async (msg) => {
        try {
          const messageId = await messageService.create({
            userId,
            conversationId,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
          });
          
          return { success: true, id: messageId };
        } catch (error) {
          console.error('Error storing message in Weaviate:', error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      messageIds 
    });
  } catch (error) {
    console.error('Error in message store API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to store messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    const userId = url.searchParams.get('userId');
    
    if (!conversationId && !userId) {
      return NextResponse.json(
        { error: 'Either conversationId or userId parameter is required' }, 
        { status: 400 }
      );
    }

    let messages;
    
    if (conversationId) {
      // Get messages by conversation ID
      messages = await messageService.getByConversationId(conversationId);
    } else if (userId) {
      // Get messages by user ID
      messages = await messageService.getByUserId(userId);
    }
    
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