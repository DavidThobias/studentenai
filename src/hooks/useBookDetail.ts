
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BookData {
  id: number;
  Titel?: string;
  Auteur?: string;
}

interface ChapterData {
  id: number;
  Titel?: string;
  Hoofdstuknummer?: string;
  Boek_id: number;
}

interface ParagraphData {
  id: number;
  "paragraaf nummer"?: number;
  content?: string;
  chapter_id: number;
}

export const useBookDetail = (id: string | undefined) => {
  const navigate = useNavigate();
  const [book, setBook] = useState<BookData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [paragraphs, setParagraphs] = useState<ParagraphData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingParagraphs, setLoadingParagraphs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id) return;

        console.log(`Fetching book details for ID: ${id}`);
        // Fetch book details - NOTE: Case sensitive table name 'Boeken'
        const { data: bookData, error: bookError } = await supabase
          .from('Boeken')
          .select('*')
          .eq('id', parseInt(id))
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
        setBook(bookData);

        // Fetch chapters for this book
        console.log(`Fetching chapters for book ID: ${id}`);
        const { data: chapterData, error: chapterError } = await supabase
          .from('Chapters')
          .select('*')
          .eq('Boek_id', parseInt(id))
          .order('Hoofdstuknummer', { ascending: true });

        if (chapterError) {
          console.error('Error fetching chapters:', chapterError);
          setError('Fout bij ophalen hoofdstukken');
          throw chapterError;
        }
        
        console.log(`Retrieved ${chapterData?.length || 0} chapters`);
        setChapters(chapterData || []);
        
        // Fetch paragraphs for the first chapter
        if (chapterData && chapterData.length > 0) {
          fetchParagraphs(chapterData[0].id);
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
      console.log(`Fetching paragraphs for chapter ID: ${chapterId}`);
      
      const { data: paragraphData, error: paragraphError } = await supabase
        .from('Paragraven')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('"paragraaf nummer"', { ascending: true });

      if (paragraphError) {
        console.error('Error fetching paragraphs:', paragraphError);
        setError('Fout bij ophalen paragrafen');
        throw paragraphError;
      }
      
      console.log(`Retrieved ${paragraphData?.length || 0} paragraphs`);
      setParagraphs(paragraphData || []);
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
      toast.error('Er is een fout opgetreden bij het ophalen van de paragrafen');
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
    fetchParagraphs
  };
};
