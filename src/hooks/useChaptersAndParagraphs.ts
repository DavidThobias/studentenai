import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface ChapterData {
  id: number;
  chapter_title?: string;
  chapter_number: number;
  book_id: number;
}

interface ParagraphData {
  id: number;
  paragraph_number?: number;
  content?: string;
  chapter_number: number;
}

export const useChaptersAndParagraphs = (bookId: string | undefined) => {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParagraphs, setLoadingParagraphs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        setLoading(true);
        if (!bookId) return;

        const numericBookId = Number(bookId);
        
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

  return {
    chapters,
    paragraphs,
    loading,
    loadingParagraphs,
    error,
    fetchParagraphs,
    selectedChapterId
  };
};
