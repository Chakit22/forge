import { getWeaviateClient } from './client';
import { v4 as uuidv4 } from 'uuid';

// Generic types for data objects
type BaseObject = {
  id?: string;
  userId: string;
  timestamp: Date | string;
};

// Message type
export type Message = BaseObject & {
  role: 'user' | 'assistant' | 'system';
  content: string;
  conversationId: string;
};

// Feedback type
export type Feedback = BaseObject & {
  content: string;
  category: string;
  relatedMessageId?: string;
};

// Document type
export type Document = BaseObject & {
  title: string;
  content: string;
  fileType: string;
};

// Image type
export type Image = BaseObject & {
  caption: string;
  url: string;
};

// Quiz type
export type Quiz = BaseObject & {
  title: string;
  description: string;
  questions: any[];
  learningOption: string;
};

// Generic create function
async function createObject<T extends BaseObject>(
  className: string,
  data: T
): Promise<string> {
  const client = getWeaviateClient();
  const id = data.id || uuidv4();
  
  try {
    console.log(`Creating ${className} object with ID: ${id}`);
    
    // Format timestamp
    const formattedData = {
      ...data,
      timestamp: data.timestamp instanceof Date 
        ? data.timestamp.toISOString() 
        : data.timestamp
    };
    
    console.log(`${className} data:`, {
      ...formattedData,
      // Only show preview of content if it exists and is a string
      content: typeof formattedData.content === 'string' 
        ? formattedData.content.slice(0, 50) + (formattedData.content.length > 50 ? '...' : '') 
        : formattedData.content
    });
    
    await client.data
      .creator()
      .withClassName(className)
      .withId(id)
      .withProperties(formattedData)
      .do();
    
    console.log(`${className} object created successfully with ID: ${id}`);
    return id;
  } catch (error) {
    console.error(`Error creating ${className}:`, error);
    throw error;
  }
}

// Generic get by ID function
async function getObjectById<T>(
  className: string,
  id: string
): Promise<T | null> {
  const client = getWeaviateClient();
  
  try {
    const result = await client.data
      .getterById()
      .withClassName(className)
      .withId(id)
      .do();
    
    return result?.properties as T || null;
  } catch (error) {
    console.error(`Error fetching ${className} by ID:`, error);
    return null;
  }
}

// Generic delete function
async function deleteObject(
  className: string,
  id: string
): Promise<boolean> {
  const client = getWeaviateClient();
  
  try {
    await client.data
      .deleter()
      .withClassName(className)
      .withId(id)
      .do();
    
    return true;
  } catch (error) {
    console.error(`Error deleting ${className}:`, error);
    return false;
  }
}

// Generic search function
async function searchObjects<T>(
  className: string,
  query: string,
  properties: string[],
  limit: number = 10
): Promise<T[]> {
  const client = getWeaviateClient();
  
  try {
    const result = await client.graphql
      .get()
      .withClassName(className)
      .withFields(properties.join(' '))
      .withNearText({ concepts: [query] })
      .withLimit(limit)
      .do();
    
    return (result?.data?.Get?.[className] || []) as T[];
  } catch (error) {
    console.error(`Error searching ${className}:`, error);
    return [];
  }
}

// Generic search by user function
async function getObjectsByUserId<T>(
  className: string,
  userId: string,
  properties: string[],
  limit: number = 100
): Promise<T[]> {
  const client = getWeaviateClient();
  
  try {
    const result = await client.graphql
      .get()
      .withClassName(className)
      .withFields(properties.join(' '))
      .withWhere({
        path: ['userId'],
        operator: 'Equal',
        valueString: userId
      })
      .withLimit(limit)
      .do();
    
    return (result?.data?.Get?.[className] || []) as T[];
  } catch (error) {
    console.error(`Error fetching ${className} by user ID:`, error);
    return [];
  }
}

// Message-specific functions
export const messageService = {
  create: (data: Message) => createObject<Message>('Message', data),
  getById: (id: string) => getObjectById<Message>('Message', id),
  delete: (id: string) => deleteObject('Message', id),
  search: (query: string) => searchObjects<Message>('Message', query, 
    ['userId', 'role', 'content', 'timestamp', 'conversationId']),
  getByUserId: (userId: string) => getObjectsByUserId<Message>('Message', userId,
    ['userId', 'role', 'content', 'timestamp', 'conversationId']),
    
  // Get messages by conversation ID
  getByConversationId: async (conversationId: string): Promise<Message[]> => {
    const client = getWeaviateClient();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('Message')
        .withFields('userId role content timestamp conversationId')
        .withWhere({
          path: ['conversationId'],
          operator: 'Equal',
          valueString: conversationId
        })
        .withSort([{ path: ['timestamp'], order: 'asc' }])
        .do();
      
      return (result?.data?.Get?.Message || []) as Message[];
    } catch (error) {
      console.error('Error fetching messages by conversation ID:', error);
      return [];
    }
  }
};

// Feedback-specific functions
export const feedbackService = {
  create: (data: Feedback) => createObject<Feedback>('Feedback', data),
  getById: (id: string) => getObjectById<Feedback>('Feedback', id),
  delete: (id: string) => deleteObject('Feedback', id),
  search: (query: string) => searchObjects<Feedback>('Feedback', query, 
    ['userId', 'content', 'timestamp', 'category', 'relatedMessageId']),
  getByUserId: (userId: string) => getObjectsByUserId<Feedback>('Feedback', userId,
    ['userId', 'content', 'timestamp', 'category', 'relatedMessageId'])
};

// Document-specific functions
export const documentService = {
  create: (data: Document) => createObject<Document>('Document', data),
  getById: (id: string) => getObjectById<Document>('Document', id),
  delete: (id: string) => deleteObject('Document', id),
  search: (query: string) => searchObjects<Document>('Document', query, 
    ['userId', 'title', 'content', 'fileType', 'timestamp']),
  getByUserId: (userId: string) => getObjectsByUserId<Document>('Document', userId,
    ['userId', 'title', 'content', 'fileType', 'timestamp'])
};

// Image-specific functions
export const imageService = {
  create: (data: Image) => createObject<Image>('Image', data),
  getById: (id: string) => getObjectById<Image>('Image', id),
  delete: (id: string) => deleteObject('Image', id),
  search: (query: string) => searchObjects<Image>('Image', query, 
    ['userId', 'caption', 'url', 'timestamp']),
  getByUserId: (userId: string) => getObjectsByUserId<Image>('Image', userId,
    ['userId', 'caption', 'url', 'timestamp'])
};

// Quiz-specific functions
export const quizService = {
  create: (data: Quiz) => createObject<Quiz>('Quiz', data),
  getById: (id: string) => getObjectById<Quiz>('Quiz', id),
  delete: (id: string) => deleteObject('Quiz', id),
  search: (query: string) => searchObjects<Quiz>('Quiz', query, 
    ['userId', 'title', 'description', 'questions', 'learningOption', 'timestamp']),
  getByUserId: (userId: string) => getObjectsByUserId<Quiz>('Quiz', userId,
    ['userId', 'title', 'description', 'questions', 'learningOption', 'timestamp'])
}; 