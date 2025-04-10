import { NextRequest, NextResponse } from 'next/server';
import { getConversationMessages } from '@/utils/weaviate/messageUtils';
import { getCurrentUser } from '@/app/api/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Authenticate the user
    const { success, user, error: userError } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: userError || 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    console.log(`Fetching messages for conversation: ${conversationId}`);
    
    // Retrieve messages from Weaviate
    const messages = await getConversationMessages(conversationId);
    
    console.log(`Retrieved ${messages.length} messages for conversation ${conversationId}`);
    
    return NextResponse.json({ 
      success: true,
      messages 
    });
  } catch (error) {
    console.error('Error in conversation messages API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve conversation messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 