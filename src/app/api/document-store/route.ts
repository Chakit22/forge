import { NextResponse } from 'next/server';
import { documentService } from '@/utils/weaviate/dataService';

// Interface for storing documents
interface DocumentStoreRequest {
  userId: string;
  title: string;
  content: string;
  fileType: string;
  metadata?: Record<string, any>;
}

export async function POST(request: Request) {
  try {
    const requestData: DocumentStoreRequest = await request.json();
    const { userId, title, content, fileType, metadata } = requestData;
    
    if (!userId || !title || !content || !fileType) {
      return NextResponse.json(
        { error: 'Invalid document data. userId, title, content, and fileType are required' }, 
        { status: 400 }
      );
    }

    // Store document in Weaviate
    const documentId = await documentService.create({
      userId,
      title,
      content,
      fileType,
      timestamp: new Date().toISOString(),
      metadata
    });
    
    return NextResponse.json({ 
      success: true, 
      documentId 
    });
  } catch (error) {
    console.error('Error in document store API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to store document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const query = url.searchParams.get('query');
    const documentId = url.searchParams.get('id');
    
    if (documentId) {
      // Get document by ID
      const document = await documentService.getById(documentId);
      
      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' }, 
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        document 
      });
    } else if (query) {
      // Search documents by query
      const documents = await documentService.search(query);
      
      return NextResponse.json({ 
        success: true, 
        documents 
      });
    } else if (userId) {
      // Get documents by user ID
      const documents = await documentService.getByUserId(userId);
      
      return NextResponse.json({ 
        success: true, 
        documents 
      });
    } else {
      return NextResponse.json(
        { error: 'Either id, userId, or query parameter is required' }, 
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in document retrieval API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' }, 
        { status: 400 }
      );
    }

    // Delete document from Weaviate
    const success = await documentService.delete(documentId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete document or document not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully' 
    });
  } catch (error) {
    console.error('Error in document deletion API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 