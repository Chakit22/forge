import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';

// Initialize Weaviate client with the provided credentials
let client: WeaviateClient | null = null;

export function getWeaviateClient(): WeaviateClient {
  if (client) return client;
  
  const endpoint = process.env.WEAVIATE_ENDPOINT || 'jig03vys3gxmh1pz7va.c0.asia-southeast1.gcp.weaviate.cloud';
  const apiKey = process.env.WEAVIATE_API_KEY || 'PfG5A2fD3jpcYuf3Jprr2oHGol37uqioNHR5';
  
  console.log('Initializing Weaviate client with endpoint:', endpoint);
  
  // Create and configure the client
  try {
    client = weaviate.client({
      scheme: 'https',
      host: endpoint,
      apiKey: new ApiKey(apiKey),
      headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '' }
    });
    
    console.log('Weaviate client initialized successfully');
    
    // Test connection
    testConnection().catch(error => {
      console.error('Failed to connect to Weaviate:', error);
    });
    
    return client;
  } catch (error) {
    console.error('Error initializing Weaviate client:', error);
    throw error;
  }
}

// Test the connection to Weaviate
async function testConnection() {
  try {
    const schema = await client?.schema.getter().do();
    console.log('Successfully connected to Weaviate. Schema:', schema);
    return true;
  } catch (error) {
    console.error('Error connecting to Weaviate:', error);
    return false;
  }
}

// Check if a class exists in Weaviate
export async function classExists(className: string): Promise<boolean> {
  const client = getWeaviateClient();
  try {
    const schema = await client.schema.getter().do();
    const exists = schema.classes?.some(c => c.class === className) || false;
    console.log(`Class ${className} exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`Error checking if class ${className} exists:`, error);
    return false;
  }
}

// Create a class in Weaviate if it doesn't exist
export async function createClassIfNotExists(
  className: string, 
  properties: Array<{ name: string, dataType: string[] }>,
  vectorizer: string = 'text2vec-openai'
): Promise<void> {
  const client = getWeaviateClient();
  const exists = await classExists(className);
  
  if (!exists) {
    try {
      console.log(`Creating class ${className}...`);
      
      // Remove metadata property if it's of type object without nested properties
      const filteredProperties = properties.filter(prop => {
        if (prop.name === 'metadata' && prop.dataType.includes('object')) {
          console.log('Removing metadata property from schema as it requires nested properties');
          return false;
        }
        return true;
      });
      
      await client.schema.classCreator()
        .withClass({
          class: className,
          vectorizer,
          properties: filteredProperties,
        })
        .do();
      console.log(`Class ${className} created successfully`);
    } catch (error) {
      console.error(`Error creating class ${className}:`, error);
      throw error;
    }
  }
} 