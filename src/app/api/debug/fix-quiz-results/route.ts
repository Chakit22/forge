import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { getWeaviateClient } from '@/utils/weaviate/client';
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
    
    const userId = user.id.toString();
    console.log(`Fixing quiz results for user ${userId} in Weaviate`);
    
    // Get Weaviate client
    const client = getWeaviateClient();
    
    // First, get all quiz results
    const allQuizResults = await client.graphql
      .get()
      .withClassName('QuizResult')
      .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp responses _additional {id}')
      .do();
    
    const results = allQuizResults?.data?.Get?.QuizResult || [];
    
    if (results.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No quiz results found to fix',
        totalResults: 0
      });
    }
    
    console.log(`Found ${results.length} quiz results to process`);
    
    // Process the transformation for each result
    const transformationResults = [];
    
    for (const result of results) {
      if (!result._additional?.id) {
        console.log('Skipping result with no ID');
        continue;
      }
      
      try {
        // Create the properly formatted object based on your sample
        // Map snake_case to camelCase and vice versa as needed
        const fixedResult = {
          // Keep the original userId
          userId: result.userId || userId,
          
          // If missing quizId, create one
          quizId: result.quizId || `fixed-quiz-${Date.now()}`,
          
          // Add conversation ID if missing
          conversationId: result.conversationId || '',
          
          // Fix numeric fields
          score: typeof result.score === 'number' ? result.score : parseInt(result.score) || 0,
          totalQuestions: typeof result.totalQuestions === 'number' ? result.totalQuestions : parseInt(result.totalQuestions) || 0,
          
          // Handle arrays
          strengthAreas: Array.isArray(result.strengthAreas) ? result.strengthAreas : 
                         result.strengthAreas ? [result.strengthAreas] : [],
          weaknessAreas: Array.isArray(result.weaknessAreas) ? result.weaknessAreas : 
                         result.weaknessAreas ? [result.weaknessAreas] : [],
          
          // Handle responses array - ensure it's in the correct format
          responses: Array.isArray(result.responses) ? result.responses.map((resp: {
            questionId: string;
            question: string;
            selectedOptionIndex: number;
            correctOptionIndex: number;
            isCorrect: boolean;
          }) => ({
            questionId: resp.questionId,
            question: resp.question,
            selectedOptionIndex: resp.selectedOptionIndex,
            correctOptionIndex: resp.correctOptionIndex,
            isCorrect: resp.isCorrect
          })) : [],
          
          // Add other fields
          feedback: result.feedback || '',
          learningOption: result.learningOption || 'understanding',
          
          // Ensure timestamp is a string in ISO format
          timestamp: result.timestamp instanceof Date 
            ? result.timestamp.toISOString() 
            : typeof result.timestamp === 'string' 
              ? result.timestamp 
              : new Date().toISOString()
        };
        
        // Update the record in Weaviate
        const updatedId = await client.data
          .updater()
          .withClassName('QuizResult')
          .withId(result._additional.id)
          .withProperties(fixedResult)
          .do();
        
        transformationResults.push({
          id: result._additional.id,
          success: true,
          original: result,
          updated: fixedResult
        });
        
        console.log(`Updated quiz result: ${result._additional.id}`);
      } catch (updateError) {
        console.error(`Error updating quiz result ${result._additional.id}:`, updateError);
        
        transformationResults.push({
          id: result._additional.id,
          success: false,
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
          original: result
        });
      }
    }
    
    // Now try to retrieve the user's quiz results to verify the fix
    const userQuizResults = await quizResultService.getByUserId(userId);
    
    return NextResponse.json({ 
      success: true,
      message: `Processed ${results.length} quiz results`,
      totalProcessed: results.length,
      results: transformationResults,
      userQuizResults: userQuizResults.map(result => ({
        id: result.id,
        userId: result.userId,
        quizId: result.quizId,
        conversationId: result.conversationId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        hasResponses: Array.isArray(result.responses) && result.responses.length > 0,
        hasStrengthAreas: Array.isArray(result.strengthAreas) && result.strengthAreas.length > 0,
        hasWeaknessAreas: Array.isArray(result.weaknessAreas) && result.weaknessAreas.length > 0
      }))
    });
  } catch (error) {
    console.error('Error in fix quiz results API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fix quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 