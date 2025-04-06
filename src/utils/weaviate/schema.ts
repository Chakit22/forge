import { createClassIfNotExists } from './client';

// Define schema classes and their properties for different data types

export async function setupMessageClass() {
  try {
    console.log('Setting up Message class in Weaviate');
    await createClassIfNotExists(
      'Message',
      [
        { name: 'userId', dataType: ['string'] },
        { name: 'role', dataType: ['string'] },
        { name: 'content', dataType: ['text'] },
        { name: 'timestamp', dataType: ['date'] },
        { name: 'conversationId', dataType: ['string'] },
        // Removing metadata field as it requires nested properties
        // { name: 'metadata', dataType: ['object'] },
      ]
    );
    console.log('Message class setup complete');
  } catch (error) {
    console.error('Error setting up Message class:', error);
  }
}

export async function setupFeedbackClass() {
  try {
    console.log('Setting up Feedback class in Weaviate');
    await createClassIfNotExists(
      'Feedback',
      [
        { name: 'userId', dataType: ['string'] },
        { name: 'content', dataType: ['text'] },
        { name: 'timestamp', dataType: ['date'] },
        { name: 'category', dataType: ['string'] },
        { name: 'relatedMessageId', dataType: ['string'] },
        // Removing metadata field as it requires nested properties
        // { name: 'metadata', dataType: ['object'] },
      ]
    );
    console.log('Feedback class setup complete');
  } catch (error) {
    console.error('Error setting up Feedback class:', error);
  }
}

export async function setupDocumentClass() {
  try {
    console.log('Setting up Document class in Weaviate');
    await createClassIfNotExists(
      'Document',
      [
        { name: 'userId', dataType: ['string'] },
        { name: 'title', dataType: ['string'] },
        { name: 'content', dataType: ['text'] },
        { name: 'fileType', dataType: ['string'] },
        { name: 'timestamp', dataType: ['date'] },
        // Removing metadata field as it requires nested properties
        // { name: 'metadata', dataType: ['object'] },
      ]
    );
    console.log('Document class setup complete');
  } catch (error) {
    console.error('Error setting up Document class:', error);
  }
}

export async function setupImageClass() {
  try {
    console.log('Setting up Image class in Weaviate');
    await createClassIfNotExists(
      'Image',
      [
        { name: 'userId', dataType: ['string'] },
        { name: 'caption', dataType: ['text'] },
        { name: 'url', dataType: ['string'] },
        { name: 'timestamp', dataType: ['date'] },
        // Removing metadata field as it requires nested properties
        // { name: 'metadata', dataType: ['object'] },
      ],
      'text2vec-openai' // Using text2vec-openai instead of img2vec-neural
    );
    console.log('Image class setup complete');
  } catch (error) {
    console.error('Error setting up Image class:', error);
  }
}

export async function setupQuizClass() {
  try {
    console.log('Setting up Quiz class in Weaviate');
    await createClassIfNotExists(
      'Quiz',
      [
        { name: 'userId', dataType: ['string'] },
        { name: 'title', dataType: ['string'] },
        { name: 'description', dataType: ['text'] },
        { 
          name: 'questions', 
          dataType: ['object[]'],
          nestedProperties: [
            { name: 'question', dataType: ['text'] },
            { name: 'options', dataType: ['text[]'] },
            { name: 'correctAnswer', dataType: ['text'] },
            { name: 'explanation', dataType: ['text'] }
          ]
        },
        { name: 'learningOption', dataType: ['string'] },
        { name: 'timestamp', dataType: ['date'] },
      ]
    );
    console.log('Quiz class setup complete');
  } catch (error) {
    console.error('Error setting up Quiz class:', error);
  }
}

// Initialize all schema classes
export async function initializeSchema() {
  console.log('Starting Weaviate schema initialization');
  
  try {
    await setupMessageClass();
    await setupFeedbackClass();
    await setupDocumentClass();
    await setupImageClass();
    await setupQuizClass();
    console.log('Weaviate schema initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing Weaviate schema:', error);
    return false;
  }
} 