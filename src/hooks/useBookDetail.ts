
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
        // Get the session - properly await for the token
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        
        console.log(`Access token available: ${!!accessToken}`);
        
        // Call the edge function with proper authorization header if available
        const response = await fetch('https://ncipejuazrewiizxtkcj.supabase.co/functions/v1/get-paragraphs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Only include Authorization header if we have a token
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
            return; // Exit if successful
          }
        } else {
          const errorData = await response.text();
          console.log('Edge function error response:', errorData);
        }
      } catch (edgeFunctionError) {
        console.error('Error calling edge function:', edgeFunctionError);
        // Continue to other approaches
      }
      
      // APPROACH 2: Try direct Supabase query 
      console.log('Trying direct Supabase query...');
      
      // First try a simple count query to test connection
      const countResult = await supabase
        .from('Paragrafen')
        .select('*', { count: 'exact', head: true });
        
      const count = countResult.count;
      const countError = countResult.error;
      
      console.log(`Total paragraphs in database: ${count}`, countError ? countError : '');
      
      // Use separate query to avoid chaining and type instantiation issues
      let paragraphsResult;
      try {
        paragraphsResult = await supabase
          .from('Paragrafen')
          .select('*')
          .eq('chapter_id', numericChapterId);
      } catch (error) {
        console.error('Error executing direct query:', error);
        paragraphsResult = { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
      
      const paragraphData = paragraphsResult.data;
      const paragraphError = paragraphsResult.error;
      const status = paragraphsResult.status;
      const statusText = paragraphsResult.statusText;
      
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
      
      let stringResult;
      try {
        stringResult = await supabase
          .from('Paragrafen')
          .select('*')
          .eq('chapter_id', String(numericChapterId));
      } catch (error) {
        console.error('Error executing string query:', error);
        stringResult = { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
      }
      
      const stringData = stringResult.data;
      const stringError = stringResult.error;
      
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
      
      // APPROACH 4: Fetch all paragraphs and filter manually
      console.log('Fetching all paragraphs and filtering manually...');
      
      let allParagraphsResult;
      try {
        allParagraphsResult = await supabase
          .from('Paragrafen')
          .select('*')
          .limit(100);
      } catch (error) {
        console.error('Error fetching all paragraphs:', error);
        allParagraphsResult = { data: [], error: error instanceof Error ? error : new Error('Unknown error') };
      }
          
      const allParagraphs = allParagraphsResult.data || [];
      console.log('All paragraphs sample:', allParagraphs);
      
      // Check if any paragraphs match our chapter ID manually
      const matchingParagraphs = allParagraphs.filter(p => {
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
