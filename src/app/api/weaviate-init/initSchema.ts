import { initializeSchema } from '@/utils/weaviate/schema';

let initialized = false;

export async function initWeaviateSchema() {
  if (initialized) return;
  
  try {
    console.log('Initializing Weaviate schema...');
    await initializeSchema();
    initialized = true;
    console.log('Weaviate schema initialization completed successfully');
  } catch (error) {
    console.error('Error initializing Weaviate schema:', error);
    // We don't want to block the application from starting if schema initialization fails
  }
}

// This function can be imported and called from pages/api/_app.js or other entry points 