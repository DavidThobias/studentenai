
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface ChapterData {
  id: number;
  chapter_title?: string;
  chapter_number: number;
  book_id: number;
}

export interface ParagraphData {
  id: number;
  paragraph_number?: number;
  content?: string;
  chapter_number: number;
}

export interface ParagraphProgress {
  id: number;
  completed: boolean;
  score?: number;
  totalQuestions?: number;
}

export const useChaptersAndParagraphs = (bookId: string | number | undefined) => {
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

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setLoading(true);
        if (!bookId) return;

        const numericBookId = typeof bookId === 'string' ? Number(bookId) : bookId;
        
        // Get book title first
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('book_title')
          .eq('id', numericBookId)
          .maybeSingle();
          
        if (bookError || !bookData) {
          console.error('Error fetching book:', bookError);
          return;
        }
        
        // Get chapters using book title
        const { data: chapterData, error: chapterError } = await supabase
          .from('books')
          .select('id, chapter_number, chapter_title')
          .eq('book_title', bookData.book_title)
          .order('chapter_number', { ascending: true });

        if (chapterError) {
          console.error('Error fetching chapters:', chapterError);
          setError('Error fetching chapters');
          throw chapterError;
        }

        // Deduplicate chapters
        const uniqueChapters = new Map<number, ChapterData>();
        chapterData?.forEach(ch => {
          if (!uniqueChapters.has(ch.chapter_number)) {
            uniqueChapters.set(ch.chapter_number, {
              id: ch.chapter_number,
              chapter_title: ch.chapter_title,
              chapter_number: ch.chapter_number,
              book_id: numericBookId
            });
          }
        });
        
        const chaptersArray = Array.from(uniqueChapters.values());
        setChapters(chaptersArray);
        
        if (chaptersArray.length > 0) {
          setSelectedChapterId(chaptersArray[0].id);
          await fetchParagraphs(chaptersArray[0].id);
        }
      } catch (error) {
        console.error('Error fetching chapters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [bookId]);

  const fetchParagraphs = async (chapterId: number) => {
    try {
      setLoadingParagraphs(true);
      setSelectedChapterId(chapterId);
      
      const { data: paragraphsData, error: paragraphsError } = await supabase
        .from('books')
        .select('id, paragraph_number, content, chapter_number')
        .eq('chapter_number', chapterId)
        .order('paragraph_number', { ascending: true });
      
      if (paragraphsError) {
        console.error('Error fetching paragraphs:', paragraphsError);
        setError('Error fetching paragraphs');
        throw paragraphsError;
      }
      
      // Map to ParagraphData type
      const typedParagraphs: ParagraphData[] = paragraphsData.map(p => ({
        id: p.id,
        paragraph_number: p.paragraph_number,
        content: p.content,
        chapter_number: p.chapter_number
      }));
      
      setParagraphs(typedParagraphs);
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
    } finally {
      setLoadingParagraphs(false);
    }
  };

  // New methods required by QuizPage
  const fetchChaptersForBook = async (bookId: number) => {
    setIsLoadingChapters(true);
    try {
      if (!bookId) return;
      
      // Get book title first
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('book_title')
        .eq('id', bookId)
        .maybeSingle();
        
      if (bookError || !bookData) {
        console.error('Error fetching book:', bookError);
        return;
      }
      
      // Get chapters using book title
      const { data: chapterData, error: chapterError } = await supabase
        .from('books')
        .select('id, chapter_number, chapter_title')
        .eq('book_title', bookData.book_title)
        .order('chapter_number', { ascending: true });

      if (chapterError) {
        console.error('Error fetching chapters:', chapterError);
        setError('Error fetching chapters');
        return;
      }

      // Deduplicate chapters
      const uniqueChapters = new Map<number, ChapterData>();
      chapterData?.forEach(ch => {
        if (!uniqueChapters.has(ch.chapter_number)) {
          uniqueChapters.set(ch.chapter_number, {
            id: ch.chapter_number,
            chapter_title: ch.chapter_title,
            chapter_number: ch.chapter_number,
            book_id: bookId
          });
        }
      });
      
      const chaptersArray = Array.from(uniqueChapters.values());
      setChapters(chaptersArray);
    } catch (error) {
      console.error('Error fetching chapters for book:', error);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const fetchAllParagraphsForChapter = async (chapterId: number) => {
    setIsFetchingParagraphs(true);
    try {
      await fetchParagraphs(chapterId);
    } catch (error) {
      console.error('Error fetching all paragraphs for chapter:', error);
    } finally {
      setIsFetchingParagraphs(false);
    }
  };

  const setParagraphCompleted = (paragraphId: number, score: number, totalQuestions: number) => {
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
    // In a real app, we might save this to localStorage or a database
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
    // Added properties for QuizPage.tsx
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
    // For compatibility with QuizEmpty component
    availableChapters: chapters
  };
};
