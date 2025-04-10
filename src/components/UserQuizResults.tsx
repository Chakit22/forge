"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface QuizResult {
  id: string;
  quiz_id: string;
  user_id: number;
  conversation_id?: string; // Make it optional for backward compatibility
  score: number;
  total_questions: number;
  feedback: string;
  learning_option: string;
  strength_areas: string[];
  weakness_areas: string[];
  created_at: string;
}

interface QuizResponse {
  id: number;
  result_id: number;
  question_id: number;
  question_text: string;
  selected_option_index: number;
  correct_option_index: number;
  is_correct: boolean;
}

export default function UserQuizResults() {
  const { user } = useUser();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchQuizResults();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchQuizResults = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching quiz results for user...");
      
      const response = await fetch("/api/quiz-results/user");

      if (!response.ok) {
        console.error(`Failed to fetch quiz results: ${response.status}`);
        throw new Error(`Failed to fetch quiz results: ${response.status}`);
      }

      const data = await response.json();
      console.log("Quiz results API response:", data);
      
      // Store the raw API response for debugging
      setRawApiResponse(data);

      if (data.success) {
        console.log(`Received ${data.results?.length || 0} quiz results`);
        
        if (Array.isArray(data.results) && data.results.length > 0) {
          // Add additional logging for troubleshooting
          console.log("First quiz result:", data.results[0]);
          setQuizResults(data.results);
          
          // Check if results have the expected properties
          const hasValidResults = data.results.some((r: QuizResult) => 
            r && r.id && r.score !== undefined && r.total_questions !== undefined
          );
          
          if (!hasValidResults) {
            console.warn("Quiz results may have invalid format:", data.results.slice(0, 3));
          }
        } else {
          console.log("No quiz results found for user");
          setQuizResults([]);
        }
      } else {
        console.error("API returned error:", data.error);
        setError(data.error || "Failed to fetch quiz results");
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuizResponses = async (resultId: string) => {
    if (selectedQuiz === resultId) {
      // Toggle off if already selected
      setSelectedQuiz(null);
      setQuizResponses([]);
      return;
    }

    try {
      setIsLoadingResponses(true);
      setSelectedQuiz(resultId);

      const response = await fetch(`/api/quiz-results/${resultId}/responses`);

      if (!response.ok) {
        throw new Error(`Failed to fetch quiz responses: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setQuizResponses(data.responses);
      } else {
        setError(data.error || "Failed to fetch quiz responses");
      }
    } catch (error) {
      console.error("Error fetching quiz responses:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoadingResponses(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getQuizTitle = (quizId: string) => {
    // Extract the title from the quiz_id (format: title-timestamp)
    const parts = quizId.split("-");
    // const timestamp = parts.pop(); // Remove the timestamp
    return parts
      .join("-")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getLearningModeLabel = (mode: string) => {
    switch (mode.toLowerCase()) {
      case "detailed":
        return "Detailed";
      case "concise":
        return "Concise";
      case "visual":
        return "Visual";
      case "normal":
      default:
        return "Normal";
    }
  };

  // Group quiz results by conversation
  const groupedQuizResults = React.useMemo(() => {
    const grouped: { [key: string]: QuizResult[] } = {};
    
    if (!Array.isArray(quizResults) || quizResults.length === 0) {
      console.log('No quiz results to group');
      return grouped; // Return empty object if no results
    }
    
    console.log(`Grouping ${quizResults.length} quiz results`);
    
    // First group all results with conversationId
    quizResults.forEach(result => {
      if (result && result.conversation_id) {
        if (!grouped[result.conversation_id]) {
          grouped[result.conversation_id] = [];
        }
        grouped[result.conversation_id].push(result);
      }
    });
    
    // Then add a group for "ungrouped" results (no conversation_id)
    const ungrouped = quizResults.filter(result => result && !result.conversation_id);
    if (ungrouped.length > 0) {
      grouped['ungrouped'] = ungrouped;
    }
    
    // Sort each group by date
    Object.keys(grouped).forEach(key => {
      if (Array.isArray(grouped[key])) {
        grouped[key].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Sort descending (newest first)
        });
      }
    });
    
    console.log(`Grouped results into ${Object.keys(grouped).length} conversations`);
    return grouped;
  }, [quizResults]);
  
  // Navigate to conversation page
  const navigateToConversation = (conversationId: string) => {
    router.push(`/dashboard/conversation/${conversationId}`);
  };

  const calculateAverageScore = (quizResults: QuizResult[]): number => {
    if (!Array.isArray(quizResults) || quizResults.length === 0) {
      return 0;
    }
    
    let totalScore = 0;
    let validResults = 0;
    
    quizResults.forEach(result => {
      if (result && typeof result.score === 'number' && typeof result.total_questions === 'number' && result.total_questions > 0) {
        totalScore += (result.score / result.total_questions) * 100;
        validResults++;
      }
    });
    
    return validResults > 0 ? Math.round(totalScore / validResults) : 0;
  };

  // Add direct test save function
  const saveSampleQuizResult = async () => {
    try {
      const response = await fetch("/api/debug/direct-save-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: "54", // Match the conversationId from your sample
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save test quiz: ${response.status}`);
      }
      
      const data = await response.json();
      toast.success("Sample quiz result saved successfully!");
      console.log("Sample quiz saved:", data);
      
      // Reload quiz results
      fetchQuizResults();
    } catch (error) {
      console.error("Error saving sample quiz:", error);
      toast.error(`Failed to save sample quiz: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Add direct check function to debug
  const checkDirectResults = async () => {
    try {
      const response = await fetch("/api/debug/check-quiz-results");
      
      if (!response.ok) {
        throw new Error(`Failed to check quiz results: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Direct Weaviate results:", data);
      setRawApiResponse(data);
      setShowDebug(true);
      
      if (data.totalResults === 0) {
        toast.info("No quiz results found in Weaviate");
      } else {
        toast.success(`Found ${data.totalResults} quiz results in Weaviate`);
      }
    } catch (error) {
      console.error("Error checking quiz results:", error);
      toast.error(`Failed to check quiz results: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Add fix quiz results function
  const fixQuizResults = async () => {
    try {
      toast.loading("Fixing quiz results format...");
      
      const response = await fetch("/api/debug/fix-quiz-results");
      
      if (!response.ok) {
        throw new Error(`Failed to fix quiz results: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fix quiz results response:", data);
      
      if (data.success) {
        toast.success(`Fixed ${data.totalProcessed} quiz results`);
        // Reload quiz results to see the changes
        await fetchQuizResults();
      } else {
        toast.error(data.error || "Failed to fix quiz results");
      }
    } catch (error) {
      console.error("Error fixing quiz results:", error);
      toast.error(`Failed to fix quiz results: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      toast.dismiss();
    }
  };

  // Add import sample data function
  const importSampleData = async () => {
    try {
      toast.loading("Importing sample quiz data...");
      
      const response = await fetch("/api/debug/import-quiz-data", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to import sample data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Import sample data response:", data);
      
      if (data.success) {
        toast.success(`Imported sample quiz data with ID: ${data.importedId}`);
        // Reload quiz results to see the imported data
        await fetchQuizResults();
      } else {
        toast.error(data.error || "Failed to import sample data");
      }
    } catch (error) {
      console.error("Error importing sample data:", error);
      toast.error(`Failed to import sample data: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      toast.dismiss();
    }
  };

  // Add function to get all quiz results
  const getAllQuizResults = async () => {
    try {
      toast.loading("Getting all quiz results...");
      
      const response = await fetch("/api/debug/get-all-quiz-results");
      
      if (!response.ok) {
        throw new Error(`Failed to get all quiz results: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("All quiz results response:", data);
      
      setRawApiResponse(data);
      setShowDebug(true);
      
      if (data.success) {
        toast.success(`Found ${data.raw_results?.length || 0} total quiz results`);
        
        // If there are results but they don't show in the UI, we have a data format issue
        if (data.raw_results?.length > 0 && quizResults.length === 0) {
          toast.info("Data exists but doesn't appear in UI - there's a format mismatch");
        }
      } else {
        toast.error(data.error || "Failed to get all quiz results");
      }
    } catch (error) {
      console.error("Error getting all quiz results:", error);
      toast.error(`Failed to get all quiz results: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      toast.dismiss();
    }
  };
  
  // Add function to force reload results with cache busting
  const forceReloadResults = async () => {
    try {
      toast.loading("Force reloading quiz results...");
      
      // Add cache busting parameter
      const timestamp = Date.now();
      const response = await fetch(`/api/quiz-results/user?_=${timestamp}`);
      
      if (!response.ok) {
        throw new Error(`Failed to reload quiz results: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Force reloaded quiz results:", data);
      
      setRawApiResponse(data);
      
      if (data.success) {
        if (Array.isArray(data.results) && data.results.length > 0) {
          setQuizResults(data.results);
          toast.success(`Successfully loaded ${data.results.length} quiz results`);
        } else {
          setQuizResults([]);
          toast.info("No quiz results found");
        }
      } else {
        toast.error(data.error || "Failed to reload quiz results");
      }
    } catch (error) {
      console.error("Error force reloading quiz results:", error);
      toast.error(`Failed to reload quiz results: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      toast.dismiss();
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Performance</CardTitle>
          <CardDescription>Sign in to see your quiz history</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Performance</CardTitle>
          <CardDescription>Loading your quiz history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Performance</CardTitle>
          <CardDescription>Error loading quiz history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchQuizResults} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Quiz Performance</CardTitle>
            <CardDescription>
              {quizResults.length > 0
                ? "View your quiz history and track your progress"
                : "You haven't taken any quizzes yet"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {quizResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Complete a quiz to see your performance analysis
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {Object.entries(groupedQuizResults).map(([conversationId, results]) => (
              <AccordionItem
                key={conversationId}
                value={conversationId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {conversationId === 'ungrouped' 
                          ? "Standalone Quizzes" 
                          : `Conversation Quizzes (${results.length})`}
                      </span>
                      {conversationId !== 'ungrouped' && (
                        <Badge variant="outline" className="ml-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToConversation(conversationId);
                          }}
                        >
                          View Conversation
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>
                        Latest: {results[0] && formatDate(results[0].created_at) || 'Unknown'}
                      </span>
                      <span>•</span>
                      <span>
                        Avg. Score: {calculateAverageScore(results)}%
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 py-2">
                  <div className="space-y-4">
                    {results.map((result) => (
                      <div key={result.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">
                              {getQuizTitle(result.quiz_id)}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <span>
                                Score: {result.score}/{result.total_questions} ({Math.round(result.score / result.total_questions * 100)}%)
                              </span>
                              <span>•</span>
                              <span>{formatDate(result.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge>
                              {getLearningModeLabel(result.learning_option)}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchQuizResponses(result.id)}
                            >
                              {selectedQuiz === result.id ? 'Hide Details' : 'View Details'}
                            </Button>
                          </div>
                        </div>

                        {selectedQuiz === result.id && (
                          <div className="mt-4">
                            {isLoadingResponses ? (
                              <div className="flex items-center justify-center py-4">
                                <Skeleton className="h-4 w-full" />
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Feedback section */}
                                {result.feedback && (
                                  <div className="bg-gray-50 p-3 rounded-md">
                                    <h5 className="font-medium mb-2">Feedback</h5>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">
                                      {result.feedback}
                                    </p>
                                  </div>
                                )}

                                {/* Strengths & Weaknesses */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {result.strength_areas?.length > 0 && (
                                    <div className="bg-emerald-50 p-3 rounded-md">
                                      <h5 className="font-medium mb-2 text-emerald-800">Strengths</h5>
                                      <ul className="text-sm space-y-1 text-emerald-700">
                                        {result.strength_areas.map((strength, i) => (
                                          <li key={i} className="list-disc list-inside">
                                            {strength}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {result.weakness_areas?.length > 0 && (
                                    <div className="bg-amber-50 p-3 rounded-md">
                                      <h5 className="font-medium mb-2 text-amber-800">Areas to Improve</h5>
                                      <ul className="text-sm space-y-1 text-amber-700">
                                        {result.weakness_areas.map((weakness, i) => (
                                          <li key={i} className="list-disc list-inside">
                                            {weakness}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Individual Questions */}
                                {quizResponses.length > 0 && (
                                  <div className="border-t border-gray-100 pt-4 mt-4">
                                    <h5 className="font-medium mb-3">Question Details</h5>
                                    <div className="space-y-3">
                                      {quizResponses.map((response) => (
                                        <div
                                          key={response.id}
                                          className={`p-3 rounded-md ${
                                            response.is_correct
                                              ? "bg-green-50 border border-green-200"
                                              : "bg-red-50 border border-red-200"
                                          }`}
                                        >
                                          <p className="font-medium text-gray-900">
                                            {response.question_text}
                                          </p>
                                          <p className="text-sm mt-1">
                                            <span
                                              className={
                                                response.is_correct
                                                  ? "text-green-600"
                                                  : "text-red-600"
                                              }
                                            >
                                              {response.is_correct ? "Correct" : "Incorrect"}
                                            </span>
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
