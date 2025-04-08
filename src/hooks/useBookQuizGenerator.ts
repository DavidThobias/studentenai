
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
  const [quizError, setQuizError] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>({});
  const [objectivesArray, setObjectivesArray] = useState<string[]>([]);
  const [questionsByObjective, setQuestionsByObjective] = useState<any>(null);
  const [questionTypeDistribution, setQuestionTypeDistribution] = useState<any>(null);

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
        objective: q.objective || null,
        questionType: q.questionType || null
      };
    });
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
    setObjectivesArray([]);
    
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
      
      // Generate questions
      const endpoint = isOnlineMarketing 
        ? 'generate-online-marketing-quiz' 
        : 'generate-sales-question';
      
      const payload: any = { 
        debug: true,
        bookId,
        questionsPerObjective
      };
      
      if (chapterId) payload.chapterId = chapterId;
      if (paragraphId) payload.paragraphId = paragraphId;
      
      addLog(`Sending payload to ${endpoint}: ${JSON.stringify(payload)}`);
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload
      });
      
      if (error) {
        console.error(`Error calling ${endpoint}:`, error);
        setQuizError(`Er is een fout opgetreden: ${error.message}`);
        return;
      }
      
      if (!data || !data.success) {
        addLog(`No valid data returned from ${endpoint}`);
        setQuizError('Er is een fout opgetreden bij het ophalen van de quizvragen');
        return;
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
      }
      
      // Process returned questions
      const formattedQuestions = formatQuestions(data.questions);
      
      // Store questions by objective information
      if (data.metadata?.questionsByObjective) {
        setQuestionsByObjective(data.metadata.questionsByObjective);
      } else {
        // Calculate ourselves if not provided
        const byObjective = {};
        formattedQuestions.forEach(q => {
          if (q.objective) {
            if (!byObjective[q.objective]) {
              byObjective[q.objective] = [];
            }
            byObjective[q.objective].push(q);
          }
        });
        setQuestionsByObjective(byObjective);
      }
      
      setQuestions(formattedQuestions);
      addLog(`Generated ${formattedQuestions.length} questions`);
      
    } catch (err) {
      console.error('Error in startQuizGeneration:', err);
      setQuizError(`Er is een onverwachte fout opgetreden: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
      addLog(`Fatal error in quiz generation: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
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
    debugData
  };
};

export default useBookQuizGenerator;
