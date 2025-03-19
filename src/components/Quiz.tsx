
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  bookId: string;
  chapterId?: string;
  paragraphId?: string;
  onClose: () => void;
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
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [timeoutOccurred, setTimeoutOccurred] = useState(false);

  const generateQuiz = async () => {
    try {
      console.log('=== Start Quiz Generation Process ===');
      console.log('Initial state:', {
        isLoading,
        currentError: error,
        quizQuestionsLength: quizQuestions.length,
        currentQuestionIndex,
        isGeneratingQuiz,
        generationAttempts
      });
      
      console.log('Start generating quiz...');
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
      
      console.log(`Calling generate-quiz function for book ${bookId}, chapter ${chapterId || 'all'}, paragraph ${paragraphId || 'all'}`);
      
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          bookId: parseInt(bookId),
          chapterId: chapterId ? parseInt(chapterId) : null,
          paragraphId: paragraphId ? parseInt(paragraphId) : null,
          numberOfQuestions: 3,
        },
      });
      
      console.log('Function response:', { data, error }); // Debug log
      console.log('Response data structure:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasQuestions: data?.questions?.length > 0,
        numberOfQuestions: data?.questions?.length,
        firstQuestion: data?.questions?.[0],
        success: data?.success,
        message: data?.message
      }); // Extra debug info
      
      clearTimeout(feedbackTimeoutId);
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error invoking generate-quiz function:', error);
        setError(`Er is een fout opgetreden bij het genereren van de quiz: ${error.message}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (data?.error) {
        console.error('Error from generate-quiz function:', data.error);
        setError(`Er is een fout opgetreden bij het genereren van de quiz: ${data.error}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (data?.questions && data.questions.length > 0) {
        console.log('Setting quiz questions:', data.questions.length, 'questions found');
        const formattedQuestions = data.questions.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any) => String(opt))
            : []
        }));
        
        console.log('Formatted questions:', formattedQuestions);
        setQuizQuestions(formattedQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setScore(0);
        setIsQuizComplete(false);
        toast.success('Quiz is gegenereerd!');
      } else {
        console.warn('No questions found in response:', data);
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

  if (quizQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Quiz</h2>
        <p className="text-center text-muted-foreground">
          Test je kennis met een AI-gegenereerde quiz over dit boek.
        </p>
        
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
            disabled={isLoading || isGeneratingQuiz}
            size="lg"
            className="mt-4 w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Quiz genereren...
              </>
            ) : generationAttempts > 0 ? (
              'Opnieuw proberen'
            ) : (
              'Start Quiz'
            )}
          </Button>
        )}
      </div>
    );
  }

  if (isQuizComplete) {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Quiz voltooid!</h2>
        
        <div className="w-full max-w-md">
          <Progress value={percentage} className="h-6" />
          <p className="text-center mt-2 text-sm text-muted-foreground">{percentage}% correct</p>
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
    );
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
  
  return (
    <div className="p-4 sm:p-6 flex flex-col space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Vraag {currentQuestionIndex + 1} van {quizQuestions.length}
          </span>
          <span className="text-sm font-medium">
            Score: {score}/{currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
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
