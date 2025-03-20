import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  onClose: () => void;
  open: boolean;
  title?: string;
  error: string | null;
  isGenerating: boolean;
}

const Quiz = ({ questions, onClose, open, title = "Quiz", error, isGenerating }: QuizProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Store questions in a ref to keep them stable between renders
  const questionsRef = useRef<QuizQuestion[]>([]);
  
  // Synchronize the ref with the props when questions change
  useEffect(() => {
    if (questions && questions.length > 0) {
      console.log('Updating questionsRef with', questions.length, 'questions');
      questionsRef.current = questions;
    }
  }, [questions]);
  
  // Simple state debug logging
  useEffect(() => {
    console.log('Quiz state updated:', { 
      open, 
      hasQuestions: questionsRef.current.length > 0,
      questionsFromProps: questions.length,
      isGenerating, 
      error,
      currentQuestionIndex,
      initialized,
      isQuizComplete
    });
  }, [open, questions, isGenerating, error, currentQuestionIndex, initialized, isQuizComplete]);

  // Initialize quiz when questions are received and not generating
  useEffect(() => {
    if (open && questions && questions.length > 0 && !isGenerating) {
      console.log('Valid questions available, initializing quiz state with', questions.length, 'questions');
      
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      setShowExplanation(false);
      setInitialized(true);
    }
  }, [open, questions, isGenerating]);

  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      console.log(`Selected answer: ${index}`);
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.info('Selecteer eerst een antwoord');
      return;
    }

    console.log(`Submitting answer: ${selectedAnswer}`);
    setIsAnswerSubmitted(true);
    
    const activeQuestions = questions.length > 0 ? questions : questionsRef.current;
    
    if (activeQuestions && activeQuestions.length > 0) {
      const currentQuestion = activeQuestions[currentQuestionIndex];
      if (selectedAnswer === currentQuestion.correctAnswer) {
        setScore(prevScore => prevScore + 1);
        console.log('Correct answer!');
      } else {
        console.log('Incorrect answer!');
      }
    }
  };

  const handleNextQuestion = () => {
    const activeQuestions = questions.length > 0 ? questions : questionsRef.current;
    
    if (currentQuestionIndex < activeQuestions.length - 1) {
      console.log(`Moving to next question (${currentQuestionIndex + 1})`);
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      console.log('Quiz complete');
      setIsQuizComplete(true);
    }
  };

  const handleRestartQuiz = () => {
    console.log('Restarting quiz');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setShowExplanation(false);
  };

  const handleToggleExplanation = () => {
    console.log(`${showExplanation ? 'Hiding' : 'Showing'} explanation`);
    setShowExplanation(!showExplanation);
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
          <Button onClick={onClose}>Sluiten</Button>
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
        <Button onClick={onClose}>Sluiten</Button>
      </div>
    );
  };

  const renderResultsContent = () => {
    const activeQuestions = questions.length > 0 ? questions : questionsRef.current;
    
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-full">
          <Progress 
            value={Math.round((score / activeQuestions.length) * 100)} 
            className="h-6" 
          />
          <p className="text-center mt-2 text-sm text-muted-foreground">
            {Math.round((score / activeQuestions.length) * 100)}% correct
          </p>
        </div>
        
        <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
          <span className="text-4xl font-bold">{score}/{activeQuestions.length}</span>
        </div>
        
        <p className="text-center text-lg">
          Je hebt {score} van de {activeQuestions.length} vragen goed beantwoord.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full">
          <Button onClick={handleRestartQuiz} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Opnieuw proberen
          </Button>
          
          <Button onClick={onClose} className="flex-1">
            Sluiten
          </Button>
        </div>
      </div>
    );
  };

  const renderQuestionContent = () => {
    const activeQuestions = questions.length > 0 ? questions : questionsRef.current;
    
    if (!activeQuestions || activeQuestions.length === 0 || currentQuestionIndex >= activeQuestions.length) {
      console.error('Invalid questions array or currentQuestionIndex:', { 
        questionsLength: activeQuestions?.length, 
        currentQuestionIndex 
      });
      return renderEmptyContent();
    }

    const currentQuestion = activeQuestions[currentQuestionIndex];
    
    if (!currentQuestion) {
      console.error('Current question is undefined. Index:', currentQuestionIndex, 'Questions:', activeQuestions);
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
                {currentQuestionIndex < activeQuestions.length - 1 ? (
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
      questionsFromProps: questions?.length || 0,
      questionsFromRef: questionsRef.current?.length || 0,
      currentQuestionIndex,
      isQuizComplete,
      initialized
    });
    
    if (isGenerating) {
      return renderLoadingContent();
    }

    if (error) {
      return renderErrorContent();
    }

    // First check props, then check ref for questions
    const hasQuestions = questions.length > 0 || questionsRef.current.length > 0;
    if (!hasQuestions) {
      return renderEmptyContent();
    }

    if (isQuizComplete) {
      return renderResultsContent();
    }

    return renderQuestionContent();
  };

  // Track when questions are actually available in the component
  useEffect(() => {
    if (open && (questions.length > 0 || questionsRef.current.length > 0)) {
      const sourceText = questions.length > 0 ? "props" : "ref";
      const count = questions.length > 0 ? questions.length : questionsRef.current.length;
      console.log(`Quiz component has ${count} questions from ${sourceText}`);
    }
  }, [open, questions]);

  // THE KEY CHANGE: Always use true for the Sheet's open state when we have questions or are generating
  const shouldBeOpen = open || isGenerating || questions.length > 0 || questionsRef.current.length > 0;
  
  return (
    <Sheet open={shouldBeOpen} onOpenChange={(isOpen) => {
      console.log(`Sheet onOpenChange: ${isOpen}`);
      if (!isOpen && !isGenerating) onClose();
    }}>
      <SheetContent 
        side="right" 
        className="sm:max-w-md w-[95vw] overflow-y-auto"
        // Always keep the content mounted once we have questions or are generating
        forceMount={true}
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
             questions && questions.length > 0 ? `Vraag ${currentQuestionIndex + 1} van ${questions.length}` :
             questionsRef.current && questionsRef.current.length > 0 ? `Vraag ${currentQuestionIndex + 1} van ${questionsRef.current.length}` :
             "Quiz informatie"}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-4">
          {import.meta.env.DEV && (
            <div className="bg-gray-100 p-2 mb-4 text-xs rounded">
              <div>Debug: Questions from props: {questions?.length || 0}</div>
              <div>Debug: Questions from ref: {questionsRef.current?.length || 0}</div>
              <div>isGenerating: {String(isGenerating)}</div>
              <div>error: {error ? 'Yes' : 'No'}</div>
              <div>shouldBeOpen: {String(shouldBeOpen)}</div>
            </div>
          )}
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Quiz;
