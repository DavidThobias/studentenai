
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  selectedAnswer: number | null;
  isAnswerSubmitted: boolean;
  score: number;
  isQuizComplete: boolean;
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
}

export const useQuiz = (
  initialBookId: number | null, 
  initialChapterId: number | null, 
  initialParagraphId: number | null,
  addLog: (message: string) => void
) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const [bookId, setBookId] = useState<number | null>(initialBookId);
  const [chapterId, setChapterId] = useState<number | null>(initialChapterId);
  const [paragraphId, setParagraphId] = useState<number | null>(initialParagraphId);
  
  const [debugData, setDebugData] = useState<any>({
    prompt: null,
    response: null,
    apiResponse: null
  });

  useEffect(() => {
    if (questions.length > 0) {
      const quizState: QuizState = {
        questions,
        currentQuestionIndex,
        selectedAnswer,
        isAnswerSubmitted,
        score,
        isQuizComplete,
        bookId,
        chapterId,
        paragraphId
      };
      localStorage.setItem('quizState', JSON.stringify(quizState));
      addLog('Saved quiz state to localStorage');
    }
  }, [questions, currentQuestionIndex, selectedAnswer, isAnswerSubmitted, score, isQuizComplete, bookId, chapterId, paragraphId, addLog]);

  const loadSavedQuizState = (bookIdParam: string | null, chapterIdParam: string | null, paragraphIdParam: string | null) => {
    const savedQuiz = localStorage.getItem('quizState');
    if (savedQuiz && !bookIdParam && !chapterIdParam && !paragraphIdParam) {
      try {
        const quizState = JSON.parse(savedQuiz) as QuizState;
        setQuestions(quizState.questions || []);
        setCurrentQuestionIndex(quizState.currentQuestionIndex || 0);
        setSelectedAnswer(quizState.selectedAnswer);
        setIsAnswerSubmitted(quizState.isAnswerSubmitted || false);
        setScore(quizState.score || 0);
        setIsQuizComplete(quizState.isQuizComplete || false);
        
        if (!bookIdParam && quizState.bookId) {
          setBookId(quizState.bookId);
        }
        if (!chapterIdParam && quizState.chapterId) {
          setChapterId(quizState.chapterId);
        }
        if (!paragraphIdParam && quizState.paragraphId) {
          setParagraphId(quizState.paragraphId);
        }
        
        addLog('Loaded saved quiz state from localStorage');
      } catch (error) {
        console.error('Error loading saved quiz:', error);
        addLog(`Error loading saved quiz: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    const hasValidContext = bookIdParam || (savedQuiz && JSON.parse(savedQuiz).bookId);
    const hasQuestions = savedQuiz && JSON.parse(savedQuiz).questions && JSON.parse(savedQuiz).questions.length > 0;
    
    return { hasValidContext, hasQuestions };
  };

  const generateQuiz = async (customQuestionCount?: number) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return;
    }
    
    const count = customQuestionCount || 5;
    
    setIsGenerating(true);
    setQuizError(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    
    addLog(`Generating ${count} quiz questions for context: bookId=${bookId}, chapterId=${chapterId}, paragraphId=${paragraphId}`);
    
    const payload: any = { 
      count: count, 
      debug: true 
    };
    
    if (bookId) payload.bookId = bookId;
    if (chapterId) payload.chapterId = chapterId;
    if (paragraphId) payload.paragraphId = paragraphId;
    
    addLog(`Sending payload to generate-sales-question: ${JSON.stringify(payload)}`);
    
    try {
      // First try using the generate-sales-question function
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: payload
      });
      
      if (error) {
        console.error('Error calling generate-sales-question:', error);
        addLog(`Error with generate-sales-question: ${error.message}`);
        
        // Fallback to generate-quiz function
        addLog('Trying fallback to generate-quiz function');
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('generate-quiz', {
          body: payload
        });
        
        if (fallbackError) {
          console.error('Error with fallback generate-quiz:', fallbackError);
          setQuizError(`Er is een fout opgetreden: ${fallbackError.message}`);
          addLog(`Fallback error: ${fallbackError.message}`);
          return;
        }
        
        if (fallbackData) {
          processQuizResponse(fallbackData);
          return;
        }
        
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        addLog(`Error: ${error.message}`);
        return;
      }
      
      if (data) {
        processQuizResponse(data);
      }
    } catch (err) {
      console.error('Error in generateQuiz:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const processQuizResponse = (data: any) => {
    setDebugData({...debugData, apiResponse: data});
    addLog(`Full API response received: ${JSON.stringify(data).substring(0, 100)}...`);
    console.log('Full API response:', data);
    
    if (data.success && data.questions && Array.isArray(data.questions)) {
      const formattedQuestions: QuizQuestion[] = data.questions.map((q: any) => {
        let correctAnswerIndex;
        
        if (typeof q.correct === 'string' && q.correct.length === 1) {
          correctAnswerIndex = q.correct.charCodeAt(0) - 65;
        } else if (typeof q.correct === 'number') {
          correctAnswerIndex = q.correct;
        } else if (q.correctAnswer !== undefined) {
          correctAnswerIndex = q.correctAnswer;  
        } else {
          correctAnswerIndex = 0;
        }
        
        return {
          question: q.question,
          options: q.options,
          correctAnswer: correctAnswerIndex,
          explanation: q.explanation || "Dit is het correcte antwoord volgens de theorie uit het Basisboek Sales."
        };
      });
      
      setQuestions(formattedQuestions);
      addLog(`Created ${formattedQuestions.length} questions from the API response`);
      
      if (data.debug) {
        setDebugData({
          ...debugData,
          prompt: data.debug.prompt,
          response: data.debug.response
        });
        addLog('Debug data saved from API response');
      }
    } else {
      setQuizError('Geen vragen konden worden gegenereerd. Controleer of er content beschikbaar is voor dit boek/hoofdstuk.');
      addLog(`Failed to generate questions: Invalid response format or no questions returned`);
      console.error('Invalid response format or no questions:', data);
    }
  };

  const generateQuizForParagraph = async (paragraphId: number, paragraphContent?: string, paragraphNumber?: number) => {
    if (!bookId || !chapterId) {
      setQuizError('Boek of hoofdstuk informatie ontbreekt');
      return;
    }
    
    try {
      setIsGenerating(true);
      setQuizError(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setScore(0);
      setIsQuizComplete(false);
      
      setParagraphId(paragraphId);
      
      addLog(`Generating quiz questions for paragraph ${paragraphId}`);
      
      // Pass all relevant IDs
      const payload = { 
        bookId: bookId,
        chapterId: chapterId,
        paragraphId: paragraphId,
        count: 5,
        debug: true 
      };
      
      // Log the payload to help debug
      console.log('Generate quiz payload:', payload);
      addLog(`Paragraph quiz payload: ${JSON.stringify(payload)}`);
      
      // First try using the generate-sales-question function
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: payload
      });
      
      if (error) {
        console.error('Error calling generate-sales-question for paragraph:', error);
        addLog(`Error with generate-sales-question for paragraph: ${error.message}`);
        
        // Fallback to generate-quiz function
        addLog('Trying fallback to generate-quiz function for paragraph');
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('generate-quiz', {
          body: payload
        });
        
        if (fallbackError) {
          console.error('Error with fallback generate-quiz for paragraph:', fallbackError);
          setQuizError(`Er is een fout opgetreden: ${fallbackError.message}`);
          addLog(`Fallback error for paragraph: ${fallbackError.message}`);
          return;
        }
        
        if (fallbackData) {
          processQuizResponse(fallbackData);
          return;
        }
        
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        return;
      }
      
      if (data) {
        processQuizResponse(data);
      }
    } catch (err) {
      console.error('Error in generateQuizForParagraph:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (!isAnswerSubmitted) {
      addLog(`Selected answer: ${index}`);
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      toast.info('Selecteer eerst een antwoord');
      return;
    }

    addLog(`Submitting answer: ${selectedAnswer}`);
    setIsAnswerSubmitted(true);
    
    if (questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      if (selectedAnswer === currentQuestion.correctAnswer) {
        setScore(prevScore => prevScore + 1);
        addLog('Answer correct, score updated');
      } else {
        addLog('Answer incorrect');
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      addLog(`Moving to next question (${currentQuestionIndex + 1})`);
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setShowExplanation(false);
    } else {
      addLog('Quiz complete, showing results');
      setIsQuizComplete(true);
    }
  };

  const restartQuiz = () => {
    addLog('Restarting quiz');
    if (paragraphId) {
      generateQuizForParagraph(paragraphId);
    } else {
      generateQuiz();
    }
  };

  const toggleExplanation = () => {
    addLog(`${showExplanation ? 'Hiding' : 'Showing'} explanation`);
    setShowExplanation(!showExplanation);
  };

  return {
    questions,
    quizError,
    isGenerating,
    currentQuestionIndex,
    selectedAnswer,
    isAnswerSubmitted,
    score,
    isQuizComplete,
    showExplanation,
    bookId,
    chapterId,
    paragraphId,
    debugData,
    setBookId,
    setChapterId,
    setParagraphId,
    loadSavedQuizState,
    generateQuiz,
    generateQuizForParagraph,
    handleAnswerSelect,
    handleSubmitAnswer,
    handleNextQuestion,
    restartQuiz,
    toggleExplanation
  };
};
