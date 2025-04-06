import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { quizResultService } from '@/utils/weaviate/dataService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resultId = (await params).id;
    
    if (!resultId) {
      return NextResponse.json(
        { error: 'Quiz result ID is required' }, 
        { status: 400 }
      );
    }
    
    console.log(`Fetching responses for quiz result ID: ${resultId}`);
    
    // Get the current user
    const { success, user, error: userError } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: userError || 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Fetch the quiz result from Weaviate
    const result = await quizResultService.getById(resultId);
    
    // Verify the quiz result exists and belongs to the user
    if (!result) {
      console.error(`Quiz result not found with ID: ${resultId}`);
      return NextResponse.json(
        { error: 'Quiz result not found' }, 
        { status: 404 }
      );
    }
    
    if (result.userId !== user.id.toString()) {
      console.error(`User ${user.id} is not authorized to access quiz result ${resultId}`);
      return NextResponse.json(
        { error: 'Not authorized to access this quiz result' }, 
        { status: 403 }
      );
    }
    
    // Extract the responses from the quiz result object
    if (!result.responses || !Array.isArray(result.responses)) {
      console.log(`No responses found for quiz result ID: ${resultId}`);
      return NextResponse.json({ 
        success: true,
        responses: [] 
      });
    }
    
    // Format the responses to match the expected format
    const formattedResponses = result.responses.map((response, index) => ({
      id: index, // Generate an ID for each response
      result_id: parseInt(resultId) || 0,
      question_id: response.questionId,
      question_text: response.question,
      selected_option_index: response.selectedOptionIndex,
      correct_option_index: response.correctOptionIndex,
      is_correct: response.isCorrect
    }));
    
    console.log(`Returning ${formattedResponses.length} responses for quiz result ID: ${resultId}`);
    
    return NextResponse.json({ 
      success: true,
      responses: formattedResponses 
    });
  } catch (error) {
    console.error('Error in quiz responses API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz responses',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 