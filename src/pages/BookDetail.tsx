import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Quiz from '@/components/Quiz';
import BookHeader from '@/components/book/BookHeader';
import BookOverview from '@/components/book/BookOverview';
import ChaptersList from '@/components/book/ChaptersList';
import ParagraphsList from '@/components/book/ParagraphsList';
import UpcomingFeatures from '@/components/book/UpcomingFeatures';
import LoadingBookDetail from '@/components/book/LoadingBookDetail';
import { useBookDetail } from '@/hooks/useBookDetail';

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | undefined>(undefined);

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs 
  } = useBookDetail(id);

  const handleStartQuiz = (chapterId?: number, paragraphId?: number) => {
    console.log(`Starting quiz for ${chapterId ? `chapter ${chapterId}` : 'whole book'}${paragraphId ? `, paragraph ${paragraphId}` : ''}`);
    setSelectedChapterId(chapterId?.toString());
    setSelectedParagraphId(paragraphId?.toString());
    setQuizOpen(true);
  };

  const handleChapterSelect = (chapterId: number) => {
    fetchParagraphs(chapterId);
  };

  if (loading) {
    return <LoadingBookDetail />;
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <BookHeader title={book?.Titel} author={book?.Auteur} />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <BookOverview 
          book={book} 
          onStartQuiz={() => handleStartQuiz()} 
        />

        <ChaptersList 
          chapters={chapters} 
          onStartQuiz={handleStartQuiz} 
          onChapterSelect={handleChapterSelect} 
        />

        <ParagraphsList 
          paragraphs={paragraphs} 
          loadingParagraphs={loadingParagraphs} 
          onStartQuiz={handleStartQuiz} 
        />

        <UpcomingFeatures />
      </div>

      {/* Quiz Dialog */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedParagraphId 
                ? `Quiz over paragraaf ${paragraphs.find(p => p.id.toString() === selectedParagraphId)?.["paragraaf nummer"] || ''}`
                : selectedChapterId 
                  ? `Quiz over hoofdstuk ${chapters.find(c => c.id.toString() === selectedChapterId)?.Hoofdstuknummer || ''}`
                  : `Quiz over ${book?.Titel}`}
            </DialogTitle>
            <DialogDescription>
              Test je kennis met deze interactieve quiz over het hoofdstuk.
            </DialogDescription>
          </DialogHeader>
          {quizOpen && (
            <Quiz 
              bookId={id || ''} 
              chapterId={selectedChapterId} 
              paragraphId={selectedParagraphId}
              onClose={() => setQuizOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookDetail;
