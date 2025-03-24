
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import BookHeader from '@/components/book/BookHeader';
import BookOverview from '@/components/book/BookOverview';
import ChaptersList from '@/components/book/ChaptersList';
import ParagraphsList from '@/components/book/ParagraphsList';
import UpcomingFeatures from '@/components/book/UpcomingFeatures';
import LoadingBookDetail from '@/components/book/LoadingBookDetail';
import { useBookDetail } from '@/hooks/useBookDetail';
import { toast } from "sonner";
import Layout from '@/components/Layout';

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs,
    selectedChapterId
  } = useBookDetail(id);

  const handleChapterSelect = (chapterId: number) => {
    console.log(`Selected chapter ID: ${chapterId}`);
    fetchParagraphs(chapterId);
  };

  const handleStartQuiz = (chapterId: number, paragraphId?: number) => {
    console.log(`Starting quiz for chapter ID: ${chapterId}${paragraphId ? `, paragraph ID: ${paragraphId}` : ''}`);
    
    if (!book?.id) {
      toast.error('Boek informatie ontbreekt');
      return;
    }
    
    // Navigate to quiz page with parameters
    const params = new URLSearchParams();
    params.append('bookId', book.id.toString());
    params.append('chapterId', chapterId.toString());
    
    if (paragraphId) {
      params.append('paragraphId', paragraphId.toString());
    }
    
    // Add structured parameter to indicate we want structured learning
    params.append('structured', 'true');
    
    navigate(`/quiz?${params.toString()}`);
  };

  // Check if this is the Sales book
  const isSalesBook = book?.book_title?.toLowerCase().includes('sales');

  if (loading) {
    return (
      <Layout>
        <div className="pt-28 pb-20 px-6">
          <LoadingBookDetail />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <BookHeader 
            title={book?.book_title} 
            author={book?.author_name || 'Onbekende auteur'} 
          />

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <BookOverview book={book} />

          <ChaptersList 
            chapters={chapters}
            onChapterSelect={handleChapterSelect} 
            selectedChapterId={selectedChapterId}
            onStartQuiz={handleStartQuiz}
          />

          {/* Only show paragraphs list if it's not the Sales book */}
          {!isSalesBook && (
            <ParagraphsList 
              paragraphs={paragraphs} 
              loadingParagraphs={loadingParagraphs}
              selectedChapterId={selectedChapterId}
              onStartQuiz={handleStartQuiz}
            />
          )}

          <UpcomingFeatures />
        </div>
      </div>
    </Layout>
  );
};

export default BookDetail;
