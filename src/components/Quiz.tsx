import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface QuizProps {
  questions: QuizQuestion[];
  onClose: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const Quiz = ({ questions, onClose }: QuizProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(questions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  useEffect(() => {
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setShowExplanation(false);
  }, [questions]);

  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.info('Selecteer eerst een antwoord');
      return;
    }

    setIsAnswerSubmitted(true);
    
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setShowExplanation(false);
  };

  const handleToggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  if (quizQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Quiz</h2>
        <p className="text-center text-muted-foreground">
          Test je kennis met een AI-gegenereerde quiz over dit boek.
        </p>

        <div className="w-full max-w-[600px]">
          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertTitle>Fout</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {timeoutOccurred && (
            <Alert className="my-4 border-orange-500">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertTitle className="text-orange-500">Timeout</AlertTitle>
              <AlertDescription>
                De verbinding met de server duurde te lang. Dit kan gebeuren als de server te druk is of als er problemen zijn met de internetverbinding.
              </AlertDescription>
            </Alert>
          )}
          
          {isGeneratingQuiz ? (
            <div className="w-full max-w-md my-4 flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-center mb-2">Quiz wordt gegenereerd...</p>
              <Progress value={undefined} className="h-2 w-full animate-pulse" />
              <p className="text-xs text-center mt-2 text-muted-foreground">
                Dit kan tot 30 seconden duren. Even geduld...
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleRestartQuiz} 
              disabled={isLoading}
              size="lg"
              className="mt-4 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Quiz genereren...
                </>
              ) : (
                'Start Quiz'
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
  
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="w-full max-w-[600px]">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-center">
            {isQuizComplete ? "Quiz voltooid!" : "Quiz"}
          </h2>
          <p className="text-center text-muted-foreground">
            {isQuizComplete ? (
              "Bekijk hieronder je resultaten"
            ) : (
              `Vraag ${currentQuestionIndex + 1} van ${quizQuestions.length}`
            )}
          </p>
        </div>

        {isQuizComplete ? (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-full max-w-md">
              <Progress 
                value={Math.round((score / quizQuestions.length) * 100)} 
                className="h-6" 
              />
              <p className="text-center mt-2 text-sm text-muted-foreground">
                {Math.round((score / quizQuestions.length) * 100)}% correct
              </p>
            </div>
            
            <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
              <span className="text-4xl font-bold">{score}/{quizQuestions.length}</span>
            </div>
            
            <p className="text-center text-lg">
              Je hebt {score} van de {quizQuestions.length} vragen goed beantwoord.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button onClick={handleRestartQuiz} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Opnieuw proberen
              </Button>
              
              <Button onClick={onClose}>
                Sluiten
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedAnswer?.toString()}
                onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                className="space-y-3"
                disabled={isAnswerSubmitted}
              >
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 rounded-lg border p-4 ${
                      isAnswerSubmitted
                        ? index === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : index === selectedAnswer
                          ? 'border-red-500 bg-red-50'
                          : ''
                        : 'hover:border-primary'
                    }`}
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-grow cursor-pointer"
                    >
                      {option}
                    </Label>
                    {isAnswerSubmitted && (
                      <div className="ml-2">
                        {index === currentQuestion.correctAnswer ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : index === selectedAnswer ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </RadioGroup>

              {isAnswerSubmitted && showExplanation && (
                <Alert className="mt-4">
                  <HelpCircle className="h-4 w-4" />
                  <AlertTitle>Uitleg</AlertTitle>
                  <AlertDescription>
                    {currentQuestion.explanation}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleExplanation}
                  disabled={!isAnswerSubmitted}
                >
                  {showExplanation ? 'Verberg uitleg' : 'Toon uitleg'}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                {!isAnswerSubmitted ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswer === null}
                  >
                    Controleer antwoord
                  </Button>
                ) : (
                  <Button onClick={handleNextQuestion}>
                    {currentQuestionIndex < quizQuestions.length - 1 ? (
                      <>
                        Volgende vraag
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      'Bekijk resultaten'
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Quiz;
