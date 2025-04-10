import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { quizResultService } from '@/utils/weaviate/dataService';

export async function POST(request: Request) {
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
    console.log(`Creating sample quiz results for user ${userId}`);
    
    // Create sample conversation IDs (use real conversation IDs if they exist in your system)
    const conversationId = user.id.toString(); // Use the user ID as the conversation ID
    
    // Sample quiz results
    const sampleQuizResults = [
      {
        userId,
        quizId: 'math-quiz-123456',
        conversationId: conversationId,
        score: 8,
        totalQuestions: 10,
        responses: [
          {
            questionId: 0,
            question: "What is 2+2?",
            selectedOptionIndex: 2,
            correctOptionIndex: 2,
            isCorrect: true
          },
          {
            questionId: 1,
            question: "What is 5*5?",
            selectedOptionIndex: 1,
            correctOptionIndex: 1,
            isCorrect: true
          }
        ],
        feedback: "Great job on the math quiz! You demonstrated strong arithmetic skills.",
        learningOption: "understanding",
        strengthAreas: ["Basic Arithmetic", "Problem Solving"],
        weaknessAreas: ["Complex Equations"],
        timestamp: new Date()
      },
      {
        userId,
        quizId: 'science-quiz-789012',
        conversationId: conversationId,
        score: 7,
        totalQuestions: 10,
        responses: [
          {
            questionId: 0,
            question: "What is the chemical symbol for water?",
            selectedOptionIndex: 3,
            correctOptionIndex: 3,
            isCorrect: true
          },
          {
            questionId: 1,
            question: "What planet is closest to the sun?",
            selectedOptionIndex: 0,
            correctOptionIndex: 0,
            isCorrect: true
          }
        ],
        feedback: "Good work on the science quiz! Your knowledge of basic chemistry is solid.",
        learningOption: "memorizing",
        strengthAreas: ["Chemistry Basics", "Solar System"],
        weaknessAreas: ["Physics Concepts"],
        timestamp: new Date()
      }
    ];
    
    // Save sample quiz results to Weaviate
    const savedIds = [];
    for (const result of sampleQuizResults) {
      const id = await quizResultService.create(result);
      savedIds.push(id);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Created ${savedIds.length} sample quiz results`,
      ids: savedIds
    });
  } catch (error) {
    console.error('Error in seed quiz results API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to seed quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 