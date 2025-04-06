import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { quizResultService } from '@/utils/weaviate/dataService';

export async function GET() {
  try {
    // Get the current user
    const { success, user, error: userError } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: userError || 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    console.log(`Fetching quiz results for user ${user.id}`);
    
    // Fetch quiz results for the user from Weaviate
    const results = await quizResultService.getByUserId(user.id.toString());
    
    console.log(`Found ${results.length} quiz results for user ${user.id}`);
    
    // Format the results to match the expected format
    const formattedResults = results.map(result => {
      // Convert Weaviate format to match Supabase format for compatibility
      return {
        id: result.id || '',
        quiz_id: result.quizId,
        user_id: parseInt(result.userId),
        score: result.score,
        total_questions: result.totalQuestions,
        feedback: result.feedback,
        learning_option: result.learningOption,
        strength_areas: result.strengthAreas,
        weakness_areas: result.weaknessAreas,
        created_at: result.timestamp instanceof Date 
          ? result.timestamp.toISOString() 
          : typeof result.timestamp === 'string' 
            ? result.timestamp 
            : new Date().toISOString()
      };
    });
    
    return NextResponse.json({ 
      success: true,
      results: formattedResults 
    });
  } catch (error) {
    console.error('Error in quiz results user API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 