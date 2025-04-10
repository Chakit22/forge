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
  metadata?: Record<string, any>;
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

// Weaviate result type with _additional field
type WeaviateResult = {
  _additional?: {
    id?: string;
  };
  [key: string]: any;
};

// WeaviateQuizResult type - represents the raw result from Weaviate
type WeaviateQuizResult = WeaviateResult & {
  userId: string;
  quizId: string;
  conversationId: string;
  score: number;
  totalQuestions: number;
  responses?: {
    questionId: number;
    question: string;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    isCorrect: boolean;
  }[];
  feedback?: string;
  learningOption?: string;
  strengthAreas?: string[];
  weaknessAreas?: string[];
  timestamp?: string;
};

// QuizResult type
export type QuizResult = BaseObject & {
  quizId: string;
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
    
    // Deep clone the data to avoid modifying the original
    let formattedData = JSON.parse(JSON.stringify(data));
    
    // Format timestamp
    formattedData = {
      ...formattedData,
      timestamp: formattedData.timestamp instanceof Date 
        ? formattedData.timestamp.toISOString() 
        : formattedData.timestamp
    };
    
    // Process and validate nested arrays/objects
    Object.keys(formattedData).forEach(key => {
      const value = formattedData[key];
      
      // Handle arrays
      if (Array.isArray(value)) {
        console.log(`Processing array field '${key}' with ${value.length} items`);
        
        // If array items are objects, make sure they're properly formatted
        if (value.length > 0 && typeof value[0] === 'object') {
          formattedData[key] = value.map(item => {
            // Handle Date objects in nested arrays
            if (item && typeof item === 'object') {
              const processed = { ...item };
              Object.keys(processed).forEach(itemKey => {
                if (processed[itemKey] instanceof Date) {
                  processed[itemKey] = processed[itemKey].toISOString();
                }
              });
              return processed;
            }
            return item;
          });
        }
      }
      
      // Convert any Date objects to ISO strings
      else if (value instanceof Date) {
        formattedData[key] = value.toISOString();
      }
      
      // Handle null/undefined values that Weaviate can't process
      else if (value === null || value === undefined) {
        console.log(`Removing null/undefined field '${key}'`);
        delete formattedData[key];
      }
    });
    
    console.log(`${className} data processed and ready for Weaviate`);
    
    // Create object in Weaviate
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
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      console.error('Data that caused error:', JSON.stringify({
        id,
        className,
        // Only show safe parts of data
        dataKeys: Object.keys(data)
      }));
    }
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

// QuizResult-specific functions
export const quizResultService = {
  create: (data: QuizResult) => createObject<QuizResult>('QuizResult', data),
  getById: (id: string) => getObjectById<QuizResult>('QuizResult', id),
  delete: (id: string) => deleteObject('QuizResult', id),
  search: (query: string) => searchObjects<QuizResult>('QuizResult', query, 
    ['userId', 'quizId', 'score', 'totalQuestions', 'feedback', 'learningOption', 'strengthAreas', 'weaknessAreas', 'timestamp']),
  getByUserId: async (userId: string): Promise<QuizResult[]> => {
    const client = getWeaviateClient();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('QuizResult')
        .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp responses {questionId question selectedOptionIndex correctOptionIndex isCorrect} _additional {id}')
        .withWhere({
          path: ['userId'],
          operator: 'Equal',
          valueString: userId
        })
        .withLimit(100)
        .withSort([{ path: ['timestamp'], order: 'desc' }])
        .do();
      
      const quizResults = result?.data?.Get?.QuizResult || [];
      
      // Convert the results to add the id property from _additional.id
      return quizResults.map((result: WeaviateQuizResult) => ({
        ...result,
        id: result._additional?.id
      })) as QuizResult[];
    } catch (error) {
      console.error('Error fetching quiz results by user ID:', error);
      return [];
    }
  },
  
  // Fix the getByQuizId function
  getByQuizId: async (quizId: string): Promise<QuizResult[]> => {
    const client = getWeaviateClient();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('QuizResult')
        .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp responses {questionId question selectedOptionIndex correctOptionIndex isCorrect} _additional {id}')
        .withWhere({
          path: ['quizId'],
          operator: 'Equal',
          valueString: quizId
        })
        .withSort([{ path: ['timestamp'], order: 'desc' }])
        .do();
      
      const quizResults = result?.data?.Get?.QuizResult || [];
      
      // Convert the results to add the id property from _additional.id
      return quizResults.map((result: WeaviateQuizResult) => ({
        ...result,
        id: result._additional?.id
      })) as QuizResult[];
    } catch (error) {
      console.error('Error fetching quiz results by quiz ID:', error);
      return [];
    }
  },
  
  // Get quiz results by conversation ID
  getByConversationId: async (conversationId: string): Promise<QuizResult[]> => {
    const client = getWeaviateClient();
    
    try {
      const result = await client.graphql
        .get()
        .withClassName('QuizResult')
        .withFields('userId quizId conversationId score totalQuestions feedback learningOption strengthAreas weaknessAreas timestamp responses {questionId question selectedOptionIndex correctOptionIndex isCorrect} _additional {id}')
        .withWhere({
          path: ['conversationId'],
          operator: 'Equal',
          valueString: conversationId
        })
        .withSort([{ path: ['timestamp'], order: 'desc' }])
        .do();
      
      const quizResults = result?.data?.Get?.QuizResult || [];
      
      // Convert the results to add the id property from _additional.id
      return quizResults.map((result: WeaviateQuizResult) => ({
        ...result,
        id: result._additional?.id
      })) as QuizResult[];
    } catch (error) {
      console.error('Error fetching quiz results by conversation ID:', error);
      return [];
    }
  }
}; 