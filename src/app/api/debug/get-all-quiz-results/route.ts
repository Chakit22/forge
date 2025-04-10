import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Interface for quiz results
interface QuizResult {
  id: string;
  quiz_id: string;
  user_id: number;
  conversation_id: string;
  score: number;
  total_questions: number;
  feedback: string;
  learning_option: string;
  strength_areas: string[];
  weakness_areas: string[];
  created_at: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          }
        }
      }
    );
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only allow this route in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }
    
    // Get all quiz results from the database
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      results: data as QuizResult[]
    });
    
  } catch (error) {
    console.error('Error in GET /api/debug/get-all-quiz-results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 