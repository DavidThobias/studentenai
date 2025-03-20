
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
      
      // Force conversion to number to ensure type consistency
      const numericChapterId = Number(chapterId);
      
      // Log detailed debugging information
      console.log(`Fetching paragraphs for chapter ID: ${numericChapterId}`);
      console.log(`chapter_id type: ${typeof numericChapterId}, value: ${numericChapterId}`);
      
      // APPROACH 1: Try Edge Function first - this is the most reliable method
      console.log('Trying Edge Function first...');
      try {
        // Get the full Supabase URL for the edge function
        const result = await fetch('https://ncipejuazrewiizxtkcj.supabase.co/functions/v1/get-paragraphs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.auth.getSession()?.data?.session?.access_token || ''}`,
          },
          body: JSON.stringify({ chapterId: numericChapterId }),
        });
        
        console.log('Edge function status:', result.status);
        console.log('Edge function status text:', result.statusText);
        
        const response = await result.json();
        console.log('Edge function response:', response);
        
        if (response.success && response.paragraphs && response.paragraphs.length > 0) {
          const sortedParagraphs = [...response.paragraphs].sort((a, b) => {
            const aNum = a["paragraaf nummer"] || 0;
            const bNum = b["paragraaf nummer"] || 0;
            return aNum - bNum;
          });
          
          setParagraphs(sortedParagraphs);
          setLoadingParagraphs(false);
          return; // Exit if successful
        }
      } catch (edgeFunctionError) {
        console.error('Error calling edge function:', edgeFunctionError);
      }
      
      // APPROACH 2: Try direct Supabase query - Split into separate operations to avoid deep type instantiation
      console.log('Trying direct Supabase query...');
      
      // First try a simple count query to test connection
      const countQuery = supabase.from('Paragrafen').select('*', { count: 'exact', head: true });
      const { count, error: countError } = await countQuery;
      
      console.log(`Total paragraphs in database: ${count}`, countError ? countError : '');
      
      // Direct query with breaking up the chain to avoid type instantiation issues
      const baseQuery = supabase.from('Paragrafen');
      const selectQuery = baseQuery.select('*');
      const { data: paragraphData, error: paragraphError, status, statusText } = await selectQuery.eq('chapter_id', numericChapterId);
      
      // Log the full response for debugging
      console.log('Supabase direct query response:', { 
        status,
        statusText,
        data: paragraphData,
        error: paragraphError,
        queryParams: {
          table: 'Paragrafen',
          column: 'chapter_id',
          value: numericChapterId,
          valueType: typeof numericChapterId
        }
      });
      
      if (!paragraphError && paragraphData && paragraphData.length > 0) {
        console.log(`Retrieved ${paragraphData.length} paragraphs for chapter ${numericChapterId}`);
        
        // Sort paragraphs by paragraph number if available
        const sortedParagraphs = [...paragraphData].sort((a, b) => {
          const aNum = a["paragraaf nummer"] || 0;
          const bNum = b["paragraaf nummer"] || 0;
          return aNum - bNum;
        });
        
        setParagraphs(sortedParagraphs);
        setLoadingParagraphs(false);
        return; // Exit if successful
      }
      
      // APPROACH 3: Try string conversion of chapter_id
      console.log('Trying with string conversion of chapter_id...');
      const stringBaseQuery = supabase.from('Paragrafen');
      const stringSelectQuery = stringBaseQuery.select('*');
      const { data: stringData, error: stringError } = await stringSelectQuery.eq('chapter_id', String(numericChapterId));
      
      console.log('String conversion query result:', {
        data: stringData,
        error: stringError
      });
      
      if (!stringError && stringData && stringData.length > 0) {
        console.log(`Retrieved ${stringData.length} paragraphs with string conversion`);
        
        // Sort paragraphs by paragraph number if available
        const sortedParagraphs = [...stringData].sort((a, b) => {
          const aNum = a["paragraaf nummer"] || 0;
          const bNum = b["paragraaf nummer"] || 0;
          return aNum - bNum;
        });
        
        setParagraphs(sortedParagraphs);
        setLoadingParagraphs(false);
        return; // Exit if successful
      }
      
      // APPROACH 4: Try different capitalization of the column name
      console.log('Trying alternative column names (Chapter_id, CHAPTER_ID)...');
      
      // Try with Chapter_id
      const altBase1 = supabase.from('Paragrafen');
      const altSelect1 = altBase1.select('*');
      const { data: altData1 } = await altSelect1.eq('Chapter_id', numericChapterId);
          
      if (altData1 && altData1.length > 0) {
        console.log('Found paragraphs using Chapter_id:', altData1);
        setParagraphs(altData1);
        setLoadingParagraphs(false);
        return; // Exit if successful
      }
      
      // Try with CHAPTER_ID
      const altBase2 = supabase.from('Paragrafen');
      const altSelect2 = altBase2.select('*');
      const { data: altData2 } = await altSelect2.eq('CHAPTER_ID', numericChapterId);
          
      if (altData2 && altData2.length > 0) {
        console.log('Found paragraphs using CHAPTER_ID:', altData2);
        setParagraphs(altData2);
        setLoadingParagraphs(false);
        return; // Exit if successful
      }
      
      // APPROACH 5: Fetch all paragraphs and filter manually
      console.log('Fetching all paragraphs and filtering manually...');
      const allBase = supabase.from('Paragrafen');
      const allSelect = allBase.select('*');
      const { data: allParagraphs } = await allSelect.limit(100);
          
      console.log('All paragraphs sample:', allParagraphs);
      
      // Check if any paragraphs match our chapter ID manually
      const matchingParagraphs = allParagraphs?.filter(p => {
        // Try multiple ways of comparing
        const matches = 
          p.chapter_id === numericChapterId || 
          String(p.chapter_id) === String(numericChapterId) ||
          Number(p.chapter_id) === numericChapterId;
        
        console.log(`Paragraph ${p.id} chapter_id: ${p.chapter_id} (${typeof p.chapter_id}) matches: ${matches}`);
        return matches;
      });
      
      if (matchingParagraphs && matchingParagraphs.length > 0) {
        console.log('Found matching paragraphs through manual filtering:', matchingParagraphs);
        setParagraphs(matchingParagraphs);
        setLoadingParagraphs(false);
        return; // Exit if successful
      }
      
      // If all approaches fail, set empty array and log the issue
      console.log('All approaches failed to retrieve paragraphs.');
      setParagraphs([]);
      
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
