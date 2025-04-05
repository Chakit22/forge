import { NextResponse } from 'next/server';
import { generateChatCompletion, FileAttachment } from '../memoagent';

export async function POST(request: Request) {
  console.log('API route triggered');
  
  try {
    // Log environment variables (without the actual key)
    console.log('Environment variables available:', {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
    });

    const requestData = await request.json();
    const { messages, method, attachments } = requestData;
    
    // Enhanced logging
    console.log('Request data:', { 
      messagesCount: messages?.length || 0,
      method,
      attachmentsCount: attachments?.length || 0
    });
    
    // More detailed attachment logging
    if (attachments && attachments.length > 0) {
      console.log('Attachment details:');
      attachments.forEach((attachment: FileAttachment, index: number) => {
        console.log(`Attachment ${index + 1}/${attachments.length}:`);
        console.log(`- Name: ${attachment.name || 'Unknown'}`);
        console.log(`- Type: ${attachment.type || 'Unknown'}`);
        console.log(`- Content present: ${attachment.content ? 'Yes' : 'No'}`);
        if (attachment.content) {
          console.log(`- Content length: ${attachment.content.length} characters`);
          console.log(`- Content preview: ${attachment.content.substring(0, 20)}...`);
        } else {
          console.log('- Content is missing or empty');
        }
      });
    } else {
      console.log('No attachments in the request');
    }
    
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format');
      return NextResponse.json(
        { error: 'Messages are required and must be an array' }, 
        { status: 400 }
      );
    }

    // Check if attachments are properly formatted
    if (attachments) {
      if (!Array.isArray(attachments)) {
        console.error('Attachments must be an array');
        return NextResponse.json(
          { error: 'Attachments must be an array' },
          { status: 400 }
        );
      }
      
      // Validate each attachment
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        if (!attachment.name || !attachment.type || !attachment.content) {
          console.error(`Attachment at index ${i} is missing required fields`);
          return NextResponse.json(
            { error: `Attachment at index ${i} is missing required fields (name, type, or content)` },
            { status: 400 }
          );
        }
      }
    }
    
    const response = await generateChatCompletion(messages, method, attachments);
    console.log('Got response from OpenAI');
    
    return NextResponse.json({ 
      message: response 
    });
  } catch (error) {
    console.error('Error in chat API route:', error);
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 