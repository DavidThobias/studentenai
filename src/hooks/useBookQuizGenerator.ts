
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QuizQuestion } from '@/hooks/useQuiz';

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
  const [questionsByObjective, setQuestionsByObjective] = useState<Record<string, number> | null>(null);
  const [questionTypeDistribution, setQuestionTypeDistribution] = useState<any>(null);
  const [openAIPrompt, setOpenAIPrompt] = useState<string | null>(null);
  const [openAIResponse, setOpenAIResponse] = useState<any>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [allQuestions, setAllQuestions] = useState<EnhancedQuizQuestion[]>([]);
  const [maxQuestionsPerObjective, setMaxQuestionsPerObjective] = useState(3); // Default to 3
  const [currentBatchRetries, setCurrentBatchRetries] = useState(0);
  const [failedBatches, setFailedBatches] = useState<number[]>([]);

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

  const processBatch = async (batchIndex: number, questionsPerObjective: number = 3) => {
    if (!bookId) {
      setQuizError('Geen boek geselecteerd om quiz te genereren');
      return false;
    }
    
    // Skip previously failed batches
    if (failedBatches.includes(batchIndex)) {
      addLog(`Skipping previously failed batch ${batchIndex + 1}`);
      return false;
    }
    
    try {
      addLog(`Processing batch ${batchIndex + 1}`);
      
      const endpoint = isOnlineMarketing 
        ? 'generate-online-marketing-quiz' 
        : 'generate-sales-question';
      
      const payload: any = { 
        bookId,
        questionsPerObjective, // Send the exact number we want
        debug: true,
        batchIndex,
        batchSize: 10
      };
      
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending batch payload to ${endpoint}: ${JSON.stringify(payload)}`);
      
      try {
        const { data, error } = await supabase.functions.invoke(endpoint, {
          body: payload
        });
        
        if (error) {
          console.error(`Error calling ${endpoint}:`, error);
          setQuizError(`Er is een fout opgetreden: ${error.message}`);
          setFailedBatches(prev => [...prev, batchIndex]);
          return false;
        }
        
        if (!data || data.success === false) {
          addLog(`No valid data returned from ${endpoint}`);
          if (data?.error) {
            addLog(`API error: ${data.error}`);
            setQuizError(`Er is een fout opgetreden: ${data.error}`);
          } else {
            setQuizError('Er is een fout opgetreden bij het ophalen van de quizvragen');
          }
          setFailedBatches(prev => [...prev, batchIndex]);
          return false;
        }
        
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
          
          if (data.debug.prompt) {
            setOpenAIPrompt(data.debug.prompt);
          }
          
          if (data.debug.response) {
            setOpenAIResponse(data.debug.response);
          }
        }
        
        const formattedQuestions = formatQuestions(data.questions);
        
        if (data.metadata) {
          setBatchProgress({
            currentBatch: data.metadata.currentBatch,
            totalBatches: data.metadata.totalBatches,
            processedObjectives: data.metadata.processedObjectives,
            totalObjectives: data.metadata.totalObjectives,
            startTime: batchProgress?.startTime || Date.now()
          });
        }
        
        // Always add all questions to the allQuestions array for statistics
        setAllQuestions(prevQuestions => [...prevQuestions, ...formattedQuestions]);
        
        // Filter questions by objective to ensure we only include maxQuestionsPerObjective per objective
        if (data.metadata?.questionsByObjective) {
          const questionsByObjectiveTracking = {...(questionsByObjective || {})};
          
          const limitedQuestions = formattedQuestions.filter(q => {
            if (!q.objective) return true;
            
            if (!questionsByObjectiveTracking[q.objective]) {
              questionsByObjectiveTracking[q.objective] = 0;
            }
            
            if (questionsByObjectiveTracking[q.objective] >= questionsPerObjective) {
              return false;
            }
            
            questionsByObjectiveTracking[q.objective]++;
            return true;
          });
          
          setQuestions(prevQuestions => [...prevQuestions, ...limitedQuestions]);
          setQuestionsByObjective(questionsByObjectiveTracking);
          
          addLog(`Added ${limitedQuestions.length} questions (limited to ${questionsPerObjective} per objective) from batch ${batchIndex + 1}`);
        } else {
          setQuestions(prevQuestions => [...prevQuestions, ...formattedQuestions]);
          addLog(`Added ${formattedQuestions.length} questions from batch ${batchIndex + 1} (no objective tracking)`);
        }
        
        setCurrentBatchRetries(0);
        return data.metadata?.isLastBatch === false;
        
      } catch (err) {
        console.error(`Error calling ${endpoint}:`, err);
        
        // Increment retry counter and try again if under the limit
        const newRetryCount = currentBatchRetries + 1;
        setCurrentBatchRetries(newRetryCount);
        
        if (newRetryCount <= 2) { // Maximum 3 attempts per batch
          addLog(`Batch ${batchIndex + 1} failed, retry attempt ${newRetryCount}/3`);
          // Wait a second before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return await processBatch(batchIndex, questionsPerObjective);
        } else {
          setQuizError(`Er is een fout opgetreden bij het ophalen van batch ${batchIndex + 1}: ${err instanceof Error ? err.message : String(err)}`);
          setFailedBatches(prev => [...prev, batchIndex]);
          return false;
        }
      }
      
    } catch (err) {
      console.error('Error in processBatch:', err);
      addLog(`Error in batch ${batchIndex + 1}: ${err instanceof Error ? err.message : String(err)}`);
      setFailedBatches(prev => [...prev, batchIndex]);
      return false;
    }
  };

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
    setQuestionsByObjective(null);
    setFailedBatches([]);
    setCurrentBatchRetries(0);
    setMaxQuestionsPerObjective(questionsPerObjective);
    
    try {
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
      
      addLog('Starting batch processing');
      let batchIndex = 0;
      let hasMoreBatches = await processBatch(batchIndex, questionsPerObjective);
      
      // Process batches until all are completed or there's an error
      let maxIterations = 5; // Safety limit to prevent infinite loops
      let currentIteration = 0;
      
      while (hasMoreBatches && currentIteration < maxIterations) {
        batchIndex++;
        currentIteration++;
        addLog(`Processing batch ${batchIndex}`);
        hasMoreBatches = await processBatch(batchIndex, questionsPerObjective);
        
        // Add a small delay between batch requests to avoid rate limiting
        if (hasMoreBatches) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      addLog('All batches processed successfully');
      
      const finalQuestionsByObjective = questionsByObjective || {};
      const objectiveKeys = Object.keys(finalQuestionsByObjective);
      
      addLog(`Final questions count: ${questions.length} from ${objectiveKeys.length} objectives`);
      addLog(`Questions per objective: ${JSON.stringify(finalQuestionsByObjective)}`);
      
      // If we didn't get any questions, show a clear error
      if (questions.length === 0) {
        setQuizError('Geen vragen konden worden gegenereerd. Probeer opnieuw of kies een ander hoofdstuk.');
      }
      
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
    batchProgress,
    allQuestions
  };
};

export default useBookQuizGenerator;
