import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/api/actions";
import { OpenAI } from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Get current user from session
    const { success, user, error: userError } = await getCurrentUser();

    if (!success || !user) {
      return NextResponse.json(
        { success: false, error: userError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Get statistics from request body
    const body = await req.json();
    const { stats } = body;

    if (!stats) {
      return NextResponse.json(
        { success: false, error: "No statistics provided" },
        { status: 400 }
      );
    }

    // Generate a prompt for the AI based on the statistics
    const prompt = generatePrompt(stats, user.name || "there");

    // Call OpenAI API to generate feedback
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use the appropriate model
      messages: [
        {
          role: "system",
          content:
            "You are an expert learning coach and education specialist who analyzes learning patterns and provides personalized feedback. Your feedback should be encouraging, specific, and actionable. Focus on highlighting patterns, providing practical improvement tips, and suggesting study strategies tailored to the user's learning style. Be conversational and supportive in tone. FORMAT YOUR RESPONSE USING PROPER MARKDOWN WITH HEADINGS (##), BULLET POINTS (*), BOLD TEXT (**), AND OTHER MARKDOWN FORMATTING. This is essential as your response will be rendered with a markdown parser."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract the generated feedback
    const feedback = response.choices[0]?.message?.content || "No feedback generated";

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Error generating analytics feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate feedback",
      },
      { status: 500 }
    );
  }
}

// Helper function to generate prompt for OpenAI
function generatePrompt(stats: any, userName: string): string {
  const {
    totalSessions,
    sessionsPerWeek,
    averageQuizScore,
    learningDistribution,
    commonWeaknesses,
    commonStrengths,
    totalQuizzes,
  } = stats;

  // Format learning distribution for better readability
  let distributionText = "";
  if (learningDistribution && Object.keys(learningDistribution).length > 0) {
    distributionText = Object.entries(learningDistribution)
      .map(([option, count]) => {
        const formattedOption = option.charAt(0).toUpperCase() + option.slice(1);
        return `${formattedOption}: ${count} sessions`;
      })
      .join(", ");
  } else {
    distributionText = "No learning method data available";
  }

  // Format strengths and weaknesses
  const strengthsText = commonStrengths && commonStrengths.length > 0
    ? commonStrengths.join(", ")
    : "No strength data available";

  const weaknessesText = commonWeaknesses && commonWeaknesses.length > 0
    ? commonWeaknesses.join(", ")
    : "No improvement areas data available";

  // Build the prompt
  return `
    Hi, I need personalized learning feedback for a user named ${userName}. Here are their learning statistics:
    
    Total Learning Sessions: ${totalSessions || 0}
    Average Sessions Per Week: ${sessionsPerWeek || 0}
    Total Quizzes Taken: ${totalQuizzes || 0}
    Average Quiz Score: ${averageQuizScore || 0}%
    
    Learning Method Distribution: ${distributionText}
    
    Strengths: ${strengthsText}
    
    Areas to Improve: ${weaknessesText}
    
    Based on this data, please provide:
    1. An analysis of their learning patterns and progress
    2. Specific recommendations to improve their learning effectiveness
    3. Suggestions for study techniques based on their strengths and preferred learning methods
    4. Encouragement and positive reinforcement for their achievements
    5. One or two specific actionable tips they can implement immediately
    
    Make your response conversational, personalized, and actionable. Format your response with proper markdown using section headings (##), bullet points (*), bold text for emphasis (**important point**), and other markdown formatting. Keep your total response under 600 words.
  `;
} 