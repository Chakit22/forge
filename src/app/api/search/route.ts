import { NextResponse } from 'next/server';
import { getWeaviateClient } from '@/utils/weaviate/client';

// Define valid class names for searching
const validClassNames = ['Message', 'Document', 'Feedback', 'Image', 'Quiz'];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const userId = url.searchParams.get('userId');
    const classNames = url.searchParams.get('classes')?.split(',') || validClassNames;
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query parameter is required' }, 
        { status: 400 }
      );
    }
    
    // Validate class names
    const validClasses = classNames.filter(className => 
      validClassNames.includes(className)
    );
    
    if (validClasses.length === 0) {
      return NextResponse.json(
        { error: `Invalid class names. Valid options are: ${validClassNames.join(', ')}` }, 
        { status: 400 }
      );
    }
    
    // Search across all specified classes
    const results = await Promise.all(
      validClasses.map(async (className) => {
        try {
          const client = getWeaviateClient();
          let graphQLQuery = client.graphql.get();
          
          // Configure query based on class
          switch(className) {
            case 'Message':
              graphQLQuery = graphQLQuery
                .withClassName('Message')
                .withFields('id userId role content timestamp conversationId metadata _additional { certainty }');
              break;
            case 'Document':
              graphQLQuery = graphQLQuery
                .withClassName('Document')
                .withFields('id userId title content fileType timestamp metadata _additional { certainty }');
              break;
            case 'Feedback':
              graphQLQuery = graphQLQuery
                .withClassName('Feedback')
                .withFields('id userId content timestamp category relatedMessageId metadata _additional { certainty }');
              break;
            case 'Image':
              graphQLQuery = graphQLQuery
                .withClassName('Image')
                .withFields('id userId caption url timestamp metadata _additional { certainty }');
              break;
            case 'Quiz':
              graphQLQuery = graphQLQuery
                .withClassName('Quiz')
                .withFields('id userId title description questions learningOption timestamp _additional { certainty }');
              break;
          }
          
          // Add search query
          graphQLQuery = graphQLQuery.withNearText({ concepts: [query] });
          
          // Add user filter if provided
          if (userId) {
            graphQLQuery = graphQLQuery.withWhere({
              path: ['userId'],
              operator: 'Equal',
              valueString: userId
            });
          }
          
          // Add limit
          graphQLQuery = graphQLQuery.withLimit(limit);
          
          // Execute query
          const result = await graphQLQuery.do();
          
          return {
            className,
            items: result?.data?.Get?.[className] || []
          };
        } catch (error) {
          console.error(`Error searching ${className}:`, error);
          return {
            className,
            items: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('Error in search API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform search',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 