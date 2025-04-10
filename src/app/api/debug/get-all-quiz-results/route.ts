import { NextResponse } from 'next/server';
import { getWeaviateClient } from '@/utils/weaviate/client';

export async function GET() {
  try {
    const client = getWeaviateClient();
    
    // Get all QuizResult objects with all properties
    const result = await client.graphql
      .get()
      .withClassName('QuizResult')
      .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp _additional {id}')
      .withLimit(100) // Get up to 100 results
      .do();
    
    const quizResults = result?.data?.Get?.QuizResult || [];
    console.log(`Found ${quizResults.length} quiz results in Weaviate`);

    // Format results with proper id field from _additional.id
    const formattedResults = quizResults.map((result: any) => ({
      id: result._additional?.id,
      ...result
    }));

    return NextResponse.json({ 
      success: true,
      count: quizResults.length,
      results: formattedResults
    });
  } catch (error) {
    console.error('Error fetching all quiz results:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 