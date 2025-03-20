
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { QuizQuestion } from '@/hooks/useQuiz';

interface QuizProps {
  questions: QuizQuestion[];
  onClose: () => void;
  open: boolean;
  title?: string;
  error: string | null;
  isGenerating: boolean;
  
  // New props from useQuiz hook
  currentQuestionIndex: number;
  selectedAnswer: number | null;
  isAnswerSubmitted: boolean;
  score: number;
  isQuizComplete: boolean;
  handleAnswerSelect: (index: number) => void;
  handleSubmitAnswer: () => void;
  handleNextQuestion: () => void;
  restartQuiz: () => void;
}

const Quiz = ({ 
  questions, 
  onClose, 
  open, 
  title = "Quiz", 
  error, 
  isGenerating,
  currentQuestionIndex,
  selectedAnswer,
  isAnswerSubmitted,
  score,
  isQuizComplete,
  handleAnswerSelect,
  handleSubmitAnswer,
  handleNextQuestion,
  restartQuiz
}: QuizProps) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  useEffect(() => {
    console.log('Quiz state update:', { 
      open, 
      sheetOpen,
      hasQuestions: questions.length > 0, 
      isGenerating, 
      error,
      currentQuestionIndex,
      isQuizComplete
    });
  }, [open, questions, sheetOpen, isGenerating, error, currentQuestionIndex, isQuizComplete]);

  useEffect(() => {
    if (open) {
      setSheetOpen(true);
    }
  }, [open]);
  
  useEffect(() => {
    if (isGenerating || error || questions.length > 0) {
      console.log('Quiz should be visible due to content');
      setSheetOpen(true);
    }
  }, [isGenerating, error, questions]);

  const handleToggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  const handleCloseQuiz = () => {
    setSheetOpen(false);
    setShowExplanation(false);
    onClose();
  };

  const renderLoadingContent = () => {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-center font-medium">Quiz wordt gegenereerd...</p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Dit kan enkele seconden duren
        </p>
      </div>
    );
  };

  const renderErrorContent = () => {
    return (
      <>
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-end mt-4">
          <Button onClick={handleCloseQuiz}>Sluiten</Button>
        </div>
      </>
    );
  };

  const renderEmptyContent = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        <p className="text-center text-muted-foreground">
          Geen quizvragen beschikbaar.
        </p>
        <Button onClick={handleCloseQuiz}>Sluiten</Button>
      </div>
    );
  };

  const renderResultsContent = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-full">
          <Progress 
            value={Math.round((score / questions.length) * 100)} 
            className="h-6" 
          />
          <p className="text-center mt-2 text-sm text-muted-foreground">
            {Math.round((score / questions.length) * 100)}% correct
          </p>
        </div>
        
        <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
          <span className="text-4xl font-bold">{score}/{questions.length}</span>
        </div>
        
        <p className="text-center text-lg">
          Je hebt {score} van de {questions.length} vragen goed beantwoord.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full">
          <Button onClick={restartQuiz} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Opnieuw proberen
          </Button>
          
          <Button onClick={handleCloseQuiz} className="flex-1">
            Sluiten
          </Button>
        </div>
      </div>
    );
  };

  const renderQuestionContent = () => {
    if (!questions || questions.length === 0 || currentQuestionIndex >= questions.length) {
      console.error('Invalid questions array or currentQuestionIndex:', { 
        questionsLength: questions?.length, 
        currentQuestionIndex 
      });
      return renderEmptyContent();
    }

    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      console.error('Current question is undefined. Index:', currentQuestionIndex, 'Questions:', questions);
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fout bij het laden van de vraag</AlertTitle>
          <AlertDescription>
            Er is een probleem met het laden van deze vraag. Probeer de quiz opnieuw te starten.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium text-muted-foreground">
              Vraag {currentQuestionIndex + 1} van {questions.length}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              Score: {score} / {isAnswerSubmitted ? currentQuestionIndex + 1 : currentQuestionIndex}
            </div>
          </div>
          <Progress 
            value={(currentQuestionIndex / questions.length) * 100} 
            className="h-2 mb-2" 
          />
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
              <Button onClick={handleNextQuestion} className="animate-pulse">
                {currentQuestionIndex < questions.length - 1 ? (
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
    );
  };

  const renderContent = () => {
    console.log('Rendering quiz content with state:', {
      isGenerating,
      error,
      questionsCount: questions?.length || 0,
      currentQuestionIndex,
      isQuizComplete
    });
    
    if (isGenerating) {
      return renderLoadingContent();
    }

    if (error) {
      return renderErrorContent();
    }

    if (!questions || questions.length === 0) {
      return renderEmptyContent();
    }

    if (isQuizComplete) {
      return renderResultsContent();
    }

    return renderQuestionContent();
  };

  const shouldForceMountContent = questions.length > 0 || isGenerating || error !== null;
  
  return (
    <Sheet 
      open={sheetOpen} 
      onOpenChange={(isOpen) => {
        console.log(`Sheet onOpenChange: ${isOpen}`);
        if (!isOpen && !isGenerating) {
          handleCloseQuiz();
        } else if (isOpen) {
          setSheetOpen(true);
        }
      }}
    >
      <SheetContent 
        side="right" 
        className="sm:max-w-md w-[95vw] overflow-y-auto"
        forceMount={shouldForceMountContent ? true : undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>
            {isGenerating ? "Quiz voorbereiden" :
             error ? "Quiz Fout" :
             isQuizComplete ? "Quiz voltooid!" :
             title}
          </SheetTitle>
          <SheetDescription>
            {isGenerating ? "Even geduld terwijl we je quiz voorbereiden." :
             error ? "Er is een probleem opgetreden bij het genereren van de quiz." :
             isQuizComplete ? "Bekijk hieronder je resultaten" :
             questions.length > 0 ? 
               `Vraag ${currentQuestionIndex + 1} van ${questions.length}` :
               "Quiz informatie"}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4">
          {import.meta.env.DEV && (
            <div className="bg-gray-100 p-2 mb-4 text-xs rounded">
              <div>Debug: Questions: {questions?.length || 0}</div>
              <div>Debug: isGenerating: {String(isGenerating)}</div>
              <div>Debug: error: {error ? 'Yes' : 'No'}</div>
              <div>Debug: currentQuestionIndex: {currentQuestionIndex}</div>
              <div>Debug: sheetOpen: {String(sheetOpen)}</div>
            </div>
          )}
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Quiz;
