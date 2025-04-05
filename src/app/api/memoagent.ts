import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// File attachment type
export type FileAttachment = {
  name: string;
  type: string;
  content: string; // base64 content
  // No id or size needed for the backend processing
};

// Initialize OpenAI client with better error handling
const getOpenAIClient = () => {
  console.log('Initializing OpenAI client');
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(key => !key.includes('KEY')));
      throw new Error('OpenAI API key is missing. Please check your environment configuration.');
    }
    
    console.log('OpenAI API key is present, length:', apiKey.length);
    
    // Create client with hard-coded key as fallback if nothing else works
    return new OpenAI({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error('Error creating OpenAI client:', error);
    throw error;
  }
};

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Define interface for row data
interface RowData {
  [key: string]: string | number | boolean;
}

/**
 * Extract text from a PDF using a dynamic import of pdf-parse
 */
const extractPdfText = async (buffer: Buffer): Promise<string> => {
  try {
    console.log('Attempting to extract PDF text using pdf-parse...');
    
    try {
      // Import pdf-parse directly from the library path to avoid test mode
      // Use dynamic import that's ESM compatible
      const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      
      // First try with the raw buffer
      try {
        const data = await pdfParse(buffer, { max: 0 });
        
        if (data && data.text) {
          console.log(`Successfully extracted PDF text. Length: ${data.text.length} chars`);
          return data.text;
        }
      } catch (error) {
        console.log('First PDF parse attempt failed, trying with different options...', error);
      }
      
      // If the first attempt failed, try with more specific options
      const options = {
        max: 0, // No page limit
        pagerender: undefined, // Don't use default renderer
        version: 'v1.10.100', // Specify exact version
      };
      
      const data = await pdfParse(buffer, options);
      
      if (data && data.text) {
        console.log(`Successfully extracted PDF text with options. Length: ${data.text.length} chars`);
        return data.text;
      } else {
        console.log('PDF parsed but no text content found');
        return '[PDF document detected but no text content could be extracted]';
      }
    } catch (pdfError) {
      console.error('Error using pdf-parse:', pdfError);
      
      // Fallback to basic PDF info
      // For debugging, check the first few bytes of the PDF to confirm it's valid
      const pdfHeader = buffer.slice(0, 5).toString('utf-8');
      const isPdfValid = pdfHeader.includes('%PDF');
      
      console.log(`PDF validation: Valid PDF header: ${isPdfValid}, First bytes: ${pdfHeader}`);
      
      // Get file size in KB
      const fileSizeKB = Math.round(buffer.length / 1024);
      
      // Return basic info about the PDF since we couldn't extract text
      return `[PDF Document. Size: ${fileSizeKB}KB. Full text extraction failed. Analysis based on file name: ${isPdfValid ? 'This appears to be a valid PDF.' : 'This file may not be a valid PDF.'}]`;
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    return `[Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
};

/**
 * Helper function to extract text from CSV data
 */
const extractCSV = async (buffer: Buffer): Promise<string> => {
  try {
    // Simple CSV parsing
    const csvString = buffer.toString('utf-8');
    const lines = csvString.split(/\r?\n/);
    const rows: string[][] = [];
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      // Simple CSV parsing - this handles basic CSVs but doesn't account for all edge cases
      // like quoted fields with commas inside
      const values = line.split(',').map(value => value.trim());
      rows.push(values);
    }
    
    // Format the CSV data as a readable string
    let result = '';
    
    // If we have a header row
    if (rows.length > 0) {
      const headers = rows[0];
      result += `Headers: ${headers.join(', ')}\n\n`;
      
      // Process data rows
      for (let i = 1; i < rows.length; i++) {
        result += `Row ${i}: `;
        const rowData = rows[i];
        
        // Create a mapping of header to value if possible
        if (headers.length === rowData.length) {
          const rowObj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            rowObj[header] = rowData[idx];
          });
          result += JSON.stringify(rowObj);
        } else {
          // Just output the values if headers don't match
          result += rowData.join(', ');
        }
        result += '\n';
      }
    } else {
      // No data
      result = '[No data found in CSV file]';
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return '[Error parsing CSV file]';
  }
};

/**
 * Helper function to extract text from Excel file
 */
const extractExcel = (buffer: Buffer): string => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let result = '';
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      result += `Sheet: ${sheetName}\n`;
      // Use type assertion for the row data
      (jsonData as unknown[]).forEach((rowData, index) => {
        const row = rowData as RowData;
        result += `Row ${index + 1}: ${JSON.stringify(row)}\n`;
      });
      result += '\n';
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting Excel content:', error);
    return '[Error extracting Excel content]';
  }
};

// Helper function to extract text from different file types
const extractTextFromBase64 = async (base64Data: string, fileType: string): Promise<string> => {
  try {
    console.log(`Extracting text from file type: ${fileType}, content length: ${base64Data?.length || 0}`);
    
    if (!base64Data) {
      console.error('Base64 data is empty or missing');
      return "[Error: File content is empty or missing]";
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Handle different file types
    if (fileType.startsWith('text/')) {
      // Text files can be decoded directly
      console.log('Processing as text file');
      const text = buffer.toString('utf-8');
      console.log(`Decoded text length: ${text.length}`);
      return text;
    } 
    // PDF files
    else if (fileType === 'application/pdf') {
      console.log('Processing as PDF file');
      return await extractPdfText(buffer);
    } 
    // Word documents
    else if (fileType === 'application/msword' || 
             fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Processing as Word document');
      try {
        const result = await mammoth.extractRawText({ buffer });
        console.log(`Extracted Word content, length: ${result.value.length}`);
        return result.value;
      } catch (docError) {
        console.error('Error parsing Word document:', docError);
        return '[Error extracting Word document content]';
      }
    } 
    // Excel files
    else if (fileType === 'application/vnd.ms-excel' || 
             fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      console.log('Processing as Excel file');
      return extractExcel(buffer);
    } 
    // CSV files
    else if (fileType === 'text/csv') {
      console.log('Processing as CSV file');
      try {
        const csvText = await extractCSV(buffer);
        console.log(`Extracted CSV content, length: ${csvText.length}`);
        return csvText;
      } catch (csvError) {
        console.error('Error parsing CSV:', csvError);
        return '[Error extracting CSV content]';
      }
    } 
    // Image files
    else if (fileType.startsWith('image/')) {
      console.log('Processing as image file');
      return `[This is an image file. Image data is included but can't be directly displayed in text.]`;
    } 
    // Other document types
    else if (fileType.includes('document') || fileType.includes('spreadsheet')) {
      console.log('Processing as generic document');
      return "[This is a document file. The content may need specific parsing for full text extraction.]";
    } 
    // Unsupported types
    else {
      console.log(`Unsupported file type: ${fileType}`);
      return `[Unsupported file type: ${fileType}]`;
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);
    return "[Error extracting file content]";
  }
};

export async function generateChatCompletion(
  messages: Message[],
  method: string | null,
  attachments?: FileAttachment[]
): Promise<string> {
  console.log('Generating chat completion');
  
  try {
    const openai = getOpenAIClient();
    
    // Add system message based on the method
    const systemMessage = getSystemMessageForMethod(method);
    console.log('Using method:', method);
    
    // Process attachments and extract content if available
    const fileContents: string[] = [];
    
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments in generateChatCompletion`);
      
      // Process all attachments including PDFs
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        console.log(`Attachment ${i+1} details:`);
        console.log(`- Name: ${attachment.name || 'Unknown'}`);
        console.log(`- Type: ${attachment.type || 'Unknown'}`);
        console.log(`- Content length: ${attachment.content?.length || 0}`);
        
        
        if (!attachment.content) {
          console.error(`Attachment ${i+1} (${attachment.name}) has no content!`);
          fileContents.push(`File: ${attachment.name}\nType: ${attachment.type}\nContent: [Error: No content provided]`);
          continue;
        }
        
        try {
          const extractedText = await extractTextFromBase64(attachment.content, attachment.type);
          console.log(`Successfully extracted text from ${attachment.name}, length: ${extractedText.length}`);
          // Log a preview of what was extracted for debugging
          console.log(`Content preview: "${extractedText.substring(0, 100)}..."`);
          
          fileContents.push(`File: ${attachment.name}\nType: ${attachment.type}\nContent: ${extractedText}`);
        } catch (extractError) {
          console.error(`Error processing attachment ${i+1}:`, extractError);
          fileContents.push(`File: ${attachment.name}\nType: ${attachment.type}\nContent: [Error processing file]`);
        }
      }
      
      console.log(`File contents extracted: ${fileContents.length} files processed`);
    } else {
      console.log('No attachments to process');
    }
    
    // If there are PDF attachments, add a special note to the system message
    const hasPdfs = attachments?.some(a => a.type === 'application/pdf') || false;
    let enhancedSystemMessage = systemMessage;
    
    if (hasPdfs) {
      enhancedSystemMessage += `\n\nNote: The user has attached a PDF file. If text could be extracted from the PDF, it will be included in their message. If extraction failed, you'll see a notification about that. Either way, please analyze the file name and content if available to help the user.`;
    }
    
    // Prepare the messages for the API
    const apiMessages: ChatCompletionMessageParam[] = [];
    
    // Add system message
    apiMessages.push({ role: 'system', content: enhancedSystemMessage });
    
    // Add all previous messages except the last one
    for (let i = 0; i < messages.length - 1; i++) {
      apiMessages.push({ role: messages[i].role, content: messages[i].content });
    }
    
    // Handle the last message specially if we have attachments
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      
      if (attachments && attachments.length > 0 && fileContents.length > 0) {
        // Include file contents in the message
        const enhancedContent = `${lastMsg.content}\n\nI've attached ${attachments.length} file(s). Here are the contents:\n\n${fileContents.join('\n\n')}`;
        
        // Log what we're sending to debug
        console.log(`Sending enhanced content with file data. Total length: ${enhancedContent.length}`);
        
        apiMessages.push({ role: lastMsg.role, content: enhancedContent });
      } else {
        // No attachments, just add the message as is
        apiMessages.push({ role: lastMsg.role, content: lastMsg.content });
      }
    }

    console.log('Sending request to OpenAI API with', apiMessages.length, 'messages');
    
    // Send to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use a model with higher context window for file content
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log('Got OpenAI response');
    
    // In development mode, include debug information about file processing
    const responseText = response.choices[0]?.message?.content || 'No response generated';
    
    return responseText;
  } catch (error) {
    console.error('Error generating chat completion:', error);
    return 'Sorry, there was an error processing your request. Error: ' + (error instanceof Error ? error.message : 'Unknown error');
  }
}

function getSystemMessageForMethod(method: string | null): string {
  const markdownInstructions = 'Format your responses using Markdown when appropriate. Use **bold** for emphasis, create lists with bullets or numbers, use `code` for technical terms or code snippets, use tables to organize information, and format any code blocks with ```language\ncode\n``` syntax.';
  
  switch (method) {
    case 'memorizing':
      return `You are a helpful tutor assisting with memorization. Help the user memorize concepts by providing concise explanations, mnemonics, and asking recall questions. When the user uploads files, analyze their content to provide targeted memorization assistance. ${markdownInstructions}`;
    case 'understanding':
      return `You are a helpful tutor focused on promoting deep understanding. Explain concepts thoroughly and ask insightful questions to check understanding. When the user uploads files, analyze their content to help them understand the material better. ${markdownInstructions}`;
    case 'testing':
      return `You are a helpful testing assistant. Ask challenging questions about the topic being discussed to test the user's knowledge and provide feedback on their answers. When the user uploads files, use the content to create relevant test questions. ${markdownInstructions}`;
    default:
      return `You are a helpful learning assistant. Help the user learn effectively by answering questions and providing guidance. When the user uploads files, analyze the content to provide targeted assistance. ${markdownInstructions}`;
  }
}
