import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { createClient } from '@/utils/supabase/server';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { QuizQuestion } from '../quiz-generator/route';

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
      learningOption
    } = requestData;
    
    if (!userId || !questions || !selectedOptions || selectedOptions.length !== questions.length) {
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
  
  // Calculate incorrect answers instead of unused correctAnswers
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

// Save quiz result to database
async function saveQuizResult(quizResult: QuizResult) {
  const supabase = await createClient();
  
  // First save the main quiz result
  const { data: resultData, error: resultError } = await supabase
    .from('quiz_results')
    .insert({
      quiz_id: quizResult.quizId,
      user_id: quizResult.userId,
      score: quizResult.score,
      total_questions: quizResult.totalQuestions,
      feedback: quizResult.feedback,
      learning_option: quizResult.learningOption,
      strength_areas: quizResult.strengthAreas,
      weakness_areas: quizResult.weaknessAreas
    })
    .select()
    .single();
  
  if (resultError) {
    console.error('Error saving quiz result:', resultError);
    throw new Error(`Failed to save quiz result: ${resultError.message}`);
  }
  
  // Then save each response
  for (const response of quizResult.responses) {
    const { error: responseError } = await supabase
      .from('quiz_responses')
      .insert({
        result_id: resultData.id,
        question_id: response.questionId,
        question_text: response.question,
        selected_option_index: response.selectedOptionIndex,
        correct_option_index: response.correctOptionIndex,
        is_correct: response.isCorrect
      });
    
    if (responseError) {
      console.error('Error saving quiz response:', responseError);
      // We'll continue saving other responses even if one fails
    }
  }
  
  return resultData;
} 