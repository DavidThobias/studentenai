
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Quiz from '@/components/Quiz';
import BookHeader from '@/components/book/BookHeader';
import BookOverview from '@/components/book/BookOverview';
import ChaptersList from '@/components/book/ChaptersList';
import ParagraphsList from '@/components/book/ParagraphsList';
import UpcomingFeatures from '@/components/book/UpcomingFeatures';
import LoadingBookDetail from '@/components/book/LoadingBookDetail';
import { useBookDetail } from '@/hooks/useBookDetail';
import { toast } from "sonner"; 
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const BookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | undefined>(undefined);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState("Quiz");

  const { 
    book, 
    chapters, 
    paragraphs, 
    loading, 
    loadingParagraphs, 
    error, 
    fetchParagraphs 
  } = useBookDetail(id);

  const handleStartQuiz = async (chapterId?: number, paragraphId?: number) => {
    console.log(`Starting quiz for ${chapterId ? `chapter ${chapterId}` : 'whole book'}${paragraphId ? `, paragraph ${paragraphId}` : ''}`);
    setSelectedChapterId(chapterId?.toString());
    setSelectedParagraphId(paragraphId?.toString());
    setQuizQuestions([]);
    setQuizError(null);
    
    if (paragraphId) {
      const paragraph = paragraphs.find(p => p.id === paragraphId);
      setQuizTitle(`Quiz over paragraaf ${paragraph?.["paragraaf nummer"] || ''}`);
    } else if (chapterId) {
      const chapter = chapters.find(c => c.id === chapterId);
      setQuizTitle(`Quiz over hoofdstuk ${chapter?.Hoofdstuknummer || ''}`);
    } else {
      setQuizTitle(`Quiz over ${book?.Titel || 'het boek'}`);
    }
    
    toast.info('Quiz wordt voorbereid...');
    
    try {
      setIsGeneratingQuiz(true);
      setQuizOpen(true); // Open the dialog immediately to show loading state
      
      console.log(`Calling generate-quiz function for book ${id}, chapter ${chapterId || 'all'}, paragraph ${paragraphId || 'all'}`);
      
      const { data: response, error: functionError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          bookId: parseInt(id || '0'),
          chapterId: chapterId || null,
          paragraphId: paragraphId || null,
          numberOfQuestions: 3,
          forceNewQuestions: true,
        },
      });
      
      console.log('Function response:', { response, functionError });
      
      if (functionError) {
        console.error('Error invoking generate-quiz function:', functionError);
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${functionError.message}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (!response.success) {
        console.error('Error from generate-quiz function:', response.error);
        setQuizError(`Er is een fout opgetreden bij het genereren van de quiz: ${response.error}`);
        toast.error('Fout bij het genereren van de quiz.');
        return;
      }
      
      if (response.questions && response.questions.length > 0) {
        console.log('Setting quiz questions:', response.questions.length, 'questions found');
        const formattedQuestions = response.questions.map((q: any) => ({
          question: q.question,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any) => String(opt))
            : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }));
        
        console.log('Formatted questions:', formattedQuestions);
        setQuizQuestions(formattedQuestions);
        toast.success('Quiz is gegenereerd!');
      } else {
        console.warn('No questions found in response:', response);
        setQuizError('Geen vragen konden worden gegenereerd. Probeer het opnieuw.');
        toast.error('Geen vragen konden worden gegenereerd.');
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      setQuizError(`Er is een onverwachte fout opgetreden: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      toast.error('Er is een fout opgetreden bij het genereren van de quiz.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleChapterSelect = (chapterId: number) => {
    fetchParagraphs(chapterId);
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

      {quizError && quizOpen && (
        <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Quiz Fout</DialogTitle>
              <DialogDescription>
                Er is een probleem opgetreden bij het genereren van de quiz.
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive" className="my-4">
              <AlertDescription>{quizError}</AlertDescription>
            </Alert>
            <div className="flex justify-end mt-4">
              <Button onClick={handleCloseQuiz}>Sluiten</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isGeneratingQuiz && quizOpen && (
        <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Quiz voorbereiden</DialogTitle>
              <DialogDescription>Even geduld terwijl we je quiz voorbereiden.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-center">Quiz wordt gegenereerd...</p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {!isGeneratingQuiz && !quizError && quizQuestions.length > 0 && (
        <Quiz 
          questions={quizQuestions}
          onClose={handleCloseQuiz}
          open={quizOpen}
          title={quizTitle}
        />
      )}
    </div>
  );
};

export default BookDetail;
