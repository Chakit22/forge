import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/app/api/actions';

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
    
    // Get the current user
    const { success, user, error: userError } = await getCurrentUser();
    
    if (!success || !user) {
      return NextResponse.json(
        { error: userError || 'Not authenticated' }, 
        { status: 401 }
      );
    }
    
    // Connect to Supabase
    const supabase = await createClient();
    
    // Verify the quiz result belongs to the user
    const { data: resultData, error: resultError } = await supabase
      .from('quiz_results')
      .select('user_id')
      .eq('id', resultId)
      .single();
    
    if (resultError) {
      console.error('Error fetching quiz result:', resultError);
      
      return NextResponse.json(
        { error: resultError.message }, 
        { status: 500 }
      );
    }
    
    if (!resultData || resultData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this quiz result' }, 
        { status: 403 }
      );
    }
    
    // Fetch quiz responses for the result
    const { data, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('result_id', resultId)
      .order('question_id', { ascending: true });
    
    if (error) {
      console.error('Error fetching quiz responses:', error);
      
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      responses: data 
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