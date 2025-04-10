import { NextResponse } from 'next/server';
import { quizResultService } from '@/utils/weaviate/dataService';
import { getCurrentUser } from '@/app/api/actions';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Get the current user for permission checking
    const { success, user, error: userError } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: userError || 'Not authenticated' }, 
        { status: 401 }
      );
    }

    console.log(`Fetching quiz results for conversation ${conversationId}`);
    
    // Fetch quiz results for the conversation from Weaviate
    let results = await quizResultService.getByConversationId(conversationId);
    
    // If no results found, try getting all user quizzes as fallback
    if (results.length === 0) {
      console.log(`No results found for conversation ${conversationId}, trying to find quizzes for this user`);
      
      // Get all quizzes for this user
      const userResults = await quizResultService.getByUserId(user.id.toString());
      
      // Check if any are associated with this conversation ID
      results = userResults.filter(r => 
        r.conversationId === conversationId || 
        !r.conversationId // Include quizzes with no conversation ID
      );
      
      if (results.length > 0) {
        console.log(`Found ${results.length} quiz results from user that match this conversation`);
      } else {
        console.log(`No quiz results found for user ${user.id} related to conversation ${conversationId}`);
      }
    } else {
      console.log(`Found ${results.length} quiz results for conversation ${conversationId}`);
    }
    
    // Format the results to match the expected format
    const formattedResults = results.map(result => {
      // Convert Weaviate format to match expected format for UI
      return {
        id: result.id || '',
        quiz_id: result.quizId,
        user_id: parseInt(result.userId),
        conversation_id: result.conversationId,
        score: result.score,
        total_questions: result.totalQuestions,
        feedback: result.feedback || '',
        learning_option: result.learningOption,
        strength_areas: Array.isArray(result.strengthAreas) ? result.strengthAreas : [],
        weakness_areas: Array.isArray(result.weaknessAreas) ? result.weaknessAreas : [],
        created_at: result.timestamp instanceof Date 
          ? result.timestamp.toISOString() 
          : typeof result.timestamp === 'string' 
            ? result.timestamp 
            : new Date().toISOString()
      };
    });
    
    // Sort by date, most recent first
    formattedResults.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return NextResponse.json({ 
      success: true,
      results: formattedResults 
    });
  } catch (error) {
    console.error('Error in quiz results conversation API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 