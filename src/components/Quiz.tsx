
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  bookId: string;
  chapterId?: string;
  onClose: () => void;
}

const Quiz = ({ bookId, chapterId, onClose }: QuizProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const generateQuiz = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId,
          chapterId,
          numberOfQuestions: 5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generating quiz');
      }

      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setScore(0);
        setIsQuizComplete(false);
      } else {
        toast.error('Geen vragen konden worden gegenereerd. Probeer het opnieuw.');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast.error('Er is een fout opgetreden bij het genereren van de quiz. Probeer het opnieuw.');
    } finally {
      setIsLoading(false);
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
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
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

  // If no questions loaded yet, show generate button
  if (quizQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Quiz</h2>
        <p className="text-center text-muted-foreground">
          Test je kennis met een AI-gegenereerde quiz over dit boek.
        </p>
        <Button 
          onClick={generateQuiz} 
          disabled={isLoading}
          size="lg"
          className="mt-4"
        >
          {isLoading ? 'Quiz genereren...' : 'Start Quiz'}
        </Button>
      </div>
    );
  }

  // If quiz is complete, show results
  if (isQuizComplete) {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Quiz voltooid!</h2>
        
        <div className="w-32 h-32 rounded-full border-4 flex items-center justify-center">
          <span className="text-4xl font-bold">{percentage}%</span>
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
    );
  }

  // Display current question
  const currentQuestion = quizQuestions[currentQuestionIndex];
  
  return (
    <div className="p-4 sm:p-6 flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          Vraag {currentQuestionIndex + 1} van {quizQuestions.length}
        </span>
        <span className="text-sm font-medium">
          Score: {score}
        </span>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-xl font-medium">{currentQuestion.question}</h3>
        
        <RadioGroup value={selectedAnswer?.toString() || ""} className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let variantClass = "border-border bg-card";
            
            if (isAnswerSubmitted) {
              if (index === currentQuestion.correctAnswer) {
                variantClass = "border-green-500 bg-green-50 dark:bg-green-950";
              } else if (index === selectedAnswer) {
                variantClass = "border-red-500 bg-red-50 dark:bg-red-950";
              }
            }
            
            return (
              <div
                key={index}
                className={`flex items-center space-x-2 rounded-md border p-3 cursor-pointer transition-colors ${variantClass}`}
                onClick={() => handleAnswerSelect(index)}
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`option-${index}`} 
                  disabled={isAnswerSubmitted}
                  checked={selectedAnswer === index}
                />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-grow cursor-pointer"
                >
                  {option}
                </Label>
                
                {isAnswerSubmitted && index === currentQuestion.correctAnswer && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                
                {isAnswerSubmitted && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            );
          })}
        </RadioGroup>
      </div>
      
      {isAnswerSubmitted && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToggleExplanation}
            className="flex items-center"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            {showExplanation ? 'Verberg uitleg' : 'Toon uitleg'}
          </Button>
          
          {showExplanation && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-4 bg-muted rounded-md"
            >
              <p>{currentQuestion.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      )}
      
      <div className="pt-4 flex justify-between">
        {!isAnswerSubmitted ? (
          <Button onClick={handleSubmitAnswer}>
            Controleer antwoord
          </Button>
        ) : (
          <Button onClick={handleNextQuestion}>
            {currentQuestionIndex < quizQuestions.length - 1 ? 'Volgende vraag' : 'Bekijk resultaten'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Quiz;
