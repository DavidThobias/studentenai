
import { BookOpen, FileText, Brain, Bug } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

interface BookData {
  id: number;
  book_title?: string;
  author_name?: string;
}

interface BookOverviewProps {
  book: BookData | null;
}

interface ChapterInfo {
  count: number;
  paragraphCount: number;
}

const BookOverview = ({ book }: BookOverviewProps) => {
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);
  const [bookDetails, setBookDetails] = useState<ChapterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  const isSalesBook = book?.book_title?.toLowerCase().includes('sales');
  // Update the book cover URL to use the Supabase storage URL
  const bookCoverImage = isSalesBook 
    ? "https://ncipejuazrewiizxtkcj.supabase.co/storage/v1/object/public/afbeeldingen//shopping.webp" 
    : null;

  useEffect(() => {
    if (book?.id) {
      fetchBookDetails(book.id);
    }
  }, [book?.id]);

  const fetchBookDetails = async (bookId: number) => {
    try {
      setLoading(true);
      console.log(`BookOverview: Fetching details for book ID: ${bookId}`);
      
      if (!book?.book_title) return;
      
      // Get unique chapter numbers for this book
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('books')
        .select('chapter_number')
        .eq('book_title', book.book_title);
      
      if (chaptersError) {
        console.error('Error fetching chapters:', chaptersError);
        return;
      }
      
      // Get unique chapters by manually filtering
      const uniqueChapterNumbers = Array.from(
        new Set(chaptersData?.map(ch => ch.chapter_number) || [])
      );
      
      console.log(`BookOverview: Found ${uniqueChapterNumbers.length} chapters for book title: ${book.book_title}`);
      
      // Get paragraph count for this book
      const { count, error: paragraphsError } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('book_title', book.book_title);
      
      console.log(`BookOverview: Paragraph count query result:`, { count, error: paragraphsError });
      
      if (paragraphsError) {
        console.error('Error fetching paragraphs:', paragraphsError);
      }
      
      setBookDetails({
        count: uniqueChapterNumbers.length || 0,
        paragraphCount: count || 0
      });
      
    } catch (error) {
      console.error('Error fetching book details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToQuiz = () => {
    if (book?.id) {
      console.log(`Navigating to quiz with bookId: ${book.id}`);
      
      // Build the URL with query parameters, including structured=true
      const params = new URLSearchParams();
      params.append('bookId', book.id.toString());
      params.append('structured', 'true'); // Add structured learning parameter
      
      // Navigate to the quiz page with parameters
      navigate(`/quiz?${params.toString()}`);
    } else {
      toast.error('Boek informatie ontbreekt. Kan geen quiz genereren.');
    }
  };

  return (
    <div className="space-y-8 mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Book Cover */}
        <div className="md:col-span-1">
          {bookCoverImage ? (
            <div className="aspect-[3/4] bg-study-50 rounded-lg shadow-md overflow-hidden border border-study-100">
              <img 
                src={bookCoverImage} 
                alt={`${book?.book_title} cover`} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[3/4] bg-study-50 rounded-lg shadow-md flex items-center justify-center overflow-hidden border border-study-100">
              <BookOpen className="h-24 w-24 text-study-300" />
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Over dit boek</h2>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Titel</TableCell>
                  <TableCell>{book?.book_title || 'Onbekende titel'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Auteur</TableCell>
                  <TableCell>{book?.author_name || 'Onbekende auteur'}</TableCell>
                </TableRow>
                {bookDetails && (
                  <>
                    <TableRow>
                      <TableCell className="font-medium">Hoofdstukken</TableCell>
                      <TableCell>{bookDetails.count}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Paragrafen</TableCell>
                      <TableCell>{bookDetails.paragraphCount}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
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
                onClick={handleNavigateToQuiz} 
                className="flex-1 bg-study-600 hover:bg-study-700 text-white"
              >
                <Brain className="mr-2 h-5 w-5" />
                Genereer quiz met vragen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookOverview;
