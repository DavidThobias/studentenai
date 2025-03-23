import { useState } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ParagraphData {
  id: number;
  paragraph_number?: number;
  content?: string;
  chapter_number: number;
}

export interface ChapterData {
  id: number;
  chapter_number: number;
  chapter_title?: string;
}

export interface ParagraphProgress {
  id: number;
  paragraphNumber: number;
  chapterId: number;
  completed: boolean;
  score?: number;
  totalQuestions?: number;
  lastAttemptDate?: Date;
}

export const useChaptersAndParagraphs = (
  initialBookId: number | null, 
  initialChapterId: number | null,
  addLog: (message: string) => void
) => {
  const [availableChapters, setAvailableChapters] = useState<ChapterData[]>([]);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [progressData, setProgressData] = useState<ParagraphProgress[]>([]);
  const [currentParagraphContent, setCurrentParagraphContent] = useState<string>('');
  const [showParagraphContent, setShowParagraphContent] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isFetchingParagraphs, setIsFetchingParagraphs] = useState(false);

  const fetchChaptersForBook = async (bookId: number) => {
    try {
      setIsLoadingChapters(true);
      addLog(`Fetching chapters for book ${bookId}`);
      
      const { data, error } = await supabase
        .from('books')
        .select('id, chapter_number, chapter_title')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true });
      
      if (error) {
        console.error('Error fetching chapters:', error);
        addLog(`Error fetching chapters: ${error.message}`);
        return;
      }
      
      if (data && data.length > 0) {
        // Filter unique chapters by chapter_number
        const uniqueChapters = data.filter((chapter, index, self) => 
          index === self.findIndex(c => c.chapter_number === chapter.chapter_number)
        );
        
        // Explicitly map to ChapterData type to avoid deep type instantiation
        const chaptersData: ChapterData[] = uniqueChapters.map(chapter => ({
          id: chapter.id,
          chapter_number: chapter.chapter_number,
          chapter_title: chapter.chapter_title
        }));
        
        setAvailableChapters(chaptersData);
        addLog(`Fetched ${chaptersData.length} chapters for book ${bookId}`);
      } else {
        addLog(`No chapters found for book ${bookId}`);
      }
    } catch (err) {
      console.error('Error in fetchChaptersForBook:', err);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const fetchAllParagraphsForChapter = async (chapterId: number) => {
    try {
      setIsFetchingParagraphs(true);
      addLog(`Fetching all paragraphs for chapter ${chapterId}`);
      
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('chapter_number', chapterId)
        .order('paragraph_number', { ascending: true });
      
      if (error) {
        console.error('Error fetching paragraphs:', error);
        addLog(`Error fetching paragraphs: ${error.message}`);
        toast.error(`Fout bij ophalen paragrafen: ${error.message}`);
        return [];
      }
      
      if (!data) {
        addLog('No paragraphs found for this chapter - empty data response');
        toast.warning('Geen paragrafen gevonden voor dit hoofdstuk');
        return [];
      }
      
      // Explicitly map to ParagraphData type to avoid deep type instantiation
      const typedParagraphs: ParagraphData[] = data.map(p => ({
        id: p.id,
        paragraph_number: p.paragraph_number,
        content: p.content,
        chapter_number: p.chapter_number
      }));
      
      setParagraphs(typedParagraphs);
      addLog(`Fetched ${typedParagraphs.length} paragraphs for chapter ${chapterId}`);
      
      // Create initial progress data
      const initialProgressData = typedParagraphs.map(p => ({
        id: p.id,
        paragraphNumber: p.paragraph_number || 0,
        chapterId: p.chapter_number,
        completed: false,
      }));
      
      setProgressData(initialProgressData);
      
      if (typedParagraphs.length > 0) {
        return typedParagraphs;
      } else {
        addLog('No paragraphs found for this chapter - empty array');
        toast.warning('Geen paragrafen gevonden voor dit hoofdstuk');
        return [];
      }
    } catch (err) {
      console.error('Error in fetchAllParagraphsForChapter:', err);
      addLog(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    } finally {
      setIsFetchingParagraphs(false);
    }
  };

  const setParagraphCompleted = (paragraphId: number, score: number, totalQuestions: number) => {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passingScore = 70;
    
    setProgressData(prevData => 
      prevData.map(p => {
        if (p.id === paragraphId) {
          return {
            ...p,
            completed: percentage >= passingScore,
            score: score,
            totalQuestions: totalQuestions,
            lastAttemptDate: new Date()
          };
        }
        return p;
      })
    );
    
    if (percentage >= passingScore) {
      toast.success(`Je hebt dit onderdeel met succes afgerond! (${percentage}%)`);
    } else {
      toast.info(`Je moet minimaal 70% scoren om door te gaan. Probeer het nog eens. (${percentage}%)`);
    }
  };

  const calculateChapterProgress = () => {
    if (progressData.length === 0) return 0;
    const completedCount = progressData.filter(p => p.completed).length;
    return Math.round((completedCount / progressData.length) * 100);
  };

  const toggleParagraphContent = () => {
    setShowParagraphContent(!showParagraphContent);
  };

  const getNextParagraphId = (currentParagraphId: number) => {
    if (paragraphs.length === 0) return null;
    
    const currentIndex = paragraphs.findIndex(p => p.id === currentParagraphId);
    if (currentIndex >= 0 && currentIndex < paragraphs.length - 1) {
      return paragraphs[currentIndex + 1].id;
    }
    
    return null;
  };

  const getParagraphById = (paragraphId: number) => {
    return paragraphs.find(p => p.id === paragraphId);
  };

  const setCurrentParagraph = (paragraphId: number) => {
    const paragraph = paragraphs.find(p => p.id === paragraphId);
    if (paragraph) {
      setCurrentParagraphContent(paragraph.content || 'No content available');
    }
  };

  return {
    availableChapters,
    paragraphs,
    progressData,
    currentParagraphContent,
    showParagraphContent,
    isLoadingChapters,
    isFetchingParagraphs,
    fetchChaptersForBook,
    fetchAllParagraphsForChapter,
    setParagraphCompleted,
    calculateChapterProgress,
    toggleParagraphContent,
    getNextParagraphId,
    getParagraphById,
    setCurrentParagraph
  };
};
