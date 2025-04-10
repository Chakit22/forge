import { NextResponse } from 'next/server';
import { getWeaviateClient } from '@/utils/weaviate/client';

// Define interface for Weaviate quiz result objects
interface WeaviateQuizResult {
  userId?: string;
  quizId?: string;
  conversationId?: string;
  score?: number;
  totalQuestions?: number;
  feedback?: string;
  learningOption?: string;
  strengthAreas?: string[];
  weaknessAreas?: string[];
  timestamp?: string;
  _additional?: {
    id?: string;
  };
  [key: string]: any; // For any other properties that might be present
}

export async function GET() {
  try {
    const client = getWeaviateClient();
    
    // Get all QuizResult objects with all properties - remove 'id' field which causes errors
    const result = await client.graphql
      .get()
      .withClassName('QuizResult')
      .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp _additional {id}')
      .withLimit(100) // Get up to 100 results
      .do();
    
    const quizResults = result?.data?.Get?.QuizResult || [];
    console.log(`Found ${quizResults.length} quiz results in Weaviate`);

    // Format results with proper id field from _additional.id
    const formattedResults = quizResults.map((result: WeaviateQuizResult) => ({
      id: result._additional?.id,
      ...result
    }));

    return NextResponse.json({ 
      success: true,
      count: quizResults.length,
      results: formattedResults
    });
  } catch (error) {
    console.error('Error in debug quiz results API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 