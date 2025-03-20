
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const useQuiz = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  const resetQuizState = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
  };

  const generateQuiz = async (bookId: number, chapterId: number | null = null, numberOfQuestions: number = 5) => {
    try {
      setIsGenerating(true);
      setQuizError(null);
      resetQuizState();
      
      console.log(`Generating quiz for book ${bookId}, chapter ${chapterId || 'all'}, ${numberOfQuestions} questions`);
      
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          bookId,
          chapterId,
          numberOfQuestions,
          debug: import.meta.env.DEV
        }
      });
      
      if (error) {
        console.error('Error generating quiz:', error);
        setQuizError(`Failed to generate quiz: ${error.message}`);
        toast.error('Er ging iets mis bij het genereren van de quiz');
        return;
      }
      
      if (!data?.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        console.error('Invalid response from quiz generation:', data);
        setQuizError('Geen quizvragen ontvangen van de server');
        toast.error('Kon geen quizvragen genereren');
        return;
      }
      
      console.log(`Received ${data.questions.length} quiz questions`, data.questions);
      setQuestions(data.questions);
      
    } catch (error) {
      console.error('Error in generateQuiz:', error);
      setQuizError(`Er is een fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      toast.error('Er ging iets mis bij het genereren van de quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setIsAnswerSubmitted(true);
    
    if (questions[currentQuestionIndex].correctAnswer === selectedAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsQuizComplete(true);
    }
  };

  const restartQuiz = () => {
    resetQuizState();
  };

  return {
    questions,
    isGenerating,
    quizError,
    generateQuiz,
    currentQuestionIndex,
    selectedAnswer,
    isAnswerSubmitted,
    score,
    isQuizComplete,
    handleAnswerSelect,
    handleSubmitAnswer,
    handleNextQuestion,
    restartQuiz
  };
};
