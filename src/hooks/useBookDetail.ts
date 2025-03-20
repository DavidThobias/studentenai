
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapBooksDataToParagraphs } from '@/lib/bookDataAdapter';

export interface BookData {
  id: number;
  book_title?: string;
}

export interface ChapterData {
  id: number;
  chapter_title?: string;
  chapter_number: number;
  book_id: number;
}

export interface ParagraphData {
  id: number;
  paragraph_number?: number;
  "paragraaf nummer"?: number; // This is the field coming from the adapter
  content?: string;
  chapter_number: string; // Changed to string for consistency
}

export const useBookDetail = (id: string | undefined) => {
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParagraphs, setLoadingParagraphs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id) return;

        const numericBookId = parseInt(id);
        console.log(`Fetching book details for ID: ${numericBookId}`);
        
        // Fetch book from books table
        const { data: bookData, error: bookError } = await supabase
          .from('books')
          .select('*')
          .eq('id', numericBookId)
          .maybeSingle();

        if (bookError) {
          console.error('Error fetching book details:', bookError);
          setError('Fout bij ophalen boekgegevens');
          throw bookError;
        }
        
        if (!bookData) {
          console.error('Book not found:', id);
          toast.error('Boek niet gevonden');
          navigate('/books');
          return;
        }

        console.log('Book data retrieved:', bookData);
        setBook({
          id: bookData.id,
          book_title: bookData.book_title
        });

        // Get chapters for this book (based on unique chapter numbers)
        const { data: chapterData, error: chapterError } = await supabase
          .from('books')
          .select('id, chapter_number, chapter_title')
          .eq('book_title', bookData.book_title)
          .order('chapter_number', { ascending: true });

        if (chapterError) {
          console.error('Error fetching chapters:', chapterError);
          setError('Fout bij ophalen hoofdstukken');
          throw chapterError;
        }

        // Deduplicate chapters and map to ChapterData format
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
        console.log(`Retrieved ${chaptersArray.length} chapters:`, chaptersArray);
        setChapters(chaptersArray);
        
        if (chaptersArray.length > 0) {
          const firstChapterId = chaptersArray[0].id;
          console.log(`Setting initial selected chapter ID: ${firstChapterId}`);
          setSelectedChapterId(firstChapterId);
          
          await fetchParagraphs(firstChapterId);
        } else {
          console.log('No chapters found for this book');
        }
      } catch (error) {
        console.error('Error fetching book details:', error);
        toast.error('Er is een fout opgetreden bij het ophalen van de boekgegevens');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [id, navigate]);

  const fetchParagraphs = async (chapterId: number) => {
    try {
      setLoadingParagraphs(true);
      setError(null);
      setSelectedChapterId(chapterId);
      
      const numericChapterId = Number(chapterId);
      
      console.log(`Fetching paragraphs for chapter ID: ${numericChapterId}`);
      
      // Try to get paragraphs directly from books table
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('chapter_number', numericChapterId)
        .order('paragraph_number', { ascending: true });
      
      console.log('Books table query result:', {
        data: booksData,
        error: booksError,
        count: booksData?.length || 0
      });
      
      if (!booksError && booksData && booksData.length > 0) {
        // Convert books data format to match ParagraphData interface
        const mappedParagraphs = mapBooksDataToParagraphs(booksData);
        console.log(`Mapped ${mappedParagraphs.length} paragraphs from books table`);
        
        // Need to explicitly type this as ParagraphData[]
        const typedParagraphs: ParagraphData[] = mappedParagraphs.map(p => ({
          id: p.id,
          paragraph_number: p["paragraaf nummer"],
          content: p.content,
          chapter_number: String(numericChapterId) // Ensure chapter_number is a string
        }));
        
        console.log('Typed paragraphs:', typedParagraphs);
        setParagraphs(typedParagraphs);
      } else {
        console.log('No paragraphs found.');
        setParagraphs([]);
      }
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
      toast.error('Er is een fout opgetreden bij het ophalen van de paragrafen');
      setParagraphs([]);
    } finally {
      setLoadingParagraphs(false);
    }
  };

  return {
    book,
    chapters,
    paragraphs,
    loading,
    loadingParagraphs,
    error,
    fetchParagraphs,
    selectedChapterId
  };
};
