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
  CardTitle 
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface QuizResult {
  id: number;
  quiz_id: string;
  user_id: number;
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
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

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
      const response = await fetch('/api/quiz-results/user');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch quiz results: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setQuizResults(data.results);
      } else {
        setError(data.error || 'Failed to fetch quiz results');
      }
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuizResponses = async (resultId: number) => {
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
        setError(data.error || 'Failed to fetch quiz responses');
      }
    } catch (error) {
      console.error('Error fetching quiz responses:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingResponses(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getQuizTitle = (quizId: string) => {
    // Extract the title from the quiz_id (format: title-timestamp)
    const parts = quizId.split('-');
    const timestamp = parts.pop(); // Remove the timestamp
    return parts.join('-').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getLearningModeLabel = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'detailed':
        return 'Detailed';
      case 'concise':
        return 'Concise';
      case 'visual':
        return 'Visual';
      case 'normal':
      default:
        return 'Normal';
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
        <CardTitle>Quiz Performance</CardTitle>
        <CardDescription>
          {quizResults.length > 0 
            ? "View your quiz history and track your progress" 
            : "You haven't taken any quizzes yet"}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {quizResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Complete a quiz to see your performance analysis</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {quizResults.map((result) => (
              <AccordionItem
                key={result.id}
                value={result.id.toString()}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getQuizTitle(result.quiz_id)}</span>
                      <Badge variant="outline" className="ml-2">
                        {getLearningModeLabel(result.learning_option)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Score: {result.score}/{result.total_questions}</span>
                      <span>•</span>
                      <span>{formatDate(result.created_at)}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-4 py-2">
                  <div className="space-y-4">
                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-3 rounded-md">
                        <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
                        {result.strength_areas.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-1">
                            {result.strength_areas.map((strength, idx) => (
                              <li key={idx} className="text-green-700">{strength}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 italic">No strengths identified</p>
                        )}
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded-md">
                        <h4 className="font-medium text-yellow-800 mb-2">Areas to Improve</h4>
                        {result.weakness_areas.length > 0 ? (
                          <ul className="list-disc pl-5 space-y-1">
                            {result.weakness_areas.map((weakness, idx) => (
                              <li key={idx} className="text-yellow-700">{weakness}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 italic">No weaknesses identified</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Feedback */}
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium text-gray-800 mb-2">Personalized Feedback</h4>
                      <p className="text-gray-700 whitespace-pre-line">{result.feedback}</p>
                    </div>
                    
                    {/* View Details Button */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchQuizResponses(result.id)}
                        className="mt-2"
                      >
                        {selectedQuiz === result.id ? "Hide Details" : "View Question Details"}
                      </Button>
                    </div>
                    
                    {/* Question Details */}
                    {selectedQuiz === result.id && (
                      <div className="mt-4">
                        {isLoadingResponses ? (
                          <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ) : quizResponses.length > 0 ? (
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
                                <p className="font-medium mb-1">
                                  {response.question_text}
                                </p>
                                <div className="flex items-center">
                                  <Badge 
                                    variant={response.is_correct ? "success" : "destructive"}
                                    className="mr-2"
                                  >
                                    {response.is_correct ? "Correct" : "Incorrect"}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    Your answer: Option {response.selected_option_index + 1}
                                    {!response.is_correct && ` (Correct: Option ${response.correct_option_index + 1})`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500">No detailed responses available</p>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-4 flex justify-center">
        <Button variant="outline" onClick={fetchQuizResults}>
          Refresh Quiz Results
        </Button>
      </CardFooter>
    </Card>
  );
} 