
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
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id) return;

        const numericBookId = parseInt(id);
        console.log(`Fetching book details for ID: ${numericBookId}`);
        
        // Log Supabase client to verify it's initialized properly
        console.log("Supabase client initialized:", !!supabase);
        
        // Fetch book details - NOTE: Case sensitive table name 'Boeken'
        const { data: bookData, error: bookError } = await supabase
          .from('Boeken')
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
        setBook(bookData);

        // Fetch chapters for this book
        console.log(`Fetching chapters for book ID: ${numericBookId}`);
        const { data: chapterData, error: chapterError } = await supabase
          .from('Chapters')
          .select('*')
          .eq('Boek_id', numericBookId)
          .order('Hoofdstuknummer', { ascending: true });

        if (chapterError) {
          console.error('Error fetching chapters:', chapterError);
          setError('Fout bij ophalen hoofdstukken');
          throw chapterError;
        }
        
        console.log(`Retrieved ${chapterData?.length || 0} chapters:`, chapterData);
        setChapters(chapterData || []);
        
        // If there are chapters, select the first one and fetch its paragraphs
        if (chapterData && chapterData.length > 0) {
          const firstChapterId = chapterData[0].id;
          console.log(`Setting initial selected chapter ID to ${firstChapterId}`);
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
      console.log(`Fetching paragraphs for chapter ID: ${chapterId}`);
      
      // Verify chapter_id is a number
      console.log(`chapter_id type: ${typeof chapterId}, value: ${chapterId}`);
      
      // Try a simple query first to test connection
      const testQuery = await supabase
        .from('Paragrafen')
        .select('count')
        .single();
      
      console.log('Test query result:', testQuery);
      
      // Construct the full query explicitly to debug
      const queryString = `from "Paragrafen" where chapter_id = ${chapterId}`;
      console.log(`Executing query: ${queryString}`);
      
      // Try fetching paragraphs for this chapter
      const { data: paragraphData, error: paragraphError, status, statusText } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', chapterId);
      
      // Log the full response for debugging
      console.log('Supabase response:', { 
        status,
        statusText,
        data: paragraphData,
        error: paragraphError
      });
      
      if (paragraphError) {
        console.error('Error fetching paragraphs:', paragraphError);
        setError(`Fout bij ophalen paragrafen: ${paragraphError.message}`);
        toast.error(`Fout bij ophalen paragrafen: ${paragraphError.message}`);
        throw paragraphError;
      }
      
      console.log(`Retrieved ${paragraphData?.length || 0} paragraphs for chapter ${chapterId}:`, paragraphData);
      
      if (paragraphData && paragraphData.length > 0) {
        // Sort paragraphs by paragraph number if available
        const sortedParagraphs = [...paragraphData].sort((a, b) => {
          const aNum = a["paragraaf nummer"] || 0;
          const bNum = b["paragraaf nummer"] || 0;
          return aNum - bNum;
        });
        
        setParagraphs(sortedParagraphs);
      } else {
        console.log(`No paragraphs found for chapter ${chapterId}`);
        setParagraphs([]);
        
        // Additional debug query to check if any paragraphs exist
        const { count, error: countError } = await supabase
          .from('Paragrafen')
          .select('*', { count: 'exact', head: true });
        
        console.log(`Total paragraphs in database: ${count}`, countError ? countError : '');
        
        // Try alternative approach using the edge function
        try {
          console.log('Trying to fetch paragraphs using edge function');
          const response = await fetch('/api/get-paragraphs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chapterId }),
          });
          
          const result = await response.json();
          console.log('Edge function response:', result);
          
          if (result.success && result.paragraphs && result.paragraphs.length > 0) {
            const sortedParagraphs = [...result.paragraphs].sort((a, b) => {
              const aNum = a["paragraaf nummer"] || 0;
              const bNum = b["paragraaf nummer"] || 0;
              return aNum - bNum;
            });
            
            setParagraphs(sortedParagraphs);
          }
        } catch (edgeFunctionError) {
          console.error('Error calling edge function:', edgeFunctionError);
        }
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
