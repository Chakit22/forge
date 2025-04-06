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

interface QuizResult {
  id: string;
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
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
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
      const response = await fetch("/api/quiz-results/user");

      if (!response.ok) {
        throw new Error(`Failed to fetch quiz results: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setQuizResults(data.results);
      } else {
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
            <p className="text-gray-500 mb-4">
              Complete a quiz to see your performance analysis
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {quizResults.map((result) => (
              <AccordionItem
                key={result.id}
                value={result.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getQuizTitle(result.quiz_id)}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {getLearningModeLabel(result.learning_option)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>
                        Score: {result.score}/{result.total_questions}
                      </span>
                      <span>•</span>
                      <span>{formatDate(result.created_at)}</span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 py-2">
                  <div className="space-y-4">
                    {/* Strengths */}
                    {result.strength_areas && result.strength_areas.length > 0 && (
                      <div className="bg-white/10 p-3 rounded-md">
                        <h4 className="font-medium text-white mb-2">
                          Your Strengths
                        </h4>
                        <ul className="list-disc pl-5">
                          {result.strength_areas.map((strength, idx) => (
                            <li key={idx} className="text-white">
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {result.weakness_areas && result.weakness_areas.length > 0 && (
                      <div className="bg-white/10 p-3 rounded-md">
                        <h4 className="font-medium text-white mb-2">
                          Areas to Improve
                        </h4>
                        <ul className="list-disc pl-5">
                          {result.weakness_areas.map((weakness, idx) => (
                            <li key={idx} className="text-white">
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Full details button */}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchQuizResponses(result.id)}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        {selectedQuiz === result.id
                          ? "Hide Detailed Responses"
                          : "View Detailed Responses"}
                      </Button>
                    </div>

                    {/* Question responses */}
                    {selectedQuiz === result.id && (
                      <div className="mt-4">
                        {isLoadingResponses ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
                            <p className="mt-2 text-white">
                              Loading responses...
                            </p>
                          </div>
                        ) : quizResponses.length === 0 ? (
                          <p className="text-white">
                            No detailed responses available for this quiz.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {quizResponses.map((response, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-md ${
                                  response.is_correct
                                    ? "bg-white/10 border border-white/20"
                                    : "bg-black/50 border border-red-500/30"
                                }`}
                              >
                                <p className="font-medium mb-2">
                                  Question {idx + 1}: {response.question_text}
                                </p>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      response.is_correct
                                        ? "bg-white/20 text-white"
                                        : "bg-red-900/30 text-white"
                                    }`}
                                  >
                                    {response.is_correct ? "Correct" : "Incorrect"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
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
