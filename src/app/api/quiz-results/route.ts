import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { QuizQuestion } from '../quiz-generator/route';
import { quizResultService } from '@/utils/weaviate/dataService';

// Initialize OpenAI client
const getOpenAIClient = () => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    return new OpenAI({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error('Error creating OpenAI client:', error);
    throw error;
  }
};

// Interface for quiz results
export interface QuizResult {
  quizId: string;
  userId: number;
  conversationId: string;
  score: number;
  totalQuestions: number;
  responses: {
    questionId: number;
    question: string;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    isCorrect: boolean;
  }[];
  feedback: string;
  learningOption: string;
  strengthAreas: string[];
  weaknessAreas: string[];
  createdAt: string;
}

export interface QuizResultRequest {
  quizTitle: string;
  userId: number;
  score: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  selectedOptions: number[];
  learningOption: string;
  conversationId: string;
}

export async function POST(request: Request) {
  try {
    const requestData: QuizResultRequest = await request.json();
    const { 
      quizTitle, 
      userId, 
      score, 
      totalQuestions, 
      questions, 
      selectedOptions,
      learningOption,
      conversationId
    } = requestData;
    
    console.log('Received quiz result request:', {
      quizTitle,
      userId,
      score,
      totalQuestions,
      questionsCount: questions?.length || 0,
      selectedOptionsCount: selectedOptions?.length || 0,
      learningOption,
      conversationId: conversationId || 'MISSING'
    });
    
    if (!userId || !questions || !selectedOptions || selectedOptions.length !== questions.length) {
      console.error('Invalid quiz result data:', {
        hasUserId: !!userId,
        hasQuestions: !!questions,
        questionsLength: questions?.length || 0,
        hasSelectedOptions: !!selectedOptions,
        selectedOptionsLength: selectedOptions?.length || 0
      });
      
      return NextResponse.json(
        { error: 'Invalid quiz result data' }, 
        { status: 400 }
      );
    }

    // Process responses
    const responses = questions.map((question, index) => ({
      questionId: index,
      question: question.question,
      selectedOptionIndex: selectedOptions[index],
      correctOptionIndex: question.correctAnswerIndex,
      isCorrect: selectedOptions[index] === question.correctAnswerIndex
    }));

    // Generate feedback using OpenAI
    const feedback = await generateFeedback(responses, score, totalQuestions, learningOption);
    
    // Identify strengths and weaknesses
    const strengthsAndWeaknesses = await identifyStrengthsAndWeaknesses(responses, questions);
    
    // Save to database
    const result = await saveQuizResult({
      quizId: generateQuizId(quizTitle),
      userId,
      conversationId,
      score,
      totalQuestions,
      responses,
      feedback,
      learningOption,
      strengthAreas: strengthsAndWeaknesses.strengths,
      weaknessAreas: strengthsAndWeaknesses.weaknesses,
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error in quiz results API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Generate a unique ID for the quiz
function generateQuizId(quizTitle: string): string {
  return `${quizTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
}

// Generate feedback using OpenAI
async function generateFeedback(
  responses: QuizResult['responses'], 
  score: number, 
  totalQuestions: number,
  learningOption: string
): Promise<string> {
  const openai = getOpenAIClient();
  
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  const incorrectAnswers = responses.filter(r => !r.isCorrect);
  
  // Create prompt for OpenAI
  const systemMessage = `You are an expert educational feedback provider.
  Your task is to provide constructive, personalized feedback on a quiz performance.
  Be encouraging but honest. Highlight areas of strength and suggest improvements for areas of weakness.
  Keep your feedback concise (maximum 3 paragraphs).
  Adapt your feedback for the ${learningOption} learning mode.`;
  
  const userMessage = `
  The student scored ${score} out of ${totalQuestions} (${Math.round((score/totalQuestions) * 100)}%).
  
  Questions they got wrong:
  ${incorrectAnswers.map(r => `- ${r.question}`).join('\n')}
  
  Based on this performance, provide personalized feedback to help the student improve.
  `;
  
  // Convert to OpenAI message format
  const apiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ];
  
  // Get feedback from OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: apiMessages,
    temperature: 0.7,
    max_tokens: 500,
  });
  
  return response.choices[0]?.message?.content || 'Great job on completing the quiz!';
}

// Identify strengths and weaknesses
async function identifyStrengthsAndWeaknesses(
  responses: QuizResult['responses'],
  questions: QuizQuestion[]
): Promise<{ strengths: string[], weaknesses: string[] }> {
  const openai = getOpenAIClient();
  
  const correctResponses = responses.filter(r => r.isCorrect);
  const incorrectResponses = responses.filter(r => !r.isCorrect);
  
  // Create system message
  const systemMessage = `You are an expert at identifying knowledge patterns.
  Analyze the quiz questions a student got right and wrong.
  Identify 2-3 topic areas or skills they seem to understand well (strengths) 
  and 2-3 areas they need to improve (weaknesses).
  Return your analysis as JSON in this exact format:
  {
    "strengths": ["Topic/Skill 1", "Topic/Skill 2", "Topic/Skill 3"],
    "weaknesses": ["Topic/Skill 1", "Topic/Skill 2", "Topic/Skill 3"]
  }
  Keep each topic/skill name concise (2-5 words).
  `;
  
  // Create prompt with the questions
  const correctQuestionsPrompt = correctResponses.map(r => {
    const question = questions.find((q, i) => i === r.questionId);
    return question ? `- Question: ${question.question}\n  Explanation: ${question.explanation}` : '';
  }).join('\n');
  
  const incorrectQuestionsPrompt = incorrectResponses.map(r => {
    const question = questions.find((q, i) => i === r.questionId);
    return question ? `- Question: ${question.question}\n  Explanation: ${question.explanation}` : '';
  }).join('\n');
  
  const userMessage = `
  Questions the student got CORRECT:
  ${correctQuestionsPrompt || "None"}
  
  Questions the student got INCORRECT:
  ${incorrectQuestionsPrompt || "None"}
  
  Based on these results, identify strengths and weaknesses.
  `;
  
  // Convert to OpenAI message format
  const apiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ];
  
  // Get analysis from OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: apiMessages,
    temperature: 0.3,
    max_tokens: 500,
    response_format: { type: "json_object" }
  });
  
  try {
    const responseText = response.choices[0]?.message?.content || '';
    const result = JSON.parse(responseText) as { strengths: string[], weaknesses: string[] };
    
    return {
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || []
    };
  } catch (error) {
    console.error('Error parsing strengths/weaknesses:', error);
    return {
      strengths: [],
      weaknesses: []
    };
  }
}

// Save quiz result to database using Weaviate
async function saveQuizResult(result: QuizResult) {
  try {
    console.log('Starting to save quiz result to Weaviate');
    console.log('Quiz result data to save:', JSON.stringify({
      ...result,
      responses: result.responses ? `${result.responses.length} responses` : 'No responses',
      feedback: result.feedback?.substring(0, 50) + '...',
    }));
    
    // Format data for Weaviate
    const weaviateQuizResult = {
      quizId: result.quizId,
      userId: result.userId.toString(),
      conversationId: result.conversationId,
      score: result.score,
      totalQuestions: result.totalQuestions,
      responses: result.responses,
      feedback: result.feedback,
      learningOption: result.learningOption,
      strengthAreas: result.strengthAreas,
      weaknessAreas: result.weaknessAreas,
      timestamp: new Date(result.createdAt)
    };
    
    console.log('Data prepared for Weaviate. Calling quizResultService.create()');
    
    // Save to Weaviate
    const quizResultId = await quizResultService.create(weaviateQuizResult);
    
    console.log(`Quiz result saved successfully with ID: ${quizResultId}`);
    
    // Return the saved result
    return {
      id: quizResultId,
      ...weaviateQuizResult,
      // Convert fields back to the expected format for the response
      user_id: result.userId,
      quiz_id: result.quizId,
      total_questions: result.totalQuestions,
      strength_areas: result.strengthAreas,
      weakness_areas: result.weaknessAreas,
      learning_option: result.learningOption,
      created_at: weaviateQuizResult.timestamp instanceof Date 
        ? weaviateQuizResult.timestamp.toISOString() 
        : weaviateQuizResult.timestamp
    };
  } catch (error) {
    console.error('Error saving quiz result to Weaviate:', error);
    // Check if it's an error we can extract more info from
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Failed to save quiz result: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 