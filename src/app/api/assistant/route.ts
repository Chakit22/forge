import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { Message } from '../memoagent';

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

// Hardcoded assistant IDs
const FORGE_AI_ASSISTANT_ID = 'asst_lUOM3FHlVOfvdjUnlk4VTiFJ';
const FORGE_AI_QUIZ_ASSISTANT_ID = 'asst_0llOZbtpQwQoKWwGzP00CPFG';

export async function POST(request: Request) {
  console.log('Assistant API endpoint triggered');
  
  try {
    const requestData = await request.json();
    const { messages, assistant_type, attachments } = requestData;
    
    console.log('Request data:', { 
      messagesCount: messages?.length || 0,
      assistant_type,
      attachmentsCount: attachments?.length || 0
    });
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required and must be an array' }, 
        { status: 400 }
      );
    }

    // Determine which assistant to use
    const assistantId = assistant_type === 'quiz' 
      ? FORGE_AI_QUIZ_ASSISTANT_ID 
      : FORGE_AI_ASSISTANT_ID;
    
    const response = await runAssistantConversation(messages, assistantId, attachments);
    
    return NextResponse.json({ 
      message: response 
    });
  } catch (error) {
    console.error('Error in assistant API route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

async function runAssistantConversation(
  messages: Message[],
  assistantId: string,
  attachments?: any[]
): Promise<string> {
  const openai = getOpenAIClient();
  console.log(`Using assistant ID: ${assistantId}`);
  
  try {
    // 1. Create a thread
    const thread = await openai.beta.threads.create();
    console.log(`Thread created with ID: ${thread.id}`);
    
    // 2. Add messages to the thread
    for (const message of messages) {
      if (message.role === 'user' || message.role === 'assistant') {
        await openai.beta.threads.messages.create(
          thread.id,
          {
            role: message.role,
            content: message.content,
          }
        );
      }
    }

    // 3. Process file attachments if any
    let fileIds: string[] = [];
    if (attachments && attachments.length > 0) {
      fileIds = await processAttachments(openai, attachments);
      console.log(`Processed ${fileIds.length} attachments`);
    }
    
    // 4. Run the assistant on the thread
    let run = await openai.beta.threads.runs.create(
      thread.id,
      {
        assistant_id: assistantId,
        ...(fileIds.length > 0 && { file_ids: fileIds }),
        ...(assistantId === FORGE_AI_QUIZ_ASSISTANT_ID && { 
          instructions: `Please create a quiz based on the conversation. Return your response in JSON format with this exact structure:
{
  "title": "Quiz Title",
  "description": "Brief description of the quiz",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Explanation of the correct answer"
    }
    // more questions...
  ]
}`
        }),
      }
    );
    
    // 5. Wait for the run to complete
    while (run.status === 'queued' || run.status === 'in_progress') {
      console.log(`Run status: ${run.status}`);
      // Wait for a second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    // 6. Check run status
    if (run.status !== 'completed') {
      console.error(`Run failed with status: ${run.status}`);
      return `An error occurred while processing your request. Status: ${run.status}`;
    }
    
    // 7. Retrieve messages from the thread
    const responseMessages = await openai.beta.threads.messages.list(thread.id);
    
    // 8. Get the latest assistant message
    const latestMessage = responseMessages.data
      .filter(msg => msg.role === 'assistant')
      .sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
    
    if (!latestMessage) {
      return "No response was generated.";
    }
    
    // Get the text content from the message
    const responseText = latestMessage.content
      .filter(content => content.type === 'text')
      .map(content => (content.type === 'text' ? content.text.value : ''))
      .join('\n');
    
    console.log('Response from assistant:', responseText.substring(0, 200) + '...');
    
    // For quiz assistant, try to parse JSON
    if (assistantId === FORGE_AI_QUIZ_ASSISTANT_ID) {
      try {
        // First, try to find JSON with regex
        const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const jsonContent = jsonMatch[0];
          console.log('Found JSON object in response:', jsonContent.substring(0, 100) + '...');
          
          // Validate JSON structure before returning
          try {
            const parsedJson = JSON.parse(jsonContent);
            // Check for both direct format and nested format
            if (parsedJson.title && 
                parsedJson.description && 
                Array.isArray(parsedJson.questions) && 
                parsedJson.questions.length > 0) {
              console.log(`Found valid quiz with ${parsedJson.questions.length} questions`);
              return JSON.stringify(parsedJson); // Return clean JSON string
            } 
            // Check for nested format inside 'quiz' property
            else if (parsedJson.quiz && 
                    parsedJson.quiz.title && 
                    parsedJson.quiz.description && 
                    Array.isArray(parsedJson.quiz.questions) && 
                    parsedJson.quiz.questions.length > 0) {
              console.log(`Found valid nested quiz with ${parsedJson.quiz.questions.length} questions`);
              return JSON.stringify(parsedJson.quiz); // Return only the quiz object as JSON
            } else {
              console.warn('JSON found but missing required quiz fields');
            }
          } catch (parseError) {
            console.error('Failed to parse extracted JSON:', parseError);
          }
        }
        
        // If no JSON or invalid JSON found with regex, try to clean the response
        // Sometimes responses contain markdown or additional text
        let cleanedResponse = responseText;
        
        // Remove markdown code fences if present
        cleanedResponse = cleanedResponse.replace(/```json\s+([\s\S]*?)```/g, '$1');
        cleanedResponse = cleanedResponse.replace(/```\s+([\s\S]*?)```/g, '$1');
        
        // Try to extract just the JSON part if there's other text
        const jsonStartIndex = cleanedResponse.indexOf('{');
        const jsonEndIndex = cleanedResponse.lastIndexOf('}');
        
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
          
          try {
            const parsedJson = JSON.parse(cleanedResponse);
            if (parsedJson.title && 
                parsedJson.description && 
                Array.isArray(parsedJson.questions) && 
                parsedJson.questions.length > 0) {
              console.log(`Found valid quiz after cleaning with ${parsedJson.questions.length} questions`);
              return JSON.stringify(parsedJson); // Return clean JSON string
            }
            // Check for nested format inside 'quiz' property
            else if (parsedJson.quiz && 
                    parsedJson.quiz.title && 
                    parsedJson.quiz.description && 
                    Array.isArray(parsedJson.quiz.questions) && 
                    parsedJson.quiz.questions.length > 0) {
              console.log(`Found valid nested quiz after cleaning with ${parsedJson.quiz.questions.length} questions`);
              return JSON.stringify(parsedJson.quiz); // Return only the quiz object as JSON
            }
          } catch (parseError) {
            console.error('Failed to parse cleaned JSON');
          }
        }
        
        console.log('Could not find valid quiz JSON in the response, returning raw response');
      } catch (jsonError) {
        console.error('Error handling JSON from assistant response:', jsonError);
      }
    }
    
    return responseText;
  } catch (error) {
    console.error('Error running assistant conversation:', error);
    return 'Sorry, there was an error processing your request with the assistant.';
  }
}

// Process file attachments and return file IDs
async function processAttachments(openai: OpenAI, attachments: any[]): Promise<string[]> {
  const fileIds: string[] = [];
  
  for (const attachment of attachments) {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(attachment.content, 'base64');
      
      // Create a file with OpenAI
      const file = await openai.files.create({
        file: buffer,
        purpose: 'assistants',
      });
      
      fileIds.push(file.id);
      console.log(`File uploaded: ${file.id}`);
    } catch (error) {
      console.error(`Error uploading file: ${attachment.name}`, error);
    }
  }
  
  return fileIds;
} 