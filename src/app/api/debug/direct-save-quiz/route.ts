import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { quizResultService } from '@/utils/weaviate/dataService';
import { getWeaviateClient } from '@/utils/weaviate/client';
import { v4 as uuidv4 } from 'uuid';

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
    
    // Get request body if provided
    let requestData = {};
    try {
      requestData = await request.json();
      console.log('Request data provided:', requestData);
    } catch (e) {
      console.log('No request data provided, using default test data');
    }
    
    const userId = user.id.toString();
    const timestamp = new Date();
    const quizId = `distributed-ledger-technology-and-cryptography-quiz-${Date.now()}`;
    
    // Create a test quiz result matching the format from the user's sample
    const testQuizResult = {
      quizId: quizId,
      userId: userId,
      conversationId: requestData?.conversationId || "54", // Use the specified conversation ID from the sample
      score: 1,
      totalQuestions: 5,
      responses: [
        {
          questionId: 0,
          question: "What is the primary purpose of using Distributed Ledger Technology in inventory management?",
          selectedOptionIndex: 1,
          correctOptionIndex: 0,
          isCorrect: false
        },
        {
          questionId: 1,
          question: "How do cryptographic hash functions contribute to data integrity?",
          selectedOptionIndex: 2,
          correctOptionIndex: 1,
          isCorrect: false
        },
        {
          questionId: 2,
          question: "What is the role of Merkle trees in ensuring data consistency?",
          selectedOptionIndex: 1,
          correctOptionIndex: 1,
          isCorrect: true
        },
        {
          questionId: 3,
          question: "What advantage do RSA digital signatures provide in maintaining secure records?",
          selectedOptionIndex: 0,
          correctOptionIndex: 2,
          isCorrect: false
        },
        {
          questionId: 4,
          question: "Which mnemonic helps to remember the purpose of Distributed Ledger Technology (DLT)?",
          selectedOptionIndex: 2,
          correctOptionIndex: 0,
          isCorrect: false
        }
      ],
      feedback: "You've made a start by tackling this quiz, and that's the first step towards mastery. Although the score might not reflect your understanding yet, it's important to focus on what you can learn from this experience. You correctly answered one question, which shows that you have some foundational knowledge to build upon. Take this opportunity to pinpoint the areas where you need to strengthen your recall and understanding, especially when it comes to technical concepts like Distributed Ledger Technology and cryptographic functions.",
      learningOption: "memorizing",
      strengthAreas: ["Merkle Trees", "Data Consistency"],
      weaknessAreas: ["Distributed Ledger Technology", "Cryptographic Hash Functions", "RSA Digital Signatures"],
      timestamp: timestamp.toISOString()
    };
    
    console.log('Directly saving test quiz result to Weaviate');
    
    // Try using both methods to save to Weaviate
    try {
      // 1. Use quizResultService (which might be having issues)
      const quizResultId = await quizResultService.create(testQuizResult);
      console.log(`Test quiz result saved via service with ID: ${quizResultId}`);
      
      // 2. ALSO try direct save using Weaviate client
      // Generate a new ID for the direct save
      const directId = uuidv4();
      console.log(`Trying direct save with ID: ${directId}`);
      
      // Create the object in a format that should be compatible with both frontend and backend
      const client = getWeaviateClient();
      
      // Create an object that's formatted exactly like how the frontend expects it
      const frontendFormatObject = {
        id: directId,
        quiz_id: quizId,
        user_id: parseInt(userId),
        conversation_id: requestData?.conversationId || "54",
        score: 1,
        total_questions: 5,
        feedback: "This is a directly created object with frontend-compatible format.",
        learning_option: "memorizing",
        strength_areas: ["Direct Save", "Frontend Format"],
        weakness_areas: ["Data Transformation"],
        created_at: timestamp.toISOString()
      };
      
      // Now convert this to a format Weaviate can store
      const weaviateFormatObject = {
        userId: userId,
        quizId: quizId,
        conversationId: frontendFormatObject.conversation_id,
        score: frontendFormatObject.score,
        totalQuestions: frontendFormatObject.total_questions,
        feedback: frontendFormatObject.feedback,
        learningOption: frontendFormatObject.learning_option,
        strengthAreas: frontendFormatObject.strength_areas,
        weaknessAreas: frontendFormatObject.weakness_areas,
        timestamp: frontendFormatObject.created_at,
        // Also include responses array
        responses: testQuizResult.responses
      };
      
      // Save directly to Weaviate
      await client.data
        .creator()
        .withClassName('QuizResult')
        .withId(directId)
        .withProperties(weaviateFormatObject)
        .do();
      
      console.log(`Direct save successful with ID: ${directId}`);
      
      // Now try to read it back to verify it was saved correctly
      let savedResult = null;
      let directSavedResult = null;
      try {
        // Try to fetch both results
        const results = await quizResultService.getByUserId(userId);
        savedResult = results.find(r => r.id === quizResultId);
        directSavedResult = results.find(r => r.id === directId);
        
        console.log(`Found standard saved result? ${!!savedResult}`);
        console.log(`Found direct saved result? ${!!directSavedResult}`);
      } catch (readError) {
        console.error('Error reading back the saved test quiz results:', readError);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Created test quiz results`,
        standard_id: quizResultId,
        direct_id: directId,
        savedResult,
        directSavedResult
      });
    } catch (saveError) {
      console.error('Error saving test quiz result:', saveError);
      
      if (saveError instanceof Error) {
        console.error('Error details:', saveError.message);
        console.error('Error stack:', saveError.stack);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to save test quiz result',
          details: saveError instanceof Error ? saveError.message : 'Unknown error',
          quizResultData: testQuizResult
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in direct save quiz debug API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to run direct save quiz debug',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 