import { NextResponse } from 'next/server';
import { getWeaviateClient } from '@/utils/weaviate/client';
import { getCurrentUser } from '@/app/api/actions';

export async function DELETE(request: Request) {
  try {
    // Get current user
    const { success, user, error } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: "User not authenticated" }, 
        { status: 401 }
      );
    }
    
    // Get conversation ID from query params
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId parameter is required' }, 
        { status: 400 }
      );
    }
    
    console.log(`Cleaning up welcome messages for conversation: ${conversationId}`);
    
    // Get Weaviate client
    const client = getWeaviateClient();
    
    // Find messages with welcome text pattern - using two different patterns to catch more variants
    const welcomePatterns = [
      "Welcome to your % session! Let's learn about %",
      "Welcome to your %"
    ];
    
    let totalDeleted = 0;
    
    // Delete messages for each pattern
    for (const pattern of welcomePatterns) {
      try {
        // Delete all matching messages
        const result = await client.batch.objectsBatchDeleter()
          .withClassName('Message')
          .withWhere({
            operator: 'And',
            operands: [
              {
                path: ['conversationId'],
                operator: 'Equal',
                valueString: conversationId
              },
              {
                path: ['content'],
                operator: 'Like',
                valueString: pattern
              }
            ]
          })
          .do();
          
        const deletedCount = result?.results?.objects?.length || 0;
        totalDeleted += deletedCount;
        console.log(`Deleted ${deletedCount} welcome messages with pattern: ${pattern}`);
      } catch (patternError) {
        console.error(`Error deleting welcome messages with pattern ${pattern}:`, patternError);
      }
    }
    
    console.log(`Total deleted welcome messages: ${totalDeleted}`);
    
    return NextResponse.json({ 
      success: true, 
      deleted: totalDeleted
    });
  } catch (error) {
    console.error('Error in welcome message cleanup:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clean up welcome messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 