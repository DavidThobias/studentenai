
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
import { useState } from 'react';
import Quiz from '@/components/Quiz';
import { useQuiz } from '@/hooks/useQuiz';

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs,
    selectedChapterId: bookDetailSelectedChapterId
  } = useBookDetail(id);

  const {
    questions,
    isGenerating,
    quizError,
    generateQuiz,
    currentQuestionIndex,
    selectedAnswer,
    isAnswerSubmitted,
    score,
    isQuizComplete,
    handleAnswerSelect,
    handleSubmitAnswer,
    handleNextQuestion,
    restartQuiz
  } = useQuiz();

  const handleChapterSelect = (chapterId: number) => {
    console.log(`Selected chapter ID: ${chapterId}`);
    setSelectedChapterId(chapterId);
    fetchParagraphs(chapterId);
  };

  const handleStartQuiz = (chapterId: number, paragraphId?: number) => {
    console.log(`Starting quiz for chapter ID: ${chapterId}, paragraph ID: ${paragraphId || 'all'}`);
    
    if (book?.id) {
      setSelectedChapterId(chapterId);
      generateQuiz(book.id, chapterId);
      setQuizOpen(true);
    }
  };

  const handleStartBookQuiz = () => {
    if (book?.id && selectedChapterId) {
      generateQuiz(book.id, selectedChapterId);
      setQuizOpen(true);
    }
  };

  const handleCloseQuiz = () => {
    setQuizOpen(false);
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

        <BookOverview 
          book={book} 
          onStartQuiz={handleStartBookQuiz}
        />

        <ChaptersList 
          chapters={chapters}
          onChapterSelect={handleChapterSelect} 
          selectedChapterId={selectedChapterId}
        />

        <ParagraphsList 
          paragraphs={paragraphs} 
          loadingParagraphs={loadingParagraphs}
          onStartQuiz={handleStartQuiz}
          selectedChapterId={bookDetailSelectedChapterId}
        />

        {id && book?.id && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Quiz</h2>
            {/* Use a separate instance of SalesQuizQuestion that doesn't conflict with the chapter quizzes */}
            <SalesQuizQuestion showDebug={true} bookId={book.id} />
          </div>
        )}

        <UpcomingFeatures />
        
        {/* This Quiz is for chapter-specific quizzes, separate from SalesQuizQuestion */}
        <Quiz 
          questions={questions} 
          onClose={handleCloseQuiz} 
          open={quizOpen} 
          title={`Quiz: ${book?.book_title}`}
          error={quizError}
          isGenerating={isGenerating}
          currentQuestionIndex={currentQuestionIndex}
          selectedAnswer={selectedAnswer}
          isAnswerSubmitted={isAnswerSubmitted}
          score={score}
          isQuizComplete={isQuizComplete}
          handleAnswerSelect={handleAnswerSelect}
          handleSubmitAnswer={handleSubmitAnswer}
          handleNextQuestion={handleNextQuestion}
          restartQuiz={restartQuiz}
        />
      </div>
    </div>
  );
};

export default BookDetail;
