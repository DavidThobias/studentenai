
import { useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

const Quiz = ({ questions, onClose, open, title = "Quiz" }: QuizProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Reset quiz state when new questions are received
  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setShowExplanation(false);
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
    
    const currentQuestion = questions[currentQuestionIndex];
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const handleRestartQuiz = () => {
    resetQuiz();
  };

  const handleToggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const renderContent = () => {
    // If no questions are provided, show a message
    if (!questions || questions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          <p className="text-center text-muted-foreground">
            Geen quizvragen beschikbaar.
          </p>
          <Button onClick={onClose}>Sluiten</Button>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    
    return (
      <div className="flex flex-col space-y-6">
        <DialogHeader>
          <DialogTitle>
            {isQuizComplete ? "Quiz voltooid!" : title}
          </DialogTitle>
          <DialogDescription>
            {isQuizComplete ? (
              "Bekijk hieronder je resultaten"
            ) : (
              `Vraag ${currentQuestionIndex + 1} van ${questions.length}`
            )}
          </DialogDescription>
        </DialogHeader>

        {isQuizComplete ? (
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
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[600px]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default Quiz;
