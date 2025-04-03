
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
  showingParagraphContent?: boolean;
  selectedParagraphForStudy?: number | null;
}

interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedTerms: number;
  totalTerms: number;
  startTime: number;
}

interface AnswerDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
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
  const [showIncrementalResults, setShowIncrementalResults] = useState(true);
  
  const [bookId, setBookId] = useState<number | null>(initialBookId);
  const [chapterId, setChapterId] = useState<number | null>(initialChapterId);
  const [paragraphId, setParagraphId] = useState<number | null>(initialParagraphId);
  
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  
  const [debugData, setDebugData] = useState<{
    prompt: string | null;
    response: any | null;
    apiResponse: any | null;
    extractedTerms?: string[];
    batchTerms?: string[];
    answerDistribution?: AnswerDistribution;
    tokenEstimates?: {
      promptTokens?: number;
      requestedMaxTokens?: number;
    };
  }>({
    prompt: null,
    response: null,
    apiResponse: null
  });

  useEffect(() => {
    if (bookId !== null) {
      const quizState: QuizState = {
        questions,
        currentQuestionIndex,
        selectedAnswer,
        isAnswerSubmitted,
        score,
        isQuizComplete,
        bookId,
        chapterId,
        paragraphId,
      };
      
      const stateKey = `quizState_${bookId}_${chapterId || 'none'}_${paragraphId || 'none'}`;
      localStorage.setItem(stateKey, JSON.stringify(quizState));
      localStorage.setItem('lastActiveQuiz', stateKey);
      
      addLog(`Saved quiz state to localStorage with key: ${stateKey}`);
    }
  }, [questions, currentQuestionIndex, selectedAnswer, isAnswerSubmitted, score, isQuizComplete, bookId, chapterId, paragraphId, addLog]);

  // Client-side function to balance answer distribution if needed
  const balanceAnswerDistribution = (quizQuestions: QuizQuestion[]): QuizQuestion[] => {
    if (quizQuestions.length < 4) return quizQuestions;
    
    // Count answers by letter
    const letterCounts = {
      0: 0, // A
      1: 0, // B
      2: 0, // C
      3: 0  // D
    };
    
    quizQuestions.forEach(q => {
      if (q.correctAnswer >= 0 && q.correctAnswer <= 3) {
        letterCounts[q.correctAnswer]++;
      }
    });
    
    addLog(`Client-side answer distribution check: A=${letterCounts[0]}, B=${letterCounts[1]}, C=${letterCounts[2]}, D=${letterCounts[3]}`);
    
    // Check if distribution is balanced
    const expectedCount = Math.ceil(quizQuestions.length / 4);
    const isBalanced = Object.values(letterCounts).every(count => 
      Math.abs(count - expectedCount) <= 1
    );
    
    if (isBalanced) {
      addLog('Answer distribution is already balanced');
      return quizQuestions;
    }
    
    // Find over-represented and under-represented answers
    const overRepresented = Object.entries(letterCounts)
      .filter(([_, count]) => count > expectedCount)
      .map(([index]) => parseInt(index));
      
    const underRepresented = Object.entries(letterCounts)
      .filter(([_, count]) => count < expectedCount)
      .map(([index]) => parseInt(index));
    
    if (overRepresented.length === 0 || underRepresented.length === 0) {
      return quizQuestions;
    }
    
    addLog(`Rebalancing answers: over-represented=${overRepresented.join(',')}, under-represented=${underRepresented.join(',')}`);
    
    // Clone questions to avoid modifying the original array
    const balancedQuestions: QuizQuestion[] = JSON.parse(JSON.stringify(quizQuestions));
    
    // Start rebalancing
    let overRepIndex = 0;
    let underRepIndex = 0;
    
    for (let i = 0; i < balancedQuestions.length; i++) {
      const q = balancedQuestions[i];
      
      // If this question has an over-represented answer
      if (overRepresented.includes(q.correctAnswer)) {
        // And there are still under-represented answers to use
        if (underRepIndex < underRepresented.length) {
          const newAnswerIndex = underRepresented[underRepIndex];
          
          // Save the original correct option
          const correctOption = q.options[q.correctAnswer];
          
          // Swap options
          q.options[q.correctAnswer] = q.options[newAnswerIndex];
          q.options[newAnswerIndex] = correctOption;
          
          // Update the correct answer
          q.correctAnswer = newAnswerIndex;
          
          // Move to the next under-represented answer
          underRepIndex++;
          
          // Update counts
          letterCounts[overRepresented[overRepIndex]]--;
          letterCounts[newAnswerIndex]++;
          
          // If we've fixed this over-represented answer, move to the next one
          if (letterCounts[overRepresented[overRepIndex]] <= expectedCount) {
            overRepIndex++;
            if (overRepIndex >= overRepresented.length) break;
          }
        }
      }
    }
    
    addLog(`Rebalanced answer distribution: A=${letterCounts[0]}, B=${letterCounts[1]}, C=${letterCounts[2]}, D=${letterCounts[3]}`);
    
    return balancedQuestions;
  };

  const validateAnswerDistribution = (quizQuestions: QuizQuestion[]): boolean => {
    if (quizQuestions.length < 4) return true; // Not enough questions to balance
    
    const distribution = {
      0: 0, // A
      1: 0, // B
      2: 0, // C
      3: 0  // D
    };
    
    quizQuestions.forEach(q => {
      if (q.correctAnswer >= 0 && q.correctAnswer <= 3) {
        distribution[q.correctAnswer]++;
      }
    });
    
    addLog(`Answer distribution: A=${distribution[0]}, B=${distribution[1]}, C=${distribution[2]}, D=${distribution[3]}`);
    
    const expectedCount = quizQuestions.length / 4;
    const isBalanced = Object.values(distribution).every(count => 
      Math.abs(count - expectedCount) <= 1
    );
    
    return isBalanced;
  };

  const loadSavedQuizState = (bookIdParam: string | null, chapterIdParam: string | null, paragraphIdParam: string | null) => {
    let stateKey: string | null = null;
    
    if (bookIdParam && chapterIdParam && paragraphIdParam) {
      stateKey = `quizState_${bookIdParam}_${chapterIdParam}_${paragraphIdParam}`;
    } else if (bookIdParam && chapterIdParam) {
      stateKey = `quizState_${bookIdParam}_${chapterIdParam}_none`;
    } else if (bookIdParam) {
      stateKey = `quizState_${bookIdParam}_none_none`;
    } else {
      stateKey = localStorage.getItem('lastActiveQuiz');
    }
    
    addLog(`Attempting to load quiz state with key: ${stateKey}`);
    
    let hasValidContext = false;
    let hasQuestions = false;
    
    if (stateKey) {
      const savedQuiz = localStorage.getItem(stateKey);
      if (savedQuiz) {
        try {
          const quizState = JSON.parse(savedQuiz) as QuizState;
          
          if (quizState.questions && quizState.questions.length > 0) {
            setQuestions(quizState.questions);
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
            
            addLog(`Successfully loaded saved quiz state with ${quizState.questions.length} questions`);
            hasQuestions = true;
          }
          
          hasValidContext = true;
        } catch (error) {
          console.error('Error loading saved quiz:', error);
          addLog(`Error loading saved quiz: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        addLog(`No saved quiz found with key: ${stateKey}`);
      }
    }
    
    return { hasValidContext, hasQuestions };
  };

  const processBatch = async (batchIndex: number, batchSize: number = 5) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return null;
    }

    try {
      addLog(`Processing batch ${batchIndex} with size ${batchSize}`);
      
      const payload: any = { 
        batchIndex,
        batchSize,
        debug: true
      };
      
      if (bookId) payload.bookId = bookId;
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending batch payload to generate-sales-question: ${JSON.stringify(payload)}`);
      
      const { data, error } = await supabase.functions.invoke('generate-sales-question', {
        body: payload
      });
      
      if (error) {
        console.error('Error calling generate-sales-question for batch:', error);
        addLog(`Error with batch ${batchIndex}: ${error.message}`);
        return null;
      }
      
      if (!data || !data.success) {
        addLog(`No valid data returned for batch ${batchIndex}`);
        return null;
      }
      
      if (data.debug) {
        setDebugData(prev => ({
          ...prev,
          prompt: data.debug.prompt,
          response: data.debug.response,
          batchTerms: data.debug.batchTerms,
          extractedTerms: data.debug.extractedTerms || prev.extractedTerms,
          tokenEstimates: data.debug.tokenEstimates,
          answerDistribution: data.debug.answerDistribution
        }));
        
        if (data.debug.answerDistribution) {
          addLog(`Answer distribution from API: A=${data.debug.answerDistribution.A}, B=${data.debug.answerDistribution.B}, C=${data.debug.answerDistribution.C}, D=${data.debug.answerDistribution.D}`);
        }
      }
      
      let formattedQuestions = formatQuestions(data.questions);
      
      // Apply client-side balancing if needed
      if (formattedQuestions.length >= 4) {
        const isBalanced = validateAnswerDistribution(formattedQuestions);
        if (!isBalanced) {
          addLog('Applying client-side answer distribution balancing');
          formattedQuestions = balanceAnswerDistribution(formattedQuestions);
        }
      }
      
      return {
        questions: formattedQuestions,
        metadata: data.metadata,
        context: data.context
      };
    } catch (err) {
      console.error(`Error processing batch ${batchIndex}:`, err);
      addLog(`Error in batch ${batchIndex}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  const formatQuestions = (rawQuestions: any[]): QuizQuestion[] => {
    if (!Array.isArray(rawQuestions)) return [];
    
    return rawQuestions.map((q: any) => {
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
  };

  const generateQuiz = async (batchSize: number = 5) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return;
    }
    
    setIsGenerating(true);
    setQuizError(null);
    setQuestions([]);
    setAllQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    
    setBatchProgress({
      currentBatch: 0,
      totalBatches: 1,
      processedTerms: 0,
      totalTerms: 0,
      startTime: Date.now()
    });
    
    addLog(`Starting batch processing for context: bookId=${bookId}, chapterId=${chapterId}, paragraphId=${paragraphId}`);
    
    try {
      const firstBatchResult = await processBatch(0, batchSize);
      
      if (!firstBatchResult) {
        setQuizError('Er is een fout opgetreden bij het genereren van de eerste batch vragen');
        setIsGenerating(false);
        return;
      }
      
      const { metadata, questions: firstBatchQuestions } = firstBatchResult;
      
      addLog(`First batch complete: ${firstBatchQuestions.length} questions, ${metadata.totalTerms} total terms`);
      
      setBatchProgress({
        currentBatch: 0,
        totalBatches: metadata.totalBatches,
        processedTerms: firstBatchQuestions.length,
        totalTerms: metadata.totalTerms,
        startTime: Date.now()
      });
      
      setAllQuestions(firstBatchQuestions);
      setQuestions(firstBatchQuestions);
      
      if (metadata.isLastBatch) {
        setIsGenerating(false);
        addLog(`Quiz generation complete with ${firstBatchQuestions.length} questions (single batch)`);
        return;
      }
      
      if (showIncrementalResults) {
        setIsGenerating(false);
      }
      
      let currentBatch = 1;
      let allProcessedQuestions = [...firstBatchQuestions];
      
      const processBatches = async () => {
        while (currentBatch < metadata.totalBatches) {
          addLog(`Processing batch ${currentBatch + 1} of ${metadata.totalBatches}`);
          
          setBatchProgress(prev => prev ? {
            ...prev,
            currentBatch,
            processedTerms: allProcessedQuestions.length
          } : null);
          
          const batchResult = await processBatch(currentBatch, batchSize);
          
          if (!batchResult) {
            addLog(`Batch ${currentBatch} failed, continuing with ${allProcessedQuestions.length} questions`);
            break;
          }
          
          allProcessedQuestions = [...allProcessedQuestions, ...batchResult.questions];
          
          setBatchProgress(prev => prev ? {
            ...prev,
            currentBatch,
            processedTerms: allProcessedQuestions.length
          } : null);
          
          addLog(`Added ${batchResult.questions.length} questions from batch ${currentBatch}, total now: ${allProcessedQuestions.length}`);
          
          setAllQuestions(allProcessedQuestions);
          
          if (showIncrementalResults) {
            setQuestions(allProcessedQuestions);
          }
          
          currentBatch++;
          
          if (batchResult.metadata.isLastBatch) {
            addLog(`Last batch complete, total questions: ${allProcessedQuestions.length}`);
            break;
          }
        }
        
        setQuestions(allProcessedQuestions);
        
        const isBalanced = validateAnswerDistribution(allProcessedQuestions);
        if (!isBalanced) {
          addLog('Warning: The answer distribution is not evenly balanced across A, B, C, and D');
        }
        
        addLog(`Quiz generation complete with ${allProcessedQuestions.length} total questions across ${currentBatch} batches`);
        
        setIsGenerating(false);
        setBatchProgress(null);
      };
      
      processBatches();
      
    } catch (err) {
      console.error('Error in generateQuiz with batches:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
      addLog(`Fatal error in batch processing: ${err instanceof Error ? err.message : String(err)}`);
      setIsGenerating(false);
      setBatchProgress(null);
    }
  };

  const generateQuizForParagraph = async (paragraphId: number, paragraphContent?: string, paragraphNumber?: number) => {
    if (!bookId || !chapterId) {
      setQuizError('Boek of hoofdstuk informatie ontbreekt');
      return;
    }
    
    try {
      setParagraphId(paragraphId);
      
      await generateQuiz(5);
      
    } catch (err) {
      console.error('Error in generateQuizForParagraph:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  };

  const processQuizResponse = (data: any) => {
    setDebugData({...debugData, apiResponse: data});
    addLog(`Full API response received: ${JSON.stringify(data).substring(0, 100)}...`);
    
    if (data.success && data.questions && Array.isArray(data.questions)) {
      if (data.context) {
        addLog(`Generated ${data.questions.length} questions for ${data.context.boldedTermsCount || 'unknown'} bolded terms`);
      }
      
      const formattedQuestions = formatQuestions(data.questions);
      setQuestions(formattedQuestions);
      
      addLog(`Created ${formattedQuestions.length} questions from the API response`);
      
      if (data.debug) {
        setDebugData({
          ...debugData,
          prompt: data.debug.prompt,
          response: data.debug.response,
          tokenEstimates: data.debug.tokenEstimates,
          extractedTerms: data.debug.extractedTerms,
          answerDistribution: data.debug.answerDistribution
        });
        addLog('Debug data saved from API response');
        
        if (data.debug.extractedTerms) {
          addLog(`Terms found in content: ${data.debug.extractedTerms.length}`);
        }
        
        if (data.debug.answerDistribution) {
          addLog(`Answer distribution: A=${data.debug.answerDistribution.A}, B=${data.debug.answerDistribution.B}, C=${data.debug.answerDistribution.C}, D=${data.debug.answerDistribution.D}`);
        }
      }
      
      return formattedQuestions;
    } else {
      setQuizError('Geen vragen konden worden gegenereerd. Controleer of er content beschikbaar is voor dit boek/hoofdstuk.');
      addLog(`Failed to generate questions: Invalid response format or no questions returned`);
      console.error('Invalid response format or no questions:', data);
      return [];
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
    setShowExplanation(true);
    
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
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
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

  const clearQuizState = () => {
    addLog('Clearing quiz state');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsQuizComplete(false);
    setShowExplanation(false);
    setQuizError(null);
    setBatchProgress(null);
    
    if (bookId) {
      const stateKey = `quizState_${bookId}_${chapterId || 'none'}_${paragraphId || 'none'}`;
      localStorage.removeItem(stateKey);
      localStorage.removeItem('lastActiveQuiz');
      addLog(`Removed quiz state from localStorage with key: ${stateKey}`);
    }
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
    batchProgress,
    allQuestions,
    showIncrementalResults,
    setShowIncrementalResults,
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
    toggleExplanation,
    clearQuizState,
    validateAnswerDistribution,
    balanceAnswerDistribution
  };
};
