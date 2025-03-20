
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapBooksDataToParagraphs } from '@/lib/bookDataAdapter';

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
        
        console.log("Supabase client initialized:", !!supabase);
        
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
        
        if (chapterData && chapterData.length > 0) {
          const firstChapterId = chapterData[0].id;
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
      console.log(`chapter_id type: ${typeof numericChapterId}, value: ${numericChapterId}`);
      
      console.log('Trying Edge Function first...');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        
        console.log(`Access token available: ${!!accessToken}`);
        
        const response = await fetch('https://ncipejuazrewiizxtkcj.supabase.co/functions/v1/get-paragraphs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ chapterId: numericChapterId }),
        });
        
        console.log('Edge function status:', response.status);
        console.log('Edge function status text:', response.statusText);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('Edge function response:', responseData);
          
          if (responseData.success && responseData.paragraphs && responseData.paragraphs.length > 0) {
            const sortedParagraphs = [...responseData.paragraphs].sort((a, b) => {
              const aNum = a["paragraaf nummer"] || 0;
              const bNum = b["paragraaf nummer"] || 0;
              return aNum - bNum;
            });
            
            setParagraphs(sortedParagraphs);
            setLoadingParagraphs(false);
            return;
          }
        } else {
          const errorData = await response.text();
          console.log('Edge function error response:', errorData);
        }
      } catch (edgeFunctionError) {
        console.error('Error calling edge function:', edgeFunctionError);
      }
      
      console.log('Trying direct Supabase query...');
      
      // Try original table (Paragrafen)
      const paragraphsFromParagrafen = await fetchFromParagrafen(numericChapterId);
      if (paragraphsFromParagrafen && paragraphsFromParagrafen.length > 0) {
        console.log(`Retrieved ${paragraphsFromParagrafen.length} paragraphs from Paragrafen table`);
        const sortedParagraphs = [...paragraphsFromParagrafen].sort((a, b) => {
          const aNum = a["paragraaf nummer"] || 0;
          const bNum = b["paragraaf nummer"] || 0;
          return aNum - bNum;
        });
        
        setParagraphs(sortedParagraphs);
        setLoadingParagraphs(false);
        return;
      }
      
      // Try new books table as fallback
      console.log('Trying new books table...');
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('chapter_number', numericChapterId);
        
      console.log('Books table query result:', {
        data: booksData,
        error: booksError,
        count: booksData?.length || 0
      });
      
      if (!booksError && booksData && booksData.length > 0) {
        // Convert books data format to match ParagraphData interface
        const mappedParagraphs = mapBooksDataToParagraphs(booksData);
        console.log(`Mapped ${mappedParagraphs.length} paragraphs from books table`);
        
        setParagraphs(mappedParagraphs);
        setLoadingParagraphs(false);
        return;
      }
      
      console.log('No paragraphs found in any table.');
      setParagraphs([]);
    } catch (error) {
      console.error('Error fetching paragraphs:', error);
      toast.error('Er is een fout opgetreden bij het ophalen van de paragrafen');
      setParagraphs([]);
    } finally {
      setLoadingParagraphs(false);
    }
  };
  
  const fetchFromParagrafen = async (numericChapterId: number): Promise<ParagraphData[] | null> => {
    try {
      const { data: paragraphData, error: paragraphError } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', numericChapterId);
        
      if (!paragraphError && paragraphData && paragraphData.length > 0) {
        return paragraphData;
      }
      
      // Try with string conversion
      const { data: stringData, error: stringError } = await supabase
        .from('Paragrafen')
        .select('*')
        .eq('chapter_id', String(numericChapterId));
        
      if (!stringError && stringData && stringData.length > 0) {
        return stringData;
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchFromParagrafen:', error);
      return null;
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
