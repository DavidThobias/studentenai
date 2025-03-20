
import { BookOpen, FileText, Brain, Bug } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from 'react';
import SalesQuizQuestion from '@/components/SalesQuizQuestion';
import { supabase } from "@/integrations/supabase/client";

interface BookData {
  id: number;
  Titel?: string;
  Auteur?: string;
}

interface BookOverviewProps {
  book: BookData | null;
}

interface ChapterInfo {
  count: number;
  paragraphCount: number;
}

const BookOverview = ({ book }: BookOverviewProps) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [bookDetails, setBookDetails] = useState<ChapterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  const isSalesBook = book?.Titel?.toLowerCase().includes('sales');

  useEffect(() => {
    if (book?.id) {
      fetchBookDetails(book.id);
    }
  }, [book?.id]);

  const fetchBookDetails = async (bookId: number) => {
    try {
      setLoading(true);
      
      // Get chapter count
      const { data: chapters, error: chaptersError } = await supabase
        .from('Chapters')
        .select('id')
        .eq('Boek_id', bookId);
      
      if (chaptersError) {
        console.error('Error fetching chapters:', chaptersError);
        return;
      }
      
      // Get paragraph count for this book
      const chapterIds = chapters?.map(c => c.id) || [];
      let paragraphCount = 0;
      
      if (chapterIds.length > 0) {
        const { count, error: paragraphsError } = await supabase
          .from('Paragraven')
          .select('id', { count: 'exact', head: true })
          .in('chapter_id', chapterIds);
        
        if (paragraphsError) {
          console.error('Error fetching paragraphs:', paragraphsError);
        } else {
          paragraphCount = count || 0;
        }
      }
      
      setBookDetails({
        count: chapters?.length || 0,
        paragraphCount
      });
      
    } catch (error) {
      console.error('Error fetching book details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Book Cover */}
        <div className="md:col-span-1">
          <div className="aspect-[3/4] bg-study-50 rounded-lg shadow-md flex items-center justify-center overflow-hidden border border-study-100">
            <BookOpen className="h-24 w-24 text-study-300" />
          </div>
        </div>

        {/* Book Info */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Over dit boek</h2>
            <p className="text-muted-foreground mb-2">
              Dit is een samenvatting van het boek "{book?.Titel}" door {book?.Auteur}.
            </p>
            {bookDetails && (
              <div className="text-sm text-muted-foreground">
                <p>Bevat {bookDetails.count} hoofdstukken en {bookDetails.paragraphCount} paragrafen.</p>
                <p className="mt-1">Boek ID: {book?.id}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => toast.info('Functionaliteit wordt binnenkort toegevoegd')} 
              className="flex-1"
            >
              <FileText className="mr-2 h-5 w-5" />
              Bekijk samenvatting
            </Button>
            
            {isSalesBook && (
              <Button 
                size="lg" 
                onClick={() => setShowQuiz(!showQuiz)} 
                className="flex-1 bg-study-600 hover:bg-study-700 text-white"
              >
                <Brain className="mr-2 h-5 w-5" />
                {showQuiz ? 'Verberg quiz' : 'Genereer quiz vraag'}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Quiz Section */}
      {showQuiz && isSalesBook && (
        <div className="mt-8">
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs"
            >
              <Bug className="mr-1 h-3 w-3" />
              {showDebug ? 'Verberg debug' : 'Debug info'}
            </Button>
          </div>
          <SalesQuizQuestion showDebug={showDebug} bookId={book?.id} />
        </div>
      )}
    </div>
  );
};

export default BookOverview;
