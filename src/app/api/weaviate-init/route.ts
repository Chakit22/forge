import { NextResponse } from 'next/server';
import { initializeSchema } from '@/utils/weaviate/schema';

export async function GET() {
  try {
    await initializeSchema();
    return NextResponse.json(
      { success: true, message: 'Weaviate schema initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initializing Weaviate schema:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize Weaviate schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 