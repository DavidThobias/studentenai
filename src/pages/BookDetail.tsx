
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import BookHeader from '@/components/book/BookHeader';
import BookOverview from '@/components/book/BookOverview';
import ChaptersList from '@/components/book/ChaptersList';
import ParagraphsList from '@/components/book/ParagraphsList';
import UpcomingFeatures from '@/components/book/UpcomingFeatures';
import LoadingBookDetail from '@/components/book/LoadingBookDetail';
import { useBookDetail } from '@/hooks/useBookDetail';
import SalesQuizQuestion from '@/components/SalesQuizQuestion';

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();

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

  if (loading) {
    return <LoadingBookDetail />;
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <BookHeader title={book?.book_title} author="Onbekende auteur" />

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
        />

        <ParagraphsList 
          paragraphs={paragraphs} 
          loadingParagraphs={loadingParagraphs}
          selectedChapterId={selectedChapterId}
        />

        {id && book?.id && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Quiz</h2>
            <SalesQuizQuestion showDebug={true} bookId={book.id} />
          </div>
        )}

        <UpcomingFeatures />
      </div>
    </div>
  );
};

export default BookDetail;
