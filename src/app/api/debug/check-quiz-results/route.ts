import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { getWeaviateClient } from '@/utils/weaviate/client';

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
    console.log(`Directly checking for quiz results for user ${userId} in Weaviate`);
    
    // Get Weaviate client
    const client = getWeaviateClient();
    
    // Perform a direct query to get all QuizResult objects
    const allQuizResults = await client.graphql
      .get()
      .withClassName('QuizResult')
      .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp _additional {id}')
      .do();
    
    // Also do a direct query for the specific user
    const userQuizResults = await client.graphql
      .get()
      .withClassName('QuizResult')
      .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp _additional {id}')
      .withWhere({
        path: ['userId'],
        operator: 'Equal',
        valueString: userId
      })
      .do();
    
    // Check the schema definition
    const schema = await client.schema.getter().do();
    
    // Return all the data for analysis
    return NextResponse.json({ 
      success: true,
      totalResults: allQuizResults?.data?.Get?.QuizResult?.length || 0,
      userResults: userQuizResults?.data?.Get?.QuizResult?.length || 0,
      allQuizResults: allQuizResults?.data?.Get?.QuizResult || [],
      userQuizResults: userQuizResults?.data?.Get?.QuizResult || [],
      schema: schema,
      userData: {
        userId,
        userObj: user
      }
    });
  } catch (error) {
    console.error('Error in check quiz results API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 