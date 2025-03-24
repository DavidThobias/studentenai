
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EnhancedContent {
  originalContent: string;
  enhancedContent: string;
  bookTitle: string;
  chapterTitle: string;
  paragraphs: {
    id: number;
    paragraph_number: number;
    content: string;
  }[];
  currentParagraphId?: number;
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
      
      // Call the edge function with the chapter ID and paragraph ID
      const { data, error: functionError } = await supabase.functions.invoke('enhance-readability', {
        body: { chapterId, paragraphId },
      });
      
      if (functionError) {
        console.error('Error calling enhance-readability function:', functionError);
        setError('Er is een fout opgetreden bij het verbeteren van de leesbaarheid');
        toast.error('Kan de inhoud niet verbeteren');
        return null;
      }
      
      if (!data?.success) {
        const errorMessage = data?.error || 'Er is een fout opgetreden';
        console.error('Function returned error:', errorMessage);
        setError(errorMessage);
        toast.error('Kan de inhoud niet verbeteren');
        return null;
      }
      
      // Set the enhanced content with the current paragraph ID if applicable
      setEnhancedContent({
        ...data,
        currentParagraphId: paragraphId
      });
      
      return data;
    } catch (err) {
      console.error('Error enhancing text:', err);
      setError('Er is een fout opgetreden bij het verbeteren van de leesbaarheid');
      toast.error('Kan de inhoud niet verbeteren');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getNextParagraphId = () => {
    if (!enhancedContent?.paragraphs || !enhancedContent.currentParagraphId) return null;
    
    const currentIndex = enhancedContent.paragraphs.findIndex(
      p => p.id === enhancedContent.currentParagraphId
    );
    
    if (currentIndex === -1 || currentIndex >= enhancedContent.paragraphs.length - 1) return null;
    return enhancedContent.paragraphs[currentIndex + 1].id;
  };
  
  const getPreviousParagraphId = () => {
    if (!enhancedContent?.paragraphs || !enhancedContent.currentParagraphId) return null;
    
    const currentIndex = enhancedContent.paragraphs.findIndex(
      p => p.id === enhancedContent.currentParagraphId
    );
    
    if (currentIndex <= 0) return null;
    return enhancedContent.paragraphs[currentIndex - 1].id;
  };
  
  const getCurrentParagraphNumber = () => {
    if (!enhancedContent?.paragraphs || !enhancedContent.currentParagraphId) return null;
    
    const paragraph = enhancedContent.paragraphs.find(
      p => p.id === enhancedContent.currentParagraphId
    );
    
    return paragraph?.paragraph_number || null;
  };

  return {
    enhancedContent,
    isLoading,
    error,
    enhanceText,
    getNextParagraphId,
    getPreviousParagraphId,
    getCurrentParagraphNumber
  };
};
