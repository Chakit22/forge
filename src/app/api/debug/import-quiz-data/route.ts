import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/api/actions';
import { getWeaviateClient } from '@/utils/weaviate/client';

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
    
    // Get the sample data from the request, or use the default
    let sampleData;
    try {
      const requestBody = await request.json();
      sampleData = requestBody.data;
      console.log('Using provided sample data');
    } catch (e) {
      console.log('No valid JSON data provided, using default sample data');
      
      // Use the data sample provided by the user
      sampleData = {
        uuid: "249c01e8-e63b-4d9c-99c2-bfe48e69a061",
        metadata: {
          creationTime: "2025-04-10T01:06:27.703Z"
        },
        properties: {
          totalQuestions: 5,
          weaknessAreas: [
            "Distributed Ledger Technology",
            "Cryptographic Hash Functions",
            "RSA Digital Signatures"
          ],
          conversationId: "54",
          userId: "29",
          score: 1,
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
              selectedOptionIndex: 0,
              correctOptionIndex: 2,
              isCorrect: false,
              questionId: 3,
              question: "What advantage do RSA digital signatures provide in maintaining secure records?"
            },
            {
              questionId: 4,
              question: "Which mnemonic helps to remember the purpose of Distributed Ledger Technology (DLT)?",
              selectedOptionIndex: 2,
              correctOptionIndex: 0,
              isCorrect: false
            }
          ],
          feedback: "You've made a start by tackling this quiz, and that's the first step towards mastery. Although the score might not reflect your understanding yet, it's important to focus on what you can learn from this experience. You correctly answered one question, which shows that you have some foundational knowledge to build upon. Take this opportunity to pinpoint the areas where you need to strengthen your recall and understanding, especially when it comes to technical concepts like Distributed Ledger Technology and cryptographic functions.\n\nFor the questions you missed, consider spending more time memorizing the key concepts and their applications. Flashcards could be a helpful tool for memorizing definitions and functions, such as the primary purposes of DLT and cryptographic hash functions. Repetition and active recall are your best friends when it comes to memorization. You might also benefit from creating mnemonic devices for remembering complex ideas, particularly for the mnemonic question related to DLT. Mnemonics are powerful memory aids that can help you recall information more easily.\n\nAs you continue your studies, focus on breaking down each concept into smaller, manageable parts and then gradually build up your understanding. Regularly revisiting these concepts will help reinforce them in your memory. Also, consider discussing these topics with peers or instructors, as explaining what you've learned to others can enhance your understanding and retention. Keep pushing forward; each attempt is a step closer to achieving your learning goals.",
          learningOption: "memorizing",
          strengthAreas: [
            "Merkle Trees",
            "Data Consistency"
          ],
          timestamp: "2025-04-10T01:06:27.527Z",
          quizId: "distributed-ledger-technology-and-cryptography-quiz-1744247187527"
        }
      };
    }
    
    // Process the data to match our expected format
    
    // Get the user ID - use the current user's ID or the one from the sample
    const userId = user.id.toString();
    
    // Create a properly formatted object for Weaviate
    const formattedData = {
      userId: userId, // Use current user's ID for testing
      quizId: sampleData.properties.quizId,
      conversationId: sampleData.properties.conversationId,
      score: sampleData.properties.score,
      totalQuestions: sampleData.properties.totalQuestions,
      responses: sampleData.properties.responses,
      feedback: sampleData.properties.feedback,
      learningOption: sampleData.properties.learningOption,
      strengthAreas: sampleData.properties.strengthAreas,
      weaknessAreas: sampleData.properties.weaknessAreas,
      timestamp: sampleData.properties.timestamp
    };
    
    console.log('Importing formatted quiz data to Weaviate');
    
    // Get Weaviate client
    const client = getWeaviateClient();
    
    // Import the data directly
    const importedId = await client.data
      .creator()
      .withClassName('QuizResult')
      .withProperties(formattedData)
      .do();
    
    console.log(`Imported quiz data with ID: ${importedId}`);
    
    // Extract the ID from the returned object, or use the object directly if it's already a string
    const id = typeof importedId === 'object' && importedId !== null 
      ? importedId.id || String(importedId)
      : importedId;
    
    // Verify the import by retrieving the object
    const importedObject = await client.data
      .getterById()
      .withId(id)
      .withClassName('QuizResult')
      .do();
    
    return NextResponse.json({ 
      success: true,
      message: 'Sample quiz data imported successfully',
      importedId: id,
      importedObject
    });
  } catch (error) {
    console.error('Error importing sample quiz data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to import sample quiz data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 