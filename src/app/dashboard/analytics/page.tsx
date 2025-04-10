"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserConversations } from "@/app/api/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import type { Conversation } from "@/app/api/actions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Define types for ReactMarkdown components
type CodeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean;
};

interface QuizResult {
  id: string;
  quiz_id: string;
  user_id: number;
  conversation_id?: string;
  score: number;
  total_questions: number;
  feedback: string;
  learning_option: string;
  strength_areas: string[];
  weakness_areas: string[];
  created_at: string;
}

export default function AnalyticsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [isAiFeedbackOpen, setIsAiFeedbackOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    fetchQuizResults();
  }, []);

  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    setError(null);
    
    try {
      const response = await getUserConversations();

      if (response.success && response.conversations) {
        setConversations(response.conversations);
      } else {
        setError(response.error || "Failed to fetch conversations");
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("An unexpected error occurred while fetching conversations");
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchQuizResults = async () => {
    setIsLoadingQuizzes(true);
    
    try {
      const response = await fetch("/api/quiz-results/user");

      if (!response.ok) {
        throw new Error(`Failed to fetch quiz results: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        if (Array.isArray(data.results) && data.results.length > 0) {
          setQuizResults(data.results);
        } else {
          setQuizResults([]);
        }
      } else {
        setError(data.error || "Failed to fetch quiz results");
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleGenerateAIFeedback = async () => {
    setIsGeneratingFeedback(true);
    setAiFeedback("");
    setIsAiFeedbackOpen(true);
    
    try {
      // Calculate basic statistics to send to the AI
      const totalSessions = conversations.length;
      const sessionsPerWeek = calculateSessionsPerWeek(conversations);
      const averageQuizScore = calculateAverageQuizScore(quizResults);
      const learningDistribution = calculateLearningDistribution(conversations);
      const commonWeaknesses = getCommonWeaknesses(quizResults);
      const commonStrengths = getCommonStrengths(quizResults);
      
      const response = await fetch("/api/analytics-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stats: {
            totalSessions,
            sessionsPerWeek,
            averageQuizScore,
            learningDistribution,
            commonWeaknesses,
            commonStrengths,
            totalQuizzes: quizResults.length,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate feedback: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAiFeedback(data.feedback);
      } else {
        throw new Error(data.error || "Failed to generate feedback");
      }
    } catch (error) {
      console.error("Error generating AI feedback:", error);
      setAiFeedback("Sorry, we couldn't generate feedback at this time. Please try again later.");
      toast.error("Failed to generate feedback");
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  // Calculate number of sessions per week
  const calculateSessionsPerWeek = (sessions: Conversation[]): number => {
    if (sessions.length === 0) return 0;
    
    // Get the date of the oldest session
    const oldestSession = sessions.reduce((oldest, current) => {
      const oldestDate = new Date(oldest.created_at).getTime();
      const currentDate = new Date(current.created_at).getTime();
      return currentDate < oldestDate ? current : oldest;
    }, sessions[0]);
    
    const oldestDate = new Date(oldestSession.created_at);
    const currentDate = new Date();
    
    // Calculate the difference in weeks
    const diffTime = Math.abs(currentDate.getTime() - oldestDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
    
    // If less than a week, return the count directly
    if (diffWeeks === 0) return sessions.length;
    
    return parseFloat((sessions.length / diffWeeks).toFixed(1));
  };
  
  // Calculate average quiz score as a percentage
  const calculateAverageQuizScore = (quizzes: QuizResult[]): number => {
    if (quizzes.length === 0) return 0;
    
    const totalPercentage = quizzes.reduce((sum, quiz) => {
      return sum + (quiz.score / quiz.total_questions * 100);
    }, 0);
    
    return Math.round(totalPercentage / quizzes.length);
  };
  
  // Calculate distribution of learning options
  const calculateLearningDistribution = (sessions: Conversation[]): Record<string, number> => {
    if (sessions.length === 0) return {};
    
    const distribution: Record<string, number> = {};
    
    sessions.forEach(session => {
      const option = session.learning_option;
      distribution[option] = (distribution[option] || 0) + 1;
    });
    
    return distribution;
  };
  
  // Get common weaknesses from quiz results
  const getCommonWeaknesses = (quizzes: QuizResult[]): string[] => {
    if (quizzes.length === 0) return [];
    
    // Create a frequency map of weaknesses
    const weaknessMap: Record<string, number> = {};
    
    quizzes.forEach(quiz => {
      if (Array.isArray(quiz.weakness_areas)) {
        quiz.weakness_areas.forEach(weakness => {
          weaknessMap[weakness] = (weaknessMap[weakness] || 0) + 1;
        });
      }
    });
    
    // Sort by frequency
    return Object.entries(weaknessMap)
      .sort((a, b) => b[1] - a[1])
      .map(([weakness]) => weakness)
      .slice(0, 5); // Take top 5
  };
  
  // Get common strengths from quiz results
  const getCommonStrengths = (quizzes: QuizResult[]): string[] => {
    if (quizzes.length === 0) return [];
    
    // Create a frequency map of strengths
    const strengthMap: Record<string, number> = {};
    
    quizzes.forEach(quiz => {
      if (Array.isArray(quiz.strength_areas)) {
        quiz.strength_areas.forEach(strength => {
          strengthMap[strength] = (strengthMap[strength] || 0) + 1;
        });
      }
    });
    
    // Sort by frequency
    return Object.entries(strengthMap)
      .sort((a, b) => b[1] - a[1])
      .map(([strength]) => strength)
      .slice(0, 5); // Take top 5
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Group sessions by week
  const groupSessionsByWeek = (sessions: Conversation[]): Record<string, number> => {
    if (sessions.length === 0) return {};
    
    const weeks: Record<string, number> = {};
    
    sessions.forEach(session => {
      const date = new Date(session.created_at);
      // Get the week start date (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      
      const weekKey = formatDate(weekStart.toISOString());
      weeks[weekKey] = (weeks[weekKey] || 0) + 1;
    });
    
    return weeks;
  };

  // Get learning option display name
  const getLearningOptionDisplay = (option: string): string => {
    const options: Record<string, string> = {
      memorizing: "Memorization",
      understanding: "Understanding",
      testing: "Testing Knowledge",
      reinforcement: "Reinforcement",
    };

    return options[option] || option.charAt(0).toUpperCase() + option.slice(1);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-4">
        <Card className="bg-red-900/20">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-300">{error}</p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                fetchConversations();
                fetchQuizResults();
              }}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-white">Learning Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Sessions Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Learning Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingConversations ? (
              <Skeleton className="h-14 w-20 bg-slate-800" />
            ) : (
              <div className="text-4xl font-bold">{conversations.length}</div>
            )}
          </CardContent>
        </Card>
        
        {/* Sessions Per Week Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sessions Per Week</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingConversations ? (
              <Skeleton className="h-14 w-20 bg-slate-800" />
            ) : (
              <div className="text-4xl font-bold">{calculateSessionsPerWeek(conversations)}</div>
            )}
          </CardContent>
        </Card>
        
        {/* Quiz Performance Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average Quiz Score</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingQuizzes ? (
              <Skeleton className="h-14 w-20 bg-slate-800" />
            ) : (
              <div className="text-4xl font-bold">
                {calculateAverageQuizScore(quizResults)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Activity Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription className="text-slate-400">
              Number of sessions completed each week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingConversations ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-slate-800" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                No learning sessions yet
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(groupSessionsByWeek(conversations))
                  .slice(-5) // Get the last 5 weeks
                  .map(([week, count]) => (
                    <div key={week} className="flex items-center">
                      <div className="w-24 text-sm text-slate-400">{week}</div>
                      <div className="flex-1 h-8 bg-slate-800 rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-blue-600" 
                          style={{ 
                            width: `${Math.min(100, (count / 7) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="w-10 text-right text-sm text-slate-300">{count}</div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Learning Methods Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader>
            <CardTitle>Learning Methods</CardTitle>
            <CardDescription className="text-slate-400">
              Distribution of learning methods used
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingConversations ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-slate-800" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                No learning sessions yet
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(calculateLearningDistribution(conversations)).map(([option, count]) => (
                  <div key={option} className="flex items-center">
                    <div className="w-32 text-sm text-slate-300">
                      {getLearningOptionDisplay(option)}
                    </div>
                    <div className="flex-1 h-8 bg-slate-800 rounded-sm overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600" 
                        style={{ 
                          width: `${(count / conversations.length) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="w-10 text-right text-sm text-slate-300">{count}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Common Strengths Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader>
            <CardTitle>Top Strengths</CardTitle>
            <CardDescription className="text-slate-400">
              Areas where you perform well
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingQuizzes ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-slate-800" />
                ))}
              </div>
            ) : quizResults.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                No quiz data available yet
              </p>
            ) : (
              <ul className="space-y-2">
                {getCommonStrengths(quizResults).length > 0 ? (
                  getCommonStrengths(quizResults).map((strength, index) => (
                    <li key={index} className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span className="text-slate-200">{strength}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4">
                    No strengths data available yet
                  </p>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
        
        {/* Common Weaknesses Card */}
        <Card className="bg-slate-900 text-white border-slate-800">
          <CardHeader>
            <CardTitle>Areas to Improve</CardTitle>
            <CardDescription className="text-slate-400">
              Topics you might want to focus on
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingQuizzes ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full bg-slate-800" />
                ))}
              </div>
            ) : quizResults.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                No quiz data available yet
              </p>
            ) : (
              <ul className="space-y-2">
                {getCommonWeaknesses(quizResults).length > 0 ? (
                  getCommonWeaknesses(quizResults).map((weakness, index) => (
                    <li key={index} className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <AlertCircleIcon className="h-5 w-5 text-amber-500" />
                      <span className="text-slate-200">{weakness}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4">
                    No improvement areas data available yet
                  </p>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* AI Feedback Section */}
      <div className="mt-10 mb-8 flex justify-center">
        <Button 
          className="bg-white/20 hover:bg-white/30 text-white py-6 px-8 text-xl rounded-lg"
          onClick={handleGenerateAIFeedback}
          disabled={isGeneratingFeedback || (conversations.length === 0 && quizResults.length === 0)}
        >
          <BrainCircuitIcon className="h-6 w-6 mr-2" />
          Get AI Insights on Your Learning
        </Button>
      </div>
      
      {/* AI Feedback Dialog */}
      <Dialog open={isAiFeedbackOpen} onOpenChange={setIsAiFeedbackOpen}>
        <DialogContent className="bg-black text-white border-slate-800 max-w-3xl max-h-[calc(100vh-40px)] h-[calc(100vh-40px)] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>AI Learning Insights</DialogTitle>
            <DialogDescription className="text-white/70">
              Personalized feedback and recommendations based on your learning data
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 overflow-y-auto pr-4 flex-grow" style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#4B5563 transparent' }}>
            {isGeneratingFeedback ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="flex space-x-2 justify-center items-center mb-4">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                </div>
                <p className="text-white">Analyzing your learning patterns...</p>
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none overflow-hidden">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: (props) => (
                      <a
                        {...props}
                        className="text-white underline hover:text-slate-300"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                    ul: (props) => (
                      <ul
                        {...props}
                        className="list-disc pl-5 space-y-1 text-white"
                      />
                    ),
                    ol: (props) => (
                      <ol
                        {...props}
                        className="list-decimal pl-5 space-y-1 text-white"
                      />
                    ),
                    code: ({ inline, ...props }: CodeProps) =>
                      inline ? (
                        <code
                          {...props}
                          className="bg-slate-700 px-1 py-0.5 rounded text-sm text-white"
                        />
                      ) : (
                        <code
                          {...props}
                          className="block bg-slate-700 p-2 rounded-md overflow-x-auto text-sm my-2 text-white whitespace-pre-wrap break-words"
                        />
                      ),
                    pre: (props) => (
                      <pre
                        {...props}
                        className="bg-transparent p-0 overflow-x-auto text-white whitespace-pre-wrap break-words"
                      />
                    ),
                    h1: (props) => (
                      <h1
                        {...props}
                        className="text-xl font-bold mt-4 mb-2 text-white"
                      />
                    ),
                    h2: (props) => (
                      <h2
                        {...props}
                        className="text-lg font-bold mt-3 mb-1 text-white"
                      />
                    ),
                    h3: (props) => (
                      <h3
                        {...props}
                        className="text-md font-bold mt-2 mb-1 text-white"
                      />
                    ),
                    blockquote: (props) => (
                      <blockquote
                        {...props}
                        className="border-l-2 border-white/30 pl-3 italic text-white"
                      />
                    ),
                    p: (props) => <p {...props} className="text-white mb-4" />,
                  }}
                >
                  {aiFeedback || "No AI feedback available. Please try generating insights again."}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-shrink-0 mt-2 pt-2 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsAiFeedbackOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function BrainCircuitIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08A2.5 2.5 0 0 0 12 19.5a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5" />
      <path d="m15.7 10.4-.9.4" />
      <path d="m9.2 13.2.9-.4" />
      <path d="m13.6 15.7-.4-.9" />
      <path d="m10.8 9.2-.4.9" />
      <path d="m15.7 13.5-.9-.4" />
      <path d="m9.2 10.9.9.4" />
      <path d="m10.5 15.7.4-.9" />
      <path d="m13.1 9.2.4.9" />
    </svg>
  );
} 