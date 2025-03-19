import { useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface QuizProps {
  bookId: string;
  chapterId?: string;
  paragraphId?: string;
  onClose: () => void;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const Quiz = ({ bookId, chapterId, paragraphId, onClose }: QuizProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  const generateQuiz = async () => {
    try {
      setIsLoading(true);
      setIsGeneratingQuiz(true);
      setError(null);
      setTimeoutOccurred(false);
      
      const feedbackTimeoutId = setTimeout(() => {
        setError('De quiz generatie duurt langer dan verwacht. We werken eraan...');
        toast.info('Quiz generatie duurt langer dan verwacht. Even geduld...');
      }, 5000);
      
      const timeoutId = setTimeout(() => {
        setTimeoutOccurred(true);
        setError('Het lijkt erop dat de quiz generatie te lang duurt. Probeer het opnieuw of kies een ander hoofdstuk.');
        toast.error('Timeout bij het genereren van de quiz.');
        setIsLoading(false);
        setIsGeneratingQuiz(false);
      }, 30000);
      
      const { data: response, error: functionError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          bookId: parseInt(bookId),
          chapterId: chapterId ? parseInt(chapterId) : null,
          paragraphId: paragraphId ? parseInt(paragraphId) : null,
          numberOfQuestions: 3,
          forceNewQuestions: true,
        },
      });
      
      clearTimeout(feedbackTimeoutId);
      clearTimeout(timeoutId);
      
      if (functionError) {
        console.error('Error invoking generate-quiz function:', functionError);
        setError(`Er is een fout opgetreden bij het genereren van de quiz: ${functionError.message}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (!response.success) {
        console.error('Error from generate-quiz function:', response.error);
        setError(`Er is een fout opgetreden bij het genereren van de quiz: ${response.error}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (response.questions && response.questions.length > 0) {
        const formattedQuestions = response.questions.map((q: any) => ({
          question: q.question,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any) => String(opt))
            : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }));
        
        setQuizQuestions(formattedQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setScore(0);
        setIsQuizComplete(false);
        toast.success('Quiz is gegenereerd!');
      } else {
        setError('Geen vragen konden worden gegenereerd. Probeer het opnieuw.');
        toast.error('Geen vragen konden worden gegenereerd.');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(`Er is een onverwachte fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      toast.error('Er is een fout opgetreden bij het genereren van de quiz.');
    } finally {
      setIsLoading(false);
      setIsGeneratingQuiz(false);
    }
  };

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
    generateQuiz();
  };

  const handleToggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
    }
  };

  const renderContent = () => {
    if (quizQuestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center space-y-6">
          <DialogHeader>
            <DialogTitle>Quiz</DialogTitle>
            <DialogDescription>
              Test je kennis met een AI-gegenereerde quiz over dit boek.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full">
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
                onClick={generateQuiz} 
                disabled={isLoading}
                size="lg"
                className="w-full"
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
      <div className="flex flex-col space-y-6">
        <DialogHeader>
          <DialogTitle>
            {isQuizComplete ? "Quiz voltooid!" : "Quiz"}
          </DialogTitle>
          <DialogDescription>
            {isQuizComplete ? (
              "Bekijk hieronder je resultaten"
            ) : (
              `Vraag ${currentQuestionIndex + 1} van ${quizQuestions.length}`
            )}
          </DialogDescription>
        </DialogHeader>

        {isQuizComplete ? (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-full">
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
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[600px]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default Quiz;
