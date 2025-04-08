
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuizQuestion } from '@/hooks/useQuiz';

// Update the existing QuizQuestion interface or extend it
export interface EnhancedQuizQuestion extends QuizQuestion {
  objective: string | null;
  questionType: string | null;
}

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
  const [questions, setQuestions] = useState<EnhancedQuizQuestion[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>({});
  const [objectivesArray, setObjectivesArray] = useState<string[]>([]);
  const [questionsByObjective, setQuestionsByObjective] = useState<any>(null);
  const [questionTypeDistribution, setQuestionTypeDistribution] = useState<any>(null);
  const [openAIPrompt, setOpenAIPrompt] = useState<string | null>(null);
  const [openAIResponse, setOpenAIResponse] = useState<any>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [allQuestions, setAllQuestions] = useState<EnhancedQuizQuestion[]>([]);

  // Format questions from API response
  const formatQuestions = (rawQuestions: any[]): EnhancedQuizQuestion[] => {
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
        objective: q.objective || null,
        questionType: q.questionType || null
      };
    });
  };

  // Process a batch of questions
  const processBatch = async (batchIndex: number, questionsPerObjective: number = 3) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return false;
    }
    
    try {
      addLog(`Processing batch ${batchIndex + 1}`);
      
      // Generate questions
      const endpoint = isOnlineMarketing 
        ? 'generate-online-marketing-quiz' 
        : 'generate-sales-question';
      
      const payload: any = { 
        bookId,
        questionsPerObjective,
        debug: true,
        batchIndex,
        batchSize: 10 // Process 10 objectives at a time
      };
      
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending batch payload to ${endpoint}: ${JSON.stringify(payload)}`);
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload
      });
      
      if (error) {
        console.error(`Error calling ${endpoint}:`, error);
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        return false;
      }
      
      if (!data || !data.success) {
        addLog(`No valid data returned from ${endpoint}`);
        setQuizError('Er is een fout opgetreden bij het ophalen van de quizvragen');
        return false;
      }
      
      // Save debug data
      if (data.debug) {
        setDebugData(data.debug);
        
        if (data.debug.objectives) {
          setObjectives(data.debug.objectives);
        }
        
        if (data.debug.allObjectives && Array.isArray(data.debug.allObjectives)) {
          setObjectivesArray(data.debug.allObjectives);
        }
        
        if (data.debug.questionTypeDistribution) {
          setQuestionTypeDistribution(data.debug.questionTypeDistribution);
        }
        
        // Add OpenAI prompt and response to debug data
        if (data.debug.prompt) {
          setOpenAIPrompt(data.debug.prompt);
        }
        
        if (data.debug.response) {
          setOpenAIResponse(data.debug.response);
        }
      }
      
      // Process returned questions
      const formattedQuestions = formatQuestions(data.questions);
      
      // Update batch progress
      if (data.metadata) {
        setBatchProgress({
          currentBatch: data.metadata.currentBatch,
          totalBatches: data.metadata.totalBatches,
          processedObjectives: data.metadata.processedObjectives,
          totalObjectives: data.metadata.totalObjectives,
          startTime: batchProgress?.startTime || Date.now()
        });
      }
      
      // Add new questions to the existing ones
      setAllQuestions(prevQuestions => [...prevQuestions, ...formattedQuestions]);
      setQuestions(prevQuestions => [...prevQuestions, ...formattedQuestions]);
      
      // Store questions by objective information
      if (data.metadata?.questionsByObjective) {
        setQuestionsByObjective(prev => {
          if (!prev) return data.metadata.questionsByObjective;
          return { ...prev, ...data.metadata.questionsByObjective };
        });
      }
      
      addLog(`Added ${formattedQuestions.length} questions from batch ${batchIndex + 1}`);
      
      // Return whether there are more batches to process
      return !data.metadata?.isLastBatch;
      
    } catch (err) {
      console.error('Error in processBatch:', err);
      addLog(`Error in batch ${batchIndex + 1}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  // Start quiz generation
  const startQuizGeneration = async (questionsPerObjective: number = 3) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return;
    }
    
    setIsGenerating(true);
    setQuizError(null);
    setQuestions([]);
    setAllQuestions([]);
    setObjectivesArray([]);
    setOpenAIPrompt(null);
    setOpenAIResponse(null);
    setBatchProgress(null);
    
    try {
      // First, try to get objectives directly from books table if chapterId is provided
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
      addLog('Starting batch processing');
      let batchIndex = 0;
      let hasMoreBatches = await processBatch(batchIndex, questionsPerObjective);
      
      // Process remaining batches if needed
      while (hasMoreBatches) {
        batchIndex++;
        hasMoreBatches = await processBatch(batchIndex, questionsPerObjective);
      }
      
      addLog('All batches processed successfully');
      
    } catch (err) {
      console.error('Error in startQuizGeneration:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
      addLog(`Fatal error in quiz generation: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
      setBatchProgress(null);
    }
  };

  return {
    questions,
    isGenerating,
    quizError,
    objectives,
    objectivesArray,
    questionsByObjective,
    questionTypeDistribution,
    startQuizGeneration,
    debugData,
    openAIPrompt,
    openAIResponse,
    batchProgress
  };
};

export default useBookQuizGenerator;
