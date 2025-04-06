
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface ChapterData {
  id: number;
  chapter_title?: string;
  chapter_number: number;
  book_id: number;
  objectives?: string;
}

export interface ParagraphData {
  id: number;
  paragraph_number?: number;
  content?: string;
  chapter_number: number;
  objectives?: string;
}

export interface ParagraphProgress {
  id: number;
  completed: boolean;
  score?: number;
  totalQuestions?: number;
}

export const useChaptersAndParagraphs = (
  bookId: string | number | undefined, 
  chapterId?: number | null,
  addLog?: (message: string) => void
) => {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParagraphs, setLoadingParagraphs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [progressData, setProgressData] = useState<ParagraphProgress[]>([]);
  const [showParagraphContent, setShowParagraphContent] = useState(false);
  const [currentParagraphContent, setCurrentParagraphContent] = useState<string | null>(null);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isFetchingParagraphs, setIsFetchingParagraphs] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());

  const log = (message: string) => {
    if (addLog) {
      addLog(message);
    } else {
      console.log(message);
    }
  };

  const refreshData = useCallback(() => {
    log('Manual refresh triggered in useChaptersAndParagraphs');
    setLastRefreshTime(Date.now());
  }, []);

  useEffect(() => {
    if (chapterId) {
      setSelectedChapterId(chapterId);
      
      if (bookId) {
        sessionStorage.setItem(`selectedChapterId_${bookId}`, String(chapterId));
      }
    } else {
      if (bookId) {
        const savedChapterId = sessionStorage.getItem(`selectedChapterId_${bookId}`);
        if (savedChapterId) {
          setSelectedChapterId(Number(savedChapterId));
          log(`Restored selectedChapterId ${savedChapterId} from session storage`);
        }
      }
    }
  }, [bookId, chapterId]);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setLoading(true);
        if (!bookId) return;

        const numericBookId = typeof bookId === 'string' ? Number(bookId) : bookId;
        
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('book_title')
          .eq('id', numericBookId)
          .maybeSingle();
          
        if (bookError || !bookData) {
          console.error('Error fetching book:', bookError);
          return;
        }
        
        const { data: chapterData, error: chapterError } = await supabase
          .from('books')
          .select('id, chapter_number, chapter_title, objectives')
          .eq('book_title', bookData.book_title)
          .order('chapter_number', { ascending: true });

        if (chapterError) {
          console.error('Error fetching chapters:', chapterError);
          setError('Error fetching chapters');
          throw chapterError;
        }

        const uniqueChapters = new Map<number, ChapterData>();
        chapterData?.forEach(ch => {
          if (!uniqueChapters.has(ch.chapter_number)) {
            uniqueChapters.set(ch.chapter_number, {
              id: ch.chapter_number,
              chapter_title: ch.chapter_title,
              chapter_number: ch.chapter_number,
              book_id: numericBookId,
              objectives: ch.objectives
            });
          }
        });
        
        const chaptersArray = Array.from(uniqueChapters.values());
        setChapters(chaptersArray);
        
        let restoredChapterId: number | null = null;
        
        if (bookId) {
          const savedChapterId = sessionStorage.getItem(`selectedChapterId_${bookId}`);
          if (savedChapterId && chaptersArray.some(c => c.id === Number(savedChapterId))) {
            restoredChapterId = Number(savedChapterId);
            setSelectedChapterId(restoredChapterId);
            log(`Using restored chapter ID: ${restoredChapterId}`);
          }
        }
        
        if (!restoredChapterId && chaptersArray.length > 0 && !selectedChapterId) {
          setSelectedChapterId(chaptersArray[0].id);
          await fetchParagraphs(chaptersArray[0].id);
        } else if (restoredChapterId) {
          await fetchParagraphs(restoredChapterId);
        }
      } catch (error) {
        console.error('Error fetching chapters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [bookId, lastRefreshTime]);

  useEffect(() => {
    if (chapterId) {
      log(`Initial chapterId provided: ${chapterId}, fetching paragraphs`);
      fetchParagraphs(chapterId);
    }
  }, [chapterId, lastRefreshTime]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user || !bookId) return;
      
      const userId = data.session.user.id;
      log(`Setting up real-time subscription for paragraph progress updates for user ${userId}`);
      
      const channel = supabase
        .channel('chapter-paragraph-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'paragraph_progress',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            log(`Real-time update received for paragraph_progress: ${JSON.stringify(payload)}`);
            fetchParagraphProgressData();
          }
        )
        .subscribe();
        
      return () => {
        log('Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    };
    
    fetchSession();
  }, [bookId]);

  const fetchParagraphs = async (chapterId: number) => {
    try {
      setLoadingParagraphs(true);
      setSelectedChapterId(chapterId);
      
      if (bookId) {
        sessionStorage.setItem(`selectedChapterId_${bookId}`, String(chapterId));
        log(`Saved selectedChapterId ${chapterId} to session storage`);
      }
      
      log(`Fetching paragraphs for chapter ${chapterId}`);
      
      const { data: paragraphsData, error: paragraphsError } = await supabase
        .from('books')
        .select('id, paragraph_number, content, chapter_number, objectives')
        .eq('chapter_number', chapterId)
        .order('paragraph_number', { ascending: true });
      
      if (paragraphsError) {
        console.error('Error fetching paragraphs:', paragraphsError);
        setError('Error fetching paragraphs');
        throw paragraphsError;
      }
      
      const typedParagraphs: ParagraphData[] = paragraphsData.map(p => ({
        id: p.id,
        paragraph_number: p.paragraph_number,
        content: p.content,
        chapter_number: p.chapter_number,
        objectives: p.objectives
      }));
      
      setParagraphs(typedParagraphs);
      log(`Fetched ${typedParagraphs.length} paragraphs for chapter ${chapterId}`);
      
      await fetchParagraphProgressData();
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
    } finally {
      setLoadingParagraphs(false);
    }
  };

  const fetchParagraphProgressData = useCallback(async () => {
    try {
      if (!bookId || !selectedChapterId) return;
      
      log(`Fetching paragraph progress data for chapter ${selectedChapterId}`);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      
      if (!session) {
        log('No session found, cannot fetch paragraph progress');
        return;
      }
      
      const numericBookId = typeof bookId === 'string' ? Number(bookId) : bookId;
      
      const { data, error } = await supabase
        .from('paragraph_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('book_id', numericBookId)
        .eq('chapter_id', selectedChapterId);
        
      if (error) {
        console.error('Error fetching paragraph progress:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const mappedProgressData: ParagraphProgress[] = data.map(item => ({
          id: item.paragraph_id,
          completed: item.completed,
          score: item.score,
          totalQuestions: item.total_questions
        }));
        
        log(`Fetched progress for ${mappedProgressData.length} paragraphs`);
        setProgressData(mappedProgressData);
      } else {
        log('No paragraph progress data found');
        setProgressData([]);
      }
    } catch (error) {
      console.error('Error in fetchParagraphProgressData:', error);
    }
  }, [bookId, selectedChapterId]);

  const fetchChaptersForBook = async (bookId: number) => {
    setIsLoadingChapters(true);
    try {
      if (!bookId) return;
      
      log(`Fetching chapters for book ${bookId}`);
      
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('book_title')
        .eq('id', bookId)
        .maybeSingle();
        
      if (bookError || !bookData) {
        console.error('Error fetching book:', bookError);
        return;
      }
      
      const { data: chapterData, error: chapterError } = await supabase
        .from('books')
        .select('id, chapter_number, chapter_title, objectives')
        .eq('book_title', bookData.book_title)
        .order('chapter_number', { ascending: true });

      if (chapterError) {
        console.error('Error fetching chapters:', chapterError);
        setError('Error fetching chapters');
        return;
      }

      const uniqueChapters = new Map<number, ChapterData>();
      chapterData?.forEach(ch => {
        if (!uniqueChapters.has(ch.chapter_number)) {
          uniqueChapters.set(ch.chapter_number, {
            id: ch.chapter_number,
            chapter_title: ch.chapter_title,
            chapter_number: ch.chapter_number,
            book_id: bookId,
            objectives: ch.objectives
          });
        }
      });
      
      const chaptersArray = Array.from(uniqueChapters.values());
      setChapters(chaptersArray);
      log(`Fetched ${chaptersArray.length} chapters for book ${bookId}`);
    } catch (error) {
      console.error('Error fetching chapters for book:', error);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const fetchAllParagraphsForChapter = async (chapterId: number) => {
    setIsFetchingParagraphs(true);
    try {
      log(`Fetching all paragraphs for chapter ${chapterId}`);
      await fetchParagraphs(chapterId);
    } catch (error) {
      console.error('Error fetching all paragraphs for chapter:', error);
    } finally {
      setIsFetchingParagraphs(false);
    }
  };

  const setParagraphCompleted = (paragraphId: number, score: number, totalQuestions: number) => {
    log(`Marking paragraph ${paragraphId} as completed with score ${score}/${totalQuestions}`);
    const updatedProgressData = [...progressData];
    const existingIndex = updatedProgressData.findIndex(p => p.id === paragraphId);
    
    if (existingIndex >= 0) {
      updatedProgressData[existingIndex] = {
        ...updatedProgressData[existingIndex],
        completed: true,
        score,
        totalQuestions
      };
    } else {
      updatedProgressData.push({
        id: paragraphId,
        completed: true,
        score,
        totalQuestions
      });
    }
    
    setProgressData(updatedProgressData);
  };

  const calculateChapterProgress = () => {
    if (paragraphs.length === 0) return 0;
    
    const completedCount = progressData.filter(p => p.completed).length;
    return Math.round((completedCount / paragraphs.length) * 100);
  };

  const toggleParagraphContent = () => {
    setShowParagraphContent(!showParagraphContent);
  };

  const getNextParagraphId = (currentParagraphId: number) => {
    const currentIndex = paragraphs.findIndex(p => p.id === currentParagraphId);
    if (currentIndex === -1 || currentIndex >= paragraphs.length - 1) return null;
    return paragraphs[currentIndex + 1].id;
  };

  const setCurrentParagraph = (paragraphId: number) => {
    log(`Setting current paragraph to ${paragraphId}`);
    const paragraph = paragraphs.find(p => p.id === paragraphId);
    if (paragraph) {
      setCurrentParagraphContent(paragraph.content || null);
    }
  };

  return {
    chapters,
    paragraphs,
    loading,
    loadingParagraphs,
    error,
    fetchParagraphs,
    selectedChapterId,
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
    setCurrentParagraph,
    availableChapters: chapters,
    refreshData,
    fetchParagraphProgressData
  };
};
