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

  const generateSalesQuiz = async (numberOfQuestions: number = 5) => {
    try {
      setIsGenerating(true);
      setQuizError(null);
      resetQuizState();
      
      console.log(`Generating sales quiz with ${numberOfQuestions} questions`);
      
      const promises = Array(numberOfQuestions).fill(0).map(async (_, index) => {
        console.log(`Generating sales question ${index + 1}/${numberOfQuestions}`);
        
        const { data, error } = await supabase.functions.invoke('generate-sales-question', {
          body: { debug: import.meta.env.DEV }
        });
        
        if (error) {
          console.error(`Error generating sales question ${index + 1}:`, error);
          throw error;
        }
        
        if (!data?.success || !data?.question) {
          console.error(`Invalid response from sales question generation ${index + 1}:`, data);
          throw new Error('Invalid response format');
        }
        
        console.log(`Received sales question ${index + 1}:`, data.question);
        
        // Format the question into our QuizQuestion format
        const questionData = data.question;
        
        // Extract the letter from the correct answer (e.g., "A: text" -> extract "A")
        const correctLetter = questionData.correct.charAt(0);
        
        // Convert the letter to an index (A=0, B=1, etc.)
        const correctIndex = correctLetter.charCodeAt(0) - 65; // 'A' is 65 in ASCII
        
        // Remove the letter prefixes from options for cleaner display
        const cleanOptions = questionData.opties.map((opt: string) => 
          opt.substring(3) // Remove "X: " prefix
        );
        
        return {
          question: questionData.vraag,
          options: cleanOptions,
          correctAnswer: correctIndex,
          explanation: "Dit is een door AI gegenereerde vraag over sales."
        };
      });
      
      try {
        const generatedQuestions = await Promise.all(promises);
        console.log(`Successfully generated ${generatedQuestions.length} sales questions`);
        setQuestions(generatedQuestions);
      } catch (error) {
        console.error('Error in one or more question generation promises:', error);
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
        toast.error('Er ging iets mis bij het genereren van de quiz');
      }
      
    } catch (error) {
      console.error('Error in generateSalesQuiz:', error);
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
    generateSalesQuiz,
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
