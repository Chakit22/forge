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

  const saveQuizResults = async (finalScore: number, totalQs: number) => {
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

      const response = await fetch("/api/quiz-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizResultData),
      });

      const data = await response.json();

      if (data.success && data.result) {
        setFeedback(data.result.feedback || "");
        setStrengths(data.result.strength_areas || []);
        setWeaknesses(data.result.weakness_areas || []);
        toast.success("Quiz results saved!");

        // Send results back to parent component
        if (onQuizComplete) {
          onQuizComplete(
            data.result.feedback || "",
            data.result.strength_areas || [],
            data.result.weakness_areas || []
          );
        }
      } else {
        toast.error("Failed to save quiz results");
      }
    } catch (error) {
      console.error("Error saving quiz results:", error);
      toast.error("Error saving quiz results");
    } finally {
      setIsSavingResults(false);
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
      <DialogContent className="bg-teal-700 text-white border-teal-600 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
              className="mt-6 flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="bg-teal-600/30 w-full">
                <TabsTrigger
                  value="results"
                  className="data-[state=active]:bg-teal-500 text-white data-[state=active]:text-white"
                >
                  Questions
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="data-[state=active]:bg-teal-500 text-white data-[state=active]:text-white"
                >
                  Feedback
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="data-[state=active]:bg-teal-500 text-white data-[state=active]:text-white"
                >
                  Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="results"
                className="mt-4 space-y-4 overflow-y-auto pr-2 flex-1"
              >
                {quiz?.questions?.map((question, index) => (
                  <div key={index} className="bg-teal-600/30 rounded-lg p-4">
                    <p className="font-medium mb-2">
                      Question {index + 1}: {question.question}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-2 rounded-md flex items-center ${
                            optionIndex === question.correctAnswerIndex
                              ? "bg-green-500/30 border border-green-400"
                              : selectedOptions[index] === optionIndex &&
                                selectedOptions[index] !==
                                  question.correctAnswerIndex
                              ? "bg-red-500/30 border border-red-400"
                              : "bg-teal-600/20"
                          }`}
                        >
                          <div
                            className={`mr-2 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border ${
                              selectedOptions[index] === optionIndex
                                ? "border-white bg-white/20"
                                : "border-white/50"
                            }`}
                          >
                            {selectedOptions[index] === optionIndex && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                          {optionIndex === question.correctAnswerIndex && (
                            <span className="ml-2 text-xs bg-green-500/30 px-2 py-0.5 rounded-full">
                              Correct
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {quizComplete && selectedOptions[index] !== undefined && (
                      <div className="mt-2 text-xs bg-teal-800/50 p-2 rounded">
                        <p className="font-medium mb-1">Explanation:</p>
                        <p>{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent
                value="feedback"
                className="mt-4 overflow-y-auto pr-2 flex-1"
              >
                {feedback ? (
                  <div className="bg-teal-600/30 rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3">
                      Personalized Feedback
                    </h3>
                    <div className="whitespace-pre-line">{feedback}</div>
                  </div>
                ) : (
                  <div className="bg-teal-600/30 rounded-lg p-4 text-center">
                    <p>
                      Sign in to get personalized feedback on your performance
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="analysis"
                className="mt-4 overflow-y-auto pr-2 flex-1"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-teal-600/30 rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <span className="mr-2">💪</span> Your Strengths
                    </h3>
                    {strengths.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-2">
                        {strengths.map((strength, i) => (
                          <li key={i} className="text-green-200">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">No strengths identified yet.</p>
                    )}
                  </div>

                  <div className="bg-teal-600/30 rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3 flex items-center">
                      <span className="mr-2">🎯</span> Areas to Improve
                    </h3>
                    {weaknesses.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-2">
                        {weaknesses.map((weakness, i) => (
                          <li key={i} className="text-yellow-200">
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">
                        No areas for improvement identified yet.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6 gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-white border-white/30 hover:bg-white/10"
              >
                Close
              </Button>
              <Button
                onClick={handleRestart}
                className="bg-teal-600 hover:bg-teal-500 text-white"
              >
                Restart Quiz
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Question view
          <div className="py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">
                {quiz?.title}
              </DialogTitle>
              <DialogDescription className="text-white/70 text-lg mt-2">
                {quiz?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-white/70">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span className="text-sm font-medium bg-teal-600/40 px-2 py-1 rounded">
                  {Math.round(
                    ((currentQuestionIndex + 1) / totalQuestions) * 100
                  )}
                  % Complete
                </span>
              </div>

              {currentQuestion && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    {currentQuestion.question}
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-md cursor-pointer transition-all flex items-center ${
                          selectedOptions[currentQuestionIndex] === optionIndex
                            ? "bg-teal-500/30 border border-teal-400"
                            : "bg-teal-600/20 hover:bg-teal-600/40"
                        }`}
                        onClick={() =>
                          handleOptionSelect(currentQuestionIndex, optionIndex)
                        }
                      >
                        <div
                          className={`mr-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${
                            selectedOptions[currentQuestionIndex] ===
                            optionIndex
                              ? "border-white bg-white/20"
                              : "border-white/50"
                          }`}
                        >
                          {selectedOptions[currentQuestionIndex] ===
                            optionIndex && (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>

                  {/* Don't show explanation during quiz, only after completion */}
                  {hasAnsweredCurrentQuestion && quizComplete && (
                    <div className="mt-4 bg-teal-600/30 p-3 rounded-md">
                      <p className="font-medium mb-1">Explanation:</p>
                      <p className="text-sm">{currentQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-white border-white/30 hover:bg-white/10"
              >
                Cancel
              </Button>
              <div className="flex-1 flex justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="text-white hover:bg-teal-600/30 disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  disabled={!hasAnsweredCurrentQuestion}
                  className="bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50"
                >
                  {currentQuestionIndex === totalQuestions - 1
                    ? "Finish"
                    : "Next"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
