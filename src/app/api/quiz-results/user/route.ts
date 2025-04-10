import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { quizResultService } from '@/utils/weaviate/dataService';
import { getWeaviateClient } from '@/utils/weaviate/client';

export async function GET() {
  try {
    // Get the current user
    const { success, user, error: userError } = await getCurrentUser();
    
    if (!success || !user) {
      console.log('User not authenticated in quiz results endpoint');
      return NextResponse.json(
        { error: userError || 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    console.log(`Fetching quiz results for user ${user.id}`);
    
    // IMPROVEMENT: Try two different approaches to get the data
    
    // 1. First try using the service
    let results = await quizResultService.getByUserId(user.id.toString());
    
    console.log(`Found ${results.length} quiz results for user ${user.id} via service`);
    
    // 2. If no results, try directly using the Weaviate client
    if (results.length === 0) {
      console.log('No results found via service, trying direct Weaviate query');
      
      const client = getWeaviateClient();
      
      const result = await client.graphql
        .get()
        .withClassName('QuizResult')
        .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp responses {questionId question selectedOptionIndex correctOptionIndex isCorrect} _additional {id}')
        .withWhere({
          path: ['userId'],
          operator: 'Equal',
          valueString: user.id.toString()
        })
        .withLimit(100)
        .do();
      
      const directResults = result?.data?.Get?.QuizResult || [];
      
      console.log(`Found ${directResults.length} quiz results via direct query`);
      
      // Convert the direct results
      results = directResults.map(r => ({
        ...r,
        id: r._additional?.id
      }));
    }
    
    // Check if there are any results without a conversationId
    const missingConversationId = results.filter(r => !r.conversationId || r.conversationId === '');
    if (missingConversationId.length > 0) {
      console.log(`Found ${missingConversationId.length} quiz results without conversationId`);
    }
    
    if (results.length > 0) {
      // Log the first result
      console.log('First raw result:', JSON.stringify(results[0]));
      
      // Check for any irregular property names
      const firstResult = results[0];
      const expectedProps = ['id', 'userId', 'quizId', 'conversationId', 'score', 'totalQuestions', 
                            'feedback', 'learningOption', 'strengthAreas', 'weaknessAreas', 'timestamp'];
      
      const missingProps = expectedProps.filter(prop => !(prop in firstResult));
      const extraProps = Object.keys(firstResult).filter(prop => !expectedProps.includes(prop) && prop !== '_additional');
      
      if (missingProps.length > 0) {
        console.log('Missing expected properties:', missingProps);
      }
      
      if (extraProps.length > 0) {
        console.log('Extra unexpected properties:', extraProps);
      }
    } else {
      console.log('No quiz results found for user');
    }
    
    // Format the results to match the expected format
    // IMPROVEMENT: More robust handling of different property formats
    const formattedResults = results.map(result => {
      // Get all properties from the result
      const props = Object.keys(result).filter(k => k !== '_additional');
      
      // First try standard camelCase format
      const id = result.id || '';
      const quizId = result.quizId || result.quiz_id || '';
      const userId = result.userId || result.user_id || '';
      const conversationId = result.conversationId || result.conversation_id || '';
      const score = result.score || 0;
      const totalQuestions = result.totalQuestions || result.total_questions || 0;
      const feedback = result.feedback || '';
      const learningOption = result.learningOption || result.learning_option || 'unknown';
      const strengthAreas = Array.isArray(result.strengthAreas) 
        ? result.strengthAreas 
        : Array.isArray(result.strength_areas)
          ? result.strength_areas 
          : [];
      const weaknessAreas = Array.isArray(result.weaknessAreas) 
        ? result.weaknessAreas 
        : Array.isArray(result.weakness_areas)
          ? result.weakness_areas 
          : [];
      let timestamp = result.timestamp || result.created_at || new Date().toISOString();
      
      // Ensure proper types
      if (typeof score !== 'number') {
        score = parseInt(score) || 0;
      }
      
      if (typeof totalQuestions !== 'number') {
        totalQuestions = parseInt(totalQuestions) || 0;
      }
      
      if (typeof userId !== 'number' && typeof userId === 'string') {
        userId = parseInt(userId) || 0;
      }
      
      if (timestamp instanceof Date) {
        timestamp = timestamp.toISOString();
      }
      
      // Convert to the expected format for the frontend
      return {
        id,
        quiz_id: quizId,
        user_id: userId,
        conversation_id: conversationId,
        score,
        total_questions: totalQuestions,
        feedback,
        learning_option: learningOption,
        strength_areas: strengthAreas,
        weakness_areas: weaknessAreas,
        created_at: timestamp
      };
    });
    
    console.log(`Returning ${formattedResults.length} formatted quiz results`);
    
    if (formattedResults.length > 0) {
      console.log('Sample formatted result:', JSON.stringify(formattedResults[0]));
    }
    
    return NextResponse.json({ 
      success: true,
      results: formattedResults 
    });
  } catch (error) {
    console.error('Error in quiz results user API route:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 