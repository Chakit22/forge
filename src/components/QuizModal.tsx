import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Quiz, QuizQuestion } from "@/app/api/quiz-generator/route";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";
import { QuizResultRequest } from "@/app/api/quiz-results/route";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  isLoading: boolean;
  learningOption: string;
  onQuizComplete?: (
    feedback: string,
    strengths: string[],
    weaknesses: string[]
  ) => void;
}

export default function QuizModal({
  open,
  onOpenChange,
  quiz,
  isLoading,
  learningOption,
  onQuizComplete,
}: QuizModalProps) {
  const { user } = useUser();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [isSavingResults, setIsSavingResults] = useState(false);
  const [activeTab, setActiveTab] = useState("results");
  const [quizComplete, setQuizComplete] = useState(false);

  // Reset states when the quiz changes or modal closes
  React.useEffect(() => {
    if (!open) {
      setCurrentQuestionIndex(0);
      setSelectedOptions([]);
      setShowResults(false);
      setScore(0);
      setFeedback("");
      setStrengths([]);
      setWeaknesses([]);
      setIsSavingResults(false);
      setActiveTab("results");
      setQuizComplete(false);
    }
  }, [quiz, open]);

  if (!quiz && !isLoading) {
    return null;
  }

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    const newSelectedOptions = [...selectedOptions];
    newSelectedOptions[questionIndex] = optionIndex;
    setSelectedOptions(newSelectedOptions);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate score
      let newScore = 0;
      quiz?.questions?.forEach((question, index) => {
        if (selectedOptions[index] === question.correctAnswerIndex) {
          newScore++;
        }
      });
      setScore(newScore);
      setShowResults(true);
      setQuizComplete(true);

      // Save quiz results if user is logged in
      if (user && quiz) {
        saveQuizResults(newScore, quiz.questions.length);
      } else {
        toast.warning("Sign in to save your quiz results");
      }
    }
  };

  const saveQuizResults = async (finalScore: number, totalQs: number, retryCount = 0) => {
    if (!user || !quiz || !quiz.questions || quiz.questions.length === 0)
      return;

    try {
      setIsSavingResults(true);

      const quizResultData: QuizResultRequest = {
        quizTitle: quiz.title,
        userId: user.id,
        score: finalScore,
        totalQuestions: totalQs,
        questions: quiz.questions,
        selectedOptions,
        learningOption,
      };

      console.log('Sending quiz results:', {
        quizTitle: quizResultData.quizTitle,
        userId: quizResultData.userId,
        score: quizResultData.score,
        totalQuestions: quizResultData.totalQuestions,
        selectedOptionsCount: quizResultData.selectedOptions.length,
        questionsCount: quizResultData.questions.length,
        learningOption: quizResultData.learningOption
      });

      const response = await fetch("/api/quiz-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizResultData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: "Failed to parse error response" }));
        console.error('Error response from API:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.details || `Failed to save quiz results (${response.status})`);
      }

      const data = await response.json();
      console.log('API response data:', data);

      if (data.success && data.result) {
        // Extract feedback and analysis data from the result
        const resultFeedback = data.result.feedback || "";
        const resultStrengths = data.result.strength_areas || [];
        const resultWeaknesses = data.result.weakness_areas || [];
        
        console.log('Received feedback and analysis:', {
          feedbackLength: resultFeedback.length,
          strengthsCount: resultStrengths.length,
          weaknessesCount: resultWeaknesses.length
        });
        
        setFeedback(resultFeedback);
        setStrengths(resultStrengths);
        setWeaknesses(resultWeaknesses);
        toast.success("Quiz results saved!");

        // Send results back to parent component
        if (onQuizComplete) {
          onQuizComplete(
            resultFeedback,
            resultStrengths,
            resultWeaknesses
          );
        }
      } else {
        console.error('Invalid response format:', data);
        toast.error("Saved quiz results but couldn't load feedback");
      }
    } catch (error) {
      console.error("Error saving quiz results:", error);
      
      // Implement a simple retry mechanism for transient errors
      if (retryCount < 2) {
        console.log(`Retrying save operation (attempt ${retryCount + 1} of 2)...`);
        toast.info("Retrying to save results...");
        
        // Wait a moment before retrying
        setTimeout(() => {
          saveQuizResults(finalScore, totalQs, retryCount + 1);
        }, 2000);
        return;
      }
      
      toast.error(error instanceof Error ? error.message : "Error saving quiz results");
    } finally {
      if (retryCount === 0) {
        setIsSavingResults(false);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptions([]);
    setShowResults(false);
    setScore(0);
    setFeedback("");
    setStrengths([]);
    setWeaknesses([]);
    setActiveTab("results");
  };

  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  const hasAnsweredCurrentQuestion =
    selectedOptions[currentQuestionIndex] !== undefined;
  const totalQuestions = quiz?.questions?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black text-white border-gray-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {isLoading || isSavingResults ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                {isLoading ? "Loading Quiz" : "Analyzing Results"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
              <p className="text-white text-lg">
                {isLoading
                  ? "Generating quiz questions..."
                  : "Analyzing your performance..."}
              </p>
            </div>
          </>
        ) : showResults ? (
          // Results view
          <div className="py-4 flex-1 overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                Quiz Results
              </DialogTitle>
              <DialogDescription className="text-white/70 text-lg mt-2">
                You scored {score} out of {totalQuestions}!
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="mt-4 flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="w-full justify-start bg-black border-b border-white/10">
                <TabsTrigger
                  value="results"
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70"
                >
                  Results
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  disabled={!feedback}
                  className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 disabled:opacity-50"
                >
                  Feedback
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="results"
                className="px-1 py-4 flex-1 overflow-auto data-[state=active]:flex data-[state=active]:flex-col"
              >
                <div className="space-y-4">
                  {quiz?.questions?.map((question, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-md ${
                        selectedOptions[index] === question.correctAnswerIndex
                          ? "bg-white/10 border border-white/20"
                          : "bg-black/50 border border-red-500/30"
                      }`}
                    >
                      <p className="font-medium mb-2">
                        {index + 1}. {question.question}
                      </p>
                      <div className="pl-4 space-y-1">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-2 rounded ${
                              optIndex === question.correctAnswerIndex
                                ? "bg-white/20 text-white"
                                : selectedOptions[index] === optIndex
                                ? "bg-red-900/30 text-white/80"
                                : "text-white/80"
                            }`}
                          >
                            {option}
                            {optIndex === question.correctAnswerIndex && (
                              <span className="ml-2">✓</span>
                            )}
                            {selectedOptions[index] === optIndex &&
                              optIndex !== question.correctAnswerIndex && (
                                <span className="ml-2">✗</span>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent
                value="feedback"
                className="mt-0 px-1 py-4 flex-1 overflow-auto"
              >
                {feedback ? (
                  <div className="space-y-6">
                    <div className="whitespace-pre-line bg-white/5 p-4 rounded-md">
                      {feedback}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-md">
                        <h3 className="font-medium text-lg mb-2 flex items-center">
                          <span className="mr-2">💪</span> Strengths
                        </h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {strengths.map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white/5 p-4 rounded-md">
                        <h3 className="font-medium text-lg mb-2 flex items-center">
                          <span className="mr-2">🎯</span> Areas to Improve
                        </h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {weaknesses.map((weakness, i) => (
                            <li key={i}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/70">
                    Feedback not available.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={handleRestart}
                className="bg-transparent border-white/20 text-white hover:bg-white/10"
              >
                Restart Quiz
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Quiz questions view
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                {quiz?.title || "Quiz"}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </DialogDescription>
            </DialogHeader>

            {currentQuestion && (
              <div className="py-4">
                <p className="text-lg font-medium mb-4 text-white">
                  {currentQuestion.question}
                </p>
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        selectedOptions[currentQuestionIndex] === index
                          ? "bg-white/20 text-white"
                          : "bg-black/50 text-white/80 hover:bg-white/10"
                      }`}
                      onClick={() =>
                        handleOptionSelect(currentQuestionIndex, index)
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="bg-transparent border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextQuestion}
                disabled={!hasAnsweredCurrentQuestion}
                className="bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
              >
                {currentQuestionIndex === totalQuestions - 1
                  ? "Finish"
                  : "Next"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
