
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuizQuestion } from '@/hooks/useQuiz';

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedObjectives: number;
  totalObjectives: number;
  startTime: number;
}

interface UseBookQuizGeneratorProps {
  bookId: number | null;
  chapterId: number | null;
  paragraphId: number | null;
  isOnlineMarketing?: boolean;
  addLog?: (message: string) => void;
}

export const useBookQuizGenerator = ({
  bookId,
  chapterId,
  paragraphId,
  isOnlineMarketing = false,
  addLog = console.log
}: UseBookQuizGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<string | null>(null);
  const [loadNextBatchTrigger, setLoadNextBatchTrigger] = useState(0);
  const [hasMoreBatches, setHasMoreBatches] = useState(false);
  const [debugData, setDebugData] = useState<any>({});
  const [objectivesArray, setObjectivesArray] = useState<string[]>([]);
  const [currentObjectives, setCurrentObjectives] = useState<string[]>([]);

  // Format questions from API response
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
      
      let cleanedExplanation = q.explanation || "Dit is het correcte antwoord volgens de theorie.";
      
      return {
        question: q.question,
        options: q.options,
        correctAnswer: correctAnswerIndex,
        explanation: cleanedExplanation,
        objective: q.objective || null
      };
    });
  };

  // Process a single batch of questions
  const processBatch = async (batchIndex: number, batchSize: number = 3) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return null;
    }

    try {
      addLog(`Processing batch ${batchIndex} with size ${batchSize}`);
      
      const endpoint = isOnlineMarketing 
        ? 'generate-online-marketing-quiz' 
        : 'generate-sales-question';
      
      const payload: any = { 
        batchIndex,
        batchSize,
        debug: true,
        bookId,
      };
      
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending batch payload to ${endpoint}: ${JSON.stringify(payload)}`);
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload
      });
      
      if (error) {
        console.error(`Error calling ${endpoint} for batch:`, error);
        addLog(`Error with batch ${batchIndex}: ${error.message}`);
        return null;
      }
      
      if (!data || !data.success) {
        addLog(`No valid data returned for batch ${batchIndex}`);
        return null;
      }
      
      if (data.debug) {
        setDebugData(data.debug);
        
        if (data.debug.objectives) {
          setObjectives(data.debug.objectives);
        }
        
        if (data.debug.allObjectives && Array.isArray(data.debug.allObjectives)) {
          setObjectivesArray(data.debug.allObjectives);
        }
        
        if (data.debug.batchObjectives && Array.isArray(data.debug.batchObjectives)) {
          setCurrentObjectives(prev => [...prev, ...data.debug.batchObjectives]);
        }
      }
      
      let formattedQuestions = formatQuestions(data.questions);
      
      return {
        questions: formattedQuestions,
        metadata: data.metadata || { 
          isLastBatch: formattedQuestions.length < batchSize, 
          totalObjectives: formattedQuestions.length, 
          totalBatches: Math.ceil(formattedQuestions.length / batchSize) || 1,
          objectivesInBatch: data.metadata?.objectivesInBatch || []
        },
        objectives: data.debug?.objectives
      };
    } catch (err) {
      console.error(`Error processing batch ${batchIndex}:`, err);
      addLog(`Error in batch ${batchIndex}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  };

  // Start quiz generation
  const startQuizGeneration = async (batchSize: number = 3) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return;
    }
    
    setIsGenerating(true);
    setQuizError(null);
    setQuestions([]);
    setAllQuestions([]);
    setCurrentBatch(0);
    setTotalBatches(1);
    setHasMoreBatches(false);
    setObjectivesArray([]);
    setCurrentObjectives([]);
    
    try {
      // First, try to get objectives directly from books table
      if (chapterId) {
        try {
          const { data, error } = await supabase
            .from('books')
            .select('objectives')
            .eq('chapter_number', chapterId)
            .limit(1)
            .maybeSingle();
            
          if (!error && data && data.objectives) {
            setObjectives(data.objectives);
            addLog(`Fetched objectives for chapter ${chapterId}`);
          }
        } catch (err) {
          console.error('Error fetching objectives:', err);
        }
      }
      
      // Process first batch
      const firstBatchResult = await processBatch(0, batchSize);
      
      if (!firstBatchResult) {
        setQuizError('Er is een fout opgetreden bij het genereren van de eerste batch vragen');
        setIsGenerating(false);
        return;
      }
      
      const { metadata, questions: firstBatchQuestions, objectives: batchObjectives } = firstBatchResult;
      
      if (batchObjectives && !objectives) {
        setObjectives(batchObjectives);
      }
      
      const estimatedTotalBatches = metadata?.totalBatches || 1;
      setTotalBatches(estimatedTotalBatches);
      
      addLog(`First batch complete: ${firstBatchQuestions.length} questions, estimated ${estimatedTotalBatches} total batches`);
      
      setBatchProgress({
        currentBatch: 0,
        totalBatches: estimatedTotalBatches,
        processedObjectives: metadata.objectivesInBatch?.length || 0,
        totalObjectives: metadata?.totalObjectives || 0,
        startTime: Date.now()
      });
      
      setAllQuestions(firstBatchQuestions);
      setQuestions(firstBatchQuestions);
      setCurrentBatch(0);
      
      // Check if we should prepare for the next batch
      const isLastBatch = metadata?.isLastBatch || estimatedTotalBatches <= 1;
      setHasMoreBatches(!isLastBatch);
      
      setIsGenerating(false);
    } catch (err) {
      console.error('Error in startQuizGeneration:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
      addLog(`Fatal error in batch processing: ${err instanceof Error ? err.message : String(err)}`);
      setIsGenerating(false);
      setBatchProgress(null);
    }
  };

  // Load the next batch when triggered
  const loadNextBatch = async () => {
    if (!hasMoreBatches || isGenerating) return;
    
    const nextBatchIndex = currentBatch + 1;
    setIsGenerating(true);
    
    try {
      addLog(`Loading next batch (${nextBatchIndex})`);
      const batchResult = await processBatch(nextBatchIndex, 3);
      
      if (!batchResult) {
        addLog(`Batch ${nextBatchIndex} failed, no more batches will be loaded`);
        setHasMoreBatches(false);
        setIsGenerating(false);
        return;
      }
      
      const { questions: newQuestions, metadata } = batchResult;
      
      // Add new questions to the existing ones
      const updatedAllQuestions = [...allQuestions, ...newQuestions];
      setAllQuestions(updatedAllQuestions);
      setQuestions(updatedAllQuestions);
      
      setCurrentBatch(nextBatchIndex);
      setBatchProgress(prev => prev ? {
        ...prev,
        currentBatch: nextBatchIndex,
        processedObjectives: prev.processedObjectives + (metadata.objectivesInBatch?.length || 0)
      } : null);
      
      setHasMoreBatches(!(metadata?.isLastBatch || nextBatchIndex >= totalBatches - 1));
      
      addLog(`Added ${newQuestions.length} questions from batch ${nextBatchIndex}, total now: ${updatedAllQuestions.length}`);
      addLog(`Has more batches: ${!metadata?.isLastBatch && nextBatchIndex < totalBatches - 1}`);
    } catch (err) {
      console.error(`Error loading batch ${nextBatchIndex}:`, err);
      setQuizError(`Fout bij het laden van batch ${nextBatchIndex}: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger loading the next batch when loadNextBatchTrigger changes
  useEffect(() => {
    if (loadNextBatchTrigger > 0 && hasMoreBatches && !isGenerating) {
      loadNextBatch();
    }
  }, [loadNextBatchTrigger]);

  // Function to be called when the user starts answering the first question
  const triggerNextBatch = () => {
    if (hasMoreBatches && !isGenerating) {
      setLoadNextBatchTrigger(prev => prev + 1);
    }
  };

  return {
    questions,
    allQuestions,
    isGenerating,
    quizError,
    objectives,
    objectivesArray,
    currentObjectives,
    batchProgress,
    hasMoreBatches,
    currentBatch,
    totalBatches,
    startQuizGeneration,
    triggerNextBatch,
    debugData
  };
};

export default useBookQuizGenerator;
