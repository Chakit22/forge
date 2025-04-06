import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { nanoid } from "nanoid"; // Keep nanoid for unique IDs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the hierarchical node type
type MindmapNode = {
  title: string;
  children: MindmapNode[];
  id?: string;
};

// Helper function to add IDs to the mindmap nodes recursively
function addIdsToMindmapNodes(node: MindmapNode, parentId: string | null = null): MindmapNode {
  const id = parentId ? `${parentId}-${nanoid(6)}` : `root-${nanoid(6)}`;
  
  const nodeWithId = {
    ...node,
    id
  };
  
  if (Array.isArray(node.children)) {
    nodeWithId.children = node.children.map((child: MindmapNode) => 
      addIdsToMindmapNodes(child, id)
    );
  } else {
    nodeWithId.children = [];
  }
  
  return nodeWithId;
}

export async function POST(req: NextRequest) {
  try {
    const { text, context } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Combine context and current transcript
    const contextText = context.length > 0 ? context.join(" ") : "";
    
    // Updated system prompt for hierarchical JSON structure
    const systemPrompt = `
      You are a smart note-taking assistant designed to help users turn their transcribed speech into structured, hierarchical notes that can later be visualized as a mindmap.

      Your task is to:
      1. Convert the transcribed spoken text into a **nested JSON-like structure**.
      2. Use the format: \`{ "title": "...", "children": [ ... ] }\`.
      3. Only include meaningful, relevant points. Skip filler, hesitation, and repetition.
      4. Extract and group related concepts under appropriate parent nodes.
      5. Organize information hierarchically, breaking complex thoughts into sub-points.
      6. Output **only** the nested JSON. Do **not** include commentary, explanations, or conversational language.
      7. Each \`title\` should be a short, clear summary of a point.
      8. Each \`children\` field contains sub-points (can be empty if no sub-points).
      9. Use generic root titles (e.g. "Main Idea", "Discussion Topic") when needed.

      ### Example Input (transcript):
      "Okay, so I think one of the main problems with our system is latency... it's mostly due to the backend architecture, which we kind of messed up during the last update."

      ### Expected Output:
      {
        "title": "System Issues",
        "children": [
          {
            "title": "Latency",
            "children": [
              { "title": "Caused by backend architecture", "children": [] },
              { "title": "Introduced during last update", "children": [] }
            ]
          }
        ]
      }
    `;

    // User prompt requesting hierarchical structure
    const userPrompt = `
      Context (previous transcript): ${contextText}
      
      New content to process: ${text}
      
      Convert this speech into a hierarchical JSON structure for a mindmap, organizing concepts meaningfully.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
    });

    // Parse the response to get hierarchical JSON
    let mindmapData;
    try {
      const content = response.choices[0]?.message?.content || "{}";
      
      // Clean up the content to handle cases where the model returns markdown formatting
      const cleanedContent = content
        .replace(/```json\s*/g, '') // Remove markdown json code block start
        .replace(/```\s*$/g, '')    // Remove markdown code block end
        .trim();
      
      const parsedData = JSON.parse(cleanedContent);
      
      // Ensure the structure is valid
      if (!parsedData.title) {
        parsedData.title = "Main Topic";
      }
      
      if (!Array.isArray(parsedData.children)) {
        parsedData.children = [];
      }
      
      // Add unique IDs to each node in the mindmap
      mindmapData = addIdsToMindmapNodes(parsedData);
      
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      console.error("Raw response:", response.choices[0]?.message?.content);
      mindmapData = addIdsToMindmapNodes({ 
        title: "Main Topic", 
        children: [] 
      });
    }

    return NextResponse.json({ mindmapData });
  } catch (error) {
    console.error("Mindmap generation error:", error);
    return NextResponse.json(
      { error: "Error generating mindmap structure" },
      { status: 500 }
    );
  }
}