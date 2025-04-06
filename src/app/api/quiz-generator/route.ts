import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Message } from '../memoagent';
import type { ChatCompletionMessageParam } from 'openai/resources';

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

// Expected JSON format for quiz questions
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export async function POST(request: Request) {
  console.log('Quiz generator API endpoint triggered');
  
  try {
    const requestData = await request.json();
    const { messages, learning_option } = requestData;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' }, 
        { status: 400 }
      );
    }

    // Step 1: Summarize the conversation using Assistant 1
    const conversationSummary = await summarizeConversation(messages, learning_option);
    
    // Step 2: Generate quiz questions using Assistant 2
    const quizData = await generateQuizQuestions(conversationSummary, learning_option);
    
    return NextResponse.json({ quiz: quizData });
  } catch (error) {
    console.error('Error in quiz generator API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate quiz',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// First assistant summarizes the conversation
async function summarizeConversation(messages: Message[], learningOption: string): Promise<string> {
  const openai = getOpenAIClient();
  
  // Create system message for the summarizer
  const systemMessage = `You are an expert educational content summarizer. 
  Your task is to analyze the conversation and identify the key concepts, facts, and knowledge points discussed.
  Focus on extracting information that would be valuable for creating quiz questions.
  Be comprehensive but concise.
  Target your summary for the ${learningOption} learning mode.`;
  
  // Convert to OpenAI message format
  const apiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }))
  ];
  
  // Get summary from OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: apiMessages,
    temperature: 0.3,
    max_tokens: 1000,
  });
  
  return response.choices[0]?.message?.content || '';
}

// Second assistant generates quiz questions in JSON format
async function generateQuizQuestions(conversationSummary: string, learningOption: string): Promise<Quiz> {
  const openai = getOpenAIClient();
  
  // Create system message for the quiz generator
  const systemMessage = `You are an expert quiz creator.
  Your task is to create 5 multiple-choice quiz questions based on the conversation summary provided.
  You MUST return ONLY valid JSON that matches this exact format:
  
  {
    "title": "Quiz title related to the topic",
    "description": "Brief description of what this quiz covers",
    "questions": [
      {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswerIndex": 0,
        "explanation": "Explanation of why this answer is correct"
      }
    ]
  }
  
  Each question should have 4 options. The correctAnswerIndex is 0-based (0 means the first option is correct).
  Make challenging but fair questions appropriate for the ${learningOption} learning mode.
  DO NOT include any text before or after the JSON. Return ONLY the JSON object.`;
  
  // Convert to OpenAI message format
  const apiMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: `Here is a summary of a learning conversation. Please create a quiz based on this content:\n\n${conversationSummary}` }
  ];
  
  // Get quiz questions from OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: apiMessages,
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });
  
  const responseText = response.choices[0]?.message?.content || '';
  
  try {
    // Parse the JSON response
    const quizData = JSON.parse(responseText) as Quiz;
    
    // Validate the response structure
    if (!quizData.title || !quizData.description || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz format returned from AI');
    }
    
    // Ensure each question has the required fields
    quizData.questions.forEach((question, index) => {
      if (!question.question || 
          !Array.isArray(question.options) || 
          question.options.length < 2 ||
          typeof question.correctAnswerIndex !== 'number' ||
          !question.explanation) {
        throw new Error(`Question ${index + 1} has invalid format`);
      }
    });
    
    return quizData;
  } catch (error) {
    console.error('Error parsing quiz JSON:', error);
    console.error('Received response:', responseText);
    throw new Error('Failed to generate valid quiz questions');
  }
} 