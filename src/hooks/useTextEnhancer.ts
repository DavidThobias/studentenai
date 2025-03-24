
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnhancedContent {
  originalContent: string;
  enhancedContent: string;
  bookTitle: string;
  chapterTitle: string;
  paragraphs: {
    id: number;
    paragraph_number: number;
    content: string;
  }[];
}

export const useTextEnhancer = () => {
  const [enhancedContent, setEnhancedContent] = useState<EnhancedContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhanceText = async (chapterId: number, paragraphId?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Enhancing text for chapter ${chapterId}${paragraphId ? ` paragraph ${paragraphId}` : ''}`);
      
      const { data, error: functionError } = await supabase.functions.invoke('enhance-readability', {
        body: { chapterId, paragraphId },
      });
      
      if (functionError) {
        console.error('Error calling enhance-readability function:', functionError);
        setError('Er is een fout opgetreden bij het verbeteren van de leesbaarheid');
        toast.error('Kan de inhoud niet verbeteren');
        return;
      }
      
      if (!data.success) {
        console.error('Function returned error:', data.error);
        setError(data.error || 'Er is een fout opgetreden');
        toast.error('Kan de inhoud niet verbeteren');
        return;
      }
      
      setEnhancedContent(data);
      return data;
    } catch (err) {
      console.error('Error enhancing text:', err);
      setError('Er is een fout opgetreden bij het verbeteren van de leesbaarheid');
      toast.error('Kan de inhoud niet verbeteren');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    enhancedContent,
    isLoading,
    error,
    enhanceText
  };
};
